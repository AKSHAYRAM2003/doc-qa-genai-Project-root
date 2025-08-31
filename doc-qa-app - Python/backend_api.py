#!/usr/bin/env python3
"""FastAPI backend for DocSpotlight bridging PDF ingestion, embeddings, and chat."""
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import tempfile
import os
import pypdf
import google.auth
from google.cloud import aiplatform
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
import faiss, numpy as np
from typing import List, Dict, Optional
from dotenv import load_dotenv
from pathlib import Path
import hashlib
import re
import json
from datetime import datetime

# Phase 1: Authentication imports
from auth_routes import router as auth_router
from auth import get_current_active_user, get_current_user
from models import User
from database import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession

load_dotenv()

# Phase 4: Advanced Features & Performance Optimization
import asyncio
import time
from collections import defaultdict
from functools import lru_cache
import logging

# Performance monitoring
PERFORMANCE_METRICS = {
    "request_count": defaultdict(int),
    "response_times": defaultdict(list),
    "error_count": defaultdict(int),
    "cache_hits": defaultdict(int)
}

# Multi-document support
DOCUMENT_COLLECTIONS: Dict[str, List[str]] = {}  # collection_id -> [doc_ids]
CROSS_DOC_INDEX: Dict[str, faiss.Index] = {}  # Combined indexes for collections

# Citation tracking for precise source attribution
CHUNK_METADATA: Dict[str, List[Dict]] = {}  # doc_id -> chunk metadata (page, position, etc.)

# Performance caching
RESPONSE_CACHE: Dict[str, Dict] = {}  # question_hash -> cached response
CACHE_TTL = 3600  # 1 hour cache TTL

# Storage directory for persistence
STORAGE_DIR = Path("storage")
STORAGE_DIR.mkdir(exist_ok=True)

class DocumentPersistence:
    """Handles persistence of document metadata and indexes across server restarts."""
    
    @staticmethod
    def save_document_data():
        """Save document metadata and file mappings to disk."""
        try:
            metadata_file = STORAGE_DIR / "doc_metadata.json"
            files_file = STORAGE_DIR / "doc_files.json"
            
            with open(metadata_file, 'w') as f:
                json.dump(DOC_METADATA, f)
            
            with open(files_file, 'w') as f:
                json.dump(DOC_FILES, f)
                
            print(f"[Persistence] Saved metadata for {len(DOC_METADATA)} documents")
        except Exception as e:
            print(f"[Persistence] Failed to save: {e}")
    
    @staticmethod
    def load_document_data():
        """Load document metadata and rebuild indexes from persisted files."""
        try:
            metadata_file = STORAGE_DIR / "doc_metadata.json"
            files_file = STORAGE_DIR / "doc_files.json"
            
            if metadata_file.exists() and files_file.exists():
                with open(metadata_file, 'r') as f:
                    DOC_METADATA.update(json.load(f))
                
                with open(files_file, 'r') as f:
                    DOC_FILES.update(json.load(f))
                
                # Rebuild indexes for existing files
                DocumentPersistence.rebuild_indexes()
                
                print(f"[Persistence] Loaded {len(DOC_METADATA)} documents from storage")
            else:
                print("[Persistence] No existing data found")
        except Exception as e:
            print(f"[Persistence] Failed to load: {e}")
    
    @staticmethod
    def rebuild_indexes():
        """Rebuild FAISS indexes and text chunks from saved PDF files."""
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        
        for doc_id, file_path in DOC_FILES.items():
            try:
                if not os.path.exists(file_path):
                    print(f"[Persistence] File not found: {file_path}")
                    continue
                
                # Re-extract text and rebuild index
                reader = pypdf.PdfReader(file_path)
                pages = []
                for p in reader.pages:
                    try:
                        pages.append(p.extract_text() or '')
                    except Exception:
                        pages.append('')
                
                full_text = '\n'.join(pages)
                chunks = [c for c in splitter.split_text(full_text) if c.strip()]
                
                # Rebuild index if we have project_id
                if project_id and chunks:
                    index = build_index(chunks, project_id)
                    DOC_TEXT[doc_id] = chunks
                    DOC_INDEX[doc_id] = index
                    
                    # Rebuild citation metadata
                    CitationTracker.add_chunk_metadata(doc_id, chunks, file_path)
                    
                print(f"[Persistence] Rebuilt index for {doc_id}")
                    
            except Exception as e:
                print(f"[Persistence] Failed to rebuild {doc_id}: {e}")

# Phase 3: Smart Routing Logic and Advanced Features
CONVERSATION_MEMORY: Dict[str, List[Dict]] = {}  # Store conversation history per session
HYBRID_RESPONSE_TRIGGERS = [
    "explain more", "tell me more", "elaborate", "expand on", "give me details",
    "what else", "additional information", "more context", "deeper analysis"
]

class ConversationManager:
    """Manages conversation history and context for enhanced responses."""
    
    @staticmethod
    def add_to_history(session_id: str, question: str, response: dict, classification: dict):
        """Add a conversation turn to history."""
        if session_id not in CONVERSATION_MEMORY:
            CONVERSATION_MEMORY[session_id] = []
        
        turn = {
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "response_type": response.get("response_type"),
            "classification": classification,
            "response_preview": response.get("answer", "")[:100] + "..." if len(response.get("answer", "")) > 100 else response.get("answer", "")
        }
        
        CONVERSATION_MEMORY[session_id].append(turn)
        
        # Keep only last 10 turns to manage memory
        if len(CONVERSATION_MEMORY[session_id]) > 10:
            CONVERSATION_MEMORY[session_id] = CONVERSATION_MEMORY[session_id][-10:]
    
    @staticmethod
    def get_recent_context(session_id: str, turns: int = 3) -> str:
        """Get recent conversation context for enhanced responses."""
        if session_id not in CONVERSATION_MEMORY:
            return ""
        
        recent_turns = CONVERSATION_MEMORY[session_id][-turns:]
        context_parts = []
        
        for turn in recent_turns:
            context_parts.append(f"Q: {turn['question']} (Type: {turn['response_type']})")
        
        return "\n".join(context_parts) if context_parts else ""
    
    @staticmethod
    def detect_follow_up(question: str, session_id: str) -> dict:
        """Detect if question is a follow-up to previous conversation."""
        if session_id not in CONVERSATION_MEMORY or not CONVERSATION_MEMORY[session_id]:
            return {"is_follow_up": False}
        
        last_turn = CONVERSATION_MEMORY[session_id][-1]
        question_lower = question.lower().strip()
        
        # Check for follow-up indicators
        follow_up_patterns = [
            r'^(and|also|what about|how about)', r'(more|else|other)', 
            r'(elaborate|expand|explain)', r'(what else|anything else)',
            r'^(that|this|it)', r'(further|additional)'
        ]
        
        is_follow_up = any(re.search(pattern, question_lower) for pattern in follow_up_patterns)
        
        if is_follow_up:
            return {
                "is_follow_up": True,
                "previous_type": last_turn["response_type"],
                "previous_question": last_turn["question"],
                "context_turns": len(CONVERSATION_MEMORY[session_id])
            }
        
        return {"is_follow_up": False}

# Phase 4: Advanced Features Classes

class PerformanceMonitor:
    """Phase 4: Performance monitoring and analytics."""
    
    @staticmethod
    def start_request_timer(endpoint: str) -> float:
        """Start timing a request."""
        PERFORMANCE_METRICS["request_count"][endpoint] += 1
        return time.time()
    
    @staticmethod
    def end_request_timer(endpoint: str, start_time: float):
        """End timing a request and record metrics."""
        duration = time.time() - start_time
        PERFORMANCE_METRICS["response_times"][endpoint].append(duration)
        
        # Keep only last 100 response times per endpoint
        if len(PERFORMANCE_METRICS["response_times"][endpoint]) > 100:
            PERFORMANCE_METRICS["response_times"][endpoint] = PERFORMANCE_METRICS["response_times"][endpoint][-100:]
    
    @staticmethod
    def record_error(endpoint: str, error_type: str):
        """Record an error occurrence."""
        PERFORMANCE_METRICS["error_count"][f"{endpoint}_{error_type}"] += 1
    
    @staticmethod
    def record_cache_hit(cache_type: str):
        """Record a cache hit."""
        PERFORMANCE_METRICS["cache_hits"][cache_type] += 1
    
    @staticmethod
    def get_performance_summary() -> dict:
        """Get performance metrics summary."""
        summary = {}
        for endpoint, times in PERFORMANCE_METRICS["response_times"].items():
            if times:
                summary[endpoint] = {
                    "avg_response_time": sum(times) / len(times),
                    "min_response_time": min(times),
                    "max_response_time": max(times),
                    "request_count": PERFORMANCE_METRICS["request_count"][endpoint]
                }
        return summary

class ResponseCache:
    """Phase 4: Intelligent response caching for performance optimization."""
    
    @staticmethod
    def _generate_cache_key(question: str, doc_id: str, classification: dict) -> str:
        """Generate a cache key for a question-document combination."""
        key_data = f"{question.lower().strip()}_{doc_id}_{classification.get('category', '')}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    @staticmethod
    def get_cached_response(question: str, doc_id: str, classification: dict) -> dict:
        """Retrieve cached response if available and not expired."""
        cache_key = ResponseCache._generate_cache_key(question, doc_id, classification)
        
        if cache_key in RESPONSE_CACHE:
            cached_data = RESPONSE_CACHE[cache_key]
            cache_time = cached_data.get("timestamp", 0)
            
            # Check if cache is still valid
            if time.time() - cache_time < CACHE_TTL:
                PerformanceMonitor.record_cache_hit("response_cache")
                return cached_data.get("response", {})
            else:
                # Remove expired cache entry
                del RESPONSE_CACHE[cache_key]
        
        return {}
    
    @staticmethod
    def cache_response(question: str, doc_id: str, classification: dict, response: dict):
        """Cache a response for future use."""
        cache_key = ResponseCache._generate_cache_key(question, doc_id, classification)
        
        RESPONSE_CACHE[cache_key] = {
            "response": response.copy(),
            "timestamp": time.time()
        }
        
        # Prevent cache from growing too large
        if len(RESPONSE_CACHE) > 1000:
            # Remove oldest 200 entries
            sorted_cache = sorted(RESPONSE_CACHE.items(), key=lambda x: x[1]["timestamp"])
            for old_key, _ in sorted_cache[:200]:
                del RESPONSE_CACHE[old_key]

class CitationTracker:
    """Phase 4: Enhanced citation tracking with precise source attribution."""
    
    @staticmethod
    def add_chunk_metadata(doc_id: str, chunks: List[str], pdf_path: str):
        """Add detailed metadata for each chunk including page numbers."""
        if doc_id not in CHUNK_METADATA:
            CHUNK_METADATA[doc_id] = []
        
        try:
            reader = pypdf.PdfReader(pdf_path)
            current_page = 1
            page_text = ""
            page_char_count = 0
            
            if current_page <= len(reader.pages):
                page_text = reader.pages[current_page - 1].extract_text()
                page_char_count = len(page_text)
            
            for i, chunk in enumerate(chunks):
                # Find which page this chunk belongs to
                chunk_page = current_page
                chunk_position = "middle"
                
                # Simple heuristic: if chunk is at start of text, it's likely top of page
                if i < len(chunks) * 0.1:
                    chunk_position = "top"
                elif i > len(chunks) * 0.9:
                    chunk_position = "bottom"
                
                # Try to find the chunk text in the page
                if chunk[:100] in page_text:
                    chunk_page = current_page
                else:
                    # Move to next page if we can't find chunk in current page
                    if current_page < len(reader.pages):
                        current_page += 1
                        if current_page <= len(reader.pages):
                            page_text = reader.pages[current_page - 1].extract_text()
                            chunk_page = current_page
                
                metadata = {
                    "chunk_id": i,
                    "page_number": chunk_page,
                    "position": chunk_position,
                    "chunk_length": len(chunk),
                    "preview": chunk[:150] + "..." if len(chunk) > 150 else chunk
                }
                
                CHUNK_METADATA[doc_id].append(metadata)
                
        except Exception as e:
            print(f"[CitationTracker] Error processing metadata for {doc_id}: {e}")
            # Fallback to basic metadata
            for i, chunk in enumerate(chunks):
                metadata = {
                    "chunk_id": i,
                    "page_number": max(1, i // 3 + 1),  # Rough estimate
                    "position": "middle",
                    "chunk_length": len(chunk),
                    "preview": chunk[:150] + "..." if len(chunk) > 150 else chunk
                }
                CHUNK_METADATA[doc_id].append(metadata)
    
    @staticmethod
    def get_enhanced_citations(doc_id: str, retrieved_chunks: List[str]) -> List[dict]:
        """Get enhanced citation information for retrieved chunks."""
        if doc_id not in CHUNK_METADATA:
            return []
        
        citations = []
        metadata_list = CHUNK_METADATA[doc_id]
        
        for chunk in retrieved_chunks:
            # Find matching metadata for this chunk
            for metadata in metadata_list:
                if chunk.startswith(metadata["preview"][:50]):
                    citations.append({
                        "text": chunk,
                        "page": metadata["page_number"],
                        "position": metadata["position"],
                        "chunk_id": metadata["chunk_id"],
                        "relevance_score": 0.95  # Could be enhanced with actual similarity scores
                    })
                    break
            else:
                # Fallback if no metadata match found
                citations.append({
                    "text": chunk,
                    "page": 1,
                    "position": "unknown",
                    "chunk_id": -1,
                    "relevance_score": 0.8
                })
        
        return citations

class MultiDocumentManager:
    """Phase 4: Multi-document support for cross-document conversations."""
    
    @staticmethod
    def create_document_collection(collection_name: str, doc_ids: List[str]) -> str:
        """Create a collection of documents for cross-document querying."""
        collection_id = hashlib.md5(f"{collection_name}_{'-'.join(doc_ids)}".encode()).hexdigest()[:12]
        DOCUMENT_COLLECTIONS[collection_id] = doc_ids
        
        # Build combined index for the collection
        MultiDocumentManager._build_collection_index(collection_id, doc_ids)
        
        return collection_id
    
    @staticmethod
    def _build_collection_index(collection_id: str, doc_ids: List[str]):
        """Build a combined FAISS index for a document collection."""
        all_vectors = []
        vector_to_doc_map = []  # Track which document each vector belongs to
        
        for doc_id in doc_ids:
            if doc_id in DOC_INDEX:
                doc_index = DOC_INDEX[doc_id]
                doc_vectors = doc_index.reconstruct_n(0, doc_index.ntotal)
                all_vectors.extend(doc_vectors)
                vector_to_doc_map.extend([doc_id] * doc_index.ntotal)
        
        if all_vectors:
            combined_vectors = np.array(all_vectors, dtype='float32')
            combined_index = faiss.IndexFlatL2(combined_vectors.shape[1])
            combined_index.add(combined_vectors)
            CROSS_DOC_INDEX[collection_id] = combined_index
            
            # Store the mapping for retrieval
            CROSS_DOC_INDEX[f"{collection_id}_map"] = vector_to_doc_map
    
    @staticmethod
    def search_across_documents(collection_id: str, query_vector: np.ndarray, k: int = 5) -> List[dict]:
        """Search across multiple documents in a collection."""
        if collection_id not in CROSS_DOC_INDEX:
            return []
        
        index = CROSS_DOC_INDEX[collection_id]
        vector_map = CROSS_DOC_INDEX.get(f"{collection_id}_map", [])
        
        distances, indices = index.search(query_vector.reshape(1, -1), k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(vector_map):
                doc_id = vector_map[idx]
                # Get the actual chunk text
                doc_chunks = DOC_TEXT.get(doc_id, [])
                if idx < len(doc_chunks):
                    results.append({
                        "doc_id": doc_id,
                        "chunk": doc_chunks[idx],
                        "distance": distances[0][i],
                        "chunk_index": idx
                    })
        
        return results

class AdvancedRouter:
    """Phase 3: Advanced routing logic with hybrid responses and confidence analysis."""
    
    def __init__(self, llm=None):
        self.llm = llm
    
    def should_use_hybrid_response(self, classification: dict, question: str, follow_up_info: dict) -> dict:
        """Determine if a hybrid response combining multiple handlers is needed."""
        confidence = classification.get("confidence", 0)
        category = classification.get("category", "")
        question_lower = question.lower()
        
        # High confidence single responses
        if confidence >= CONFIDENCE_THRESHOLDS["HIGH"]:
            return {"use_hybrid": False, "primary_handler": category, "reason": "High confidence single classification"}
        
        # Follow-up questions might need hybrid responses
        if follow_up_info.get("is_follow_up"):
            prev_type = follow_up_info.get("previous_type", "")
            if category != prev_type.upper().replace("_", "_"):
                return {
                    "use_hybrid": True, 
                    "handlers": [category, prev_type.upper()],
                    "reason": "Follow-up question spanning multiple contexts"
                }
        
        # Medium confidence - check for hybrid triggers
        if CONFIDENCE_THRESHOLDS["LOW"] <= confidence < CONFIDENCE_THRESHOLDS["HIGH"]:
            # Questions that might benefit from both document and general knowledge
            if category == "PDF_CONTENT" and any(trigger in question_lower for trigger in ["explain", "what is", "define", "how does"]):
                return {
                    "use_hybrid": True,
                    "handlers": ["PDF_CONTENT", "GENERAL"],
                    "reason": "Content question that might benefit from general knowledge"
                }
            
            # Meta questions that might need content context
            if category == "PDF_META" and any(trigger in question_lower for trigger in ["about", "topic", "discusses", "covers"]):
                return {
                    "use_hybrid": True,
                    "handlers": ["PDF_META", "PDF_CONTENT"],
                    "reason": "Meta question that might need content analysis"
                }
        
        return {"use_hybrid": False, "primary_handler": category, "reason": "Standard single handler routing"}
    
    def generate_hybrid_response(self, handlers: List[str], question: str, doc_id: str, 
                                system_ctx: dict, doc_ctx: dict, response_handlers) -> dict:
        """Generate a hybrid response combining multiple handler outputs."""
        responses = []
        
        for handler_type in handlers:
            try:
                if handler_type == "PDF_CONTENT":
                    resp = response_handlers.handle_pdf_content(question, doc_id, system_ctx, doc_ctx)
                elif handler_type == "PDF_META":
                    resp = response_handlers.handle_pdf_meta(question, system_ctx, doc_ctx)
                elif handler_type == "GENERAL":
                    resp = response_handlers.handle_general(question, system_ctx)
                elif handler_type == "PERSONAL":
                    resp = response_handlers.handle_personal(question, system_ctx)
                else:
                    continue
                
                responses.append({
                    "type": handler_type,
                    "answer": resp.get("answer", ""),
                    "sources": resp.get("sources", [])
                })
            except Exception as e:
                print(f"[HybridRouter] Handler {handler_type} failed: {e}")
                continue
        
        if not responses:
            return {"answer": "I encountered an error generating a hybrid response.", "response_type": "hybrid_error"}
        
        # Synthesize responses using LLM
        return self._synthesize_hybrid_responses(responses, question, system_ctx, doc_ctx)
    
    def _synthesize_hybrid_responses(self, responses: List[dict], question: str, 
                                   system_ctx: dict, doc_ctx: dict) -> dict:
        """Use LLM to synthesize multiple responses into a coherent answer."""
        if not self.llm:
            # Fallback: concatenate responses
            combined_answer = []
            all_sources = []
            
            for resp in responses:
                if resp["answer"]:
                    combined_answer.append(f"**{resp['type'].replace('_', ' ').title()}**: {resp['answer']}")
                all_sources.extend(resp.get("sources", []))
            
            return {
                "answer": "\n\n".join(combined_answer),
                "response_type": "hybrid_fallback",
                "sources": all_sources,
                "handlers_used": [r["type"] for r in responses]
            }
        
        # LLM synthesis
        response_content = "\n\n".join([
            f"**{resp['type'].replace('_', ' ').title()} Response**: {resp['answer']}"
            for resp in responses if resp["answer"]
        ])
        
        synthesis_prompt = (
            f"You are {system_ctx['system_name']}, synthesizing multiple response perspectives into one coherent answer. "
            f"The user asked: '{question}' about document '{doc_ctx.get('filename', 'uploaded document')}'. "
            "I have responses from different analysis approaches. Combine them into a natural, helpful answer. "
            "Avoid redundancy, maintain accuracy, and create a flowing response.\n\n"
            f"Multiple perspectives:\n{response_content}\n\n"
            "Synthesized answer:"
        )
        
        try:
            resp = self.llm.invoke(synthesis_prompt)
            synthesized_answer = getattr(resp, 'content', str(resp))
            
            all_sources = []
            for response in responses:
                all_sources.extend(response.get("sources", []))
            
            return {
                "answer": synthesized_answer,
                "response_type": "hybrid_synthesized",
                "sources": all_sources,
                "handlers_used": [r["type"] for r in responses],
                "synthesis_quality": "llm_generated"
            }
        except Exception as e:
            print(f"[HybridRouter] LLM synthesis failed: {e}")
            # Fallback to concatenation
            return self._synthesize_hybrid_responses(responses, question, system_ctx, doc_ctx)

# Phase 2: Question Classification System
CLASSIFICATION_CATEGORIES = {
    "PDF_CONTENT": "Questions about specific content, topics, or information within the uploaded PDF document",
    "PDF_META": "Questions about the PDF document itself - filename, pages, size, upload info, document properties", 
    "GENERAL": "General knowledge questions not related to the uploaded PDF - science, history, current events, explanations",
    "PERSONAL": "Questions about the AI assistant - identity, capabilities, how it works, what it can do",
    "CONVERSATIONAL": "Casual conversation, greetings, thanks, small talk, social interactions"
}

CONFIDENCE_THRESHOLDS = {
    "HIGH": 0.8,    # Use primary classification with confidence
    "MEDIUM": 0.6,  # Consider hybrid approach or secondary classification  
    "LOW": 0.4      # Use fallback classification or default handling
}

class QuestionClassifier:
    """Intelligent LLM-based question classification system."""
    
    def __init__(self, llm=None):
        self.llm = llm
        
    def classify_question(self, question: str, doc_context: dict = None) -> dict:
        """
        Classify question into categories with confidence scores.
        Returns: {"category": "PDF_CONTENT", "confidence": 0.9, "reasoning": "..."}
        """
        if not self.llm:
            # Fallback to rule-based classification
            return self._fallback_classify(question)
            
        # Prepare document context for classification
        doc_info = ""
        if doc_context and doc_context.get('filename'):
            doc_info = f"Current document: {doc_context['filename']} ({doc_context.get('pages_count', 0)} pages)"
        
        classification_prompt = f"""You are an expert question classifier for a PDF document Q&A system. 

CLASSIFICATION CATEGORIES:
{self._format_categories()}

TASK: Classify the user's question into ONE category and provide a confidence score (0.0-1.0).

CONTEXT:
- System: DocSpotlight (PDF document analysis assistant)
- {doc_info if doc_info else "No document currently uploaded"}
- Current date: {datetime.now().strftime('%B %d, %Y')}

QUESTION: "{question}"

Respond in this exact JSON format:
{{
    "category": "CATEGORY_NAME",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why this category was chosen"
}}

Examples:
- "What does the document say about climate change?" → {{"category": "PDF_CONTENT", "confidence": 0.95, "reasoning": "Asking about specific content within the document"}}
- "What's today's date?" → {{"category": "GENERAL", "confidence": 0.9, "reasoning": "General knowledge question about current date"}}
- "What's the name of this PDF?" → {{"category": "PDF_META", "confidence": 0.95, "reasoning": "Asking about document metadata/properties"}}
- "Who are you?" → {{"category": "PERSONAL", "confidence": 0.9, "reasoning": "Asking about the AI assistant's identity"}}
- "Hello there!" → {{"category": "CONVERSATIONAL", "confidence": 0.85, "reasoning": "Casual greeting/small talk"}}

Classification:"""

        try:
            response = self.llm.invoke(classification_prompt)
            content = getattr(response, 'content', str(response))
            
            # Extract JSON from response
            import json
            # Find JSON in the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                result = json.loads(json_str)
                
                # Validate result
                if (result.get('category') in CLASSIFICATION_CATEGORIES and 
                    isinstance(result.get('confidence'), (int, float)) and
                    0 <= result.get('confidence') <= 1):
                    return result
            
            # If parsing fails, fallback
            print(f"[Classifier] Failed to parse LLM response: {content}")
            return self._fallback_classify(question)
            
        except Exception as e:
            print(f"[Classifier] LLM classification failed: {e}")
            return self._fallback_classify(question)
    
    def _format_categories(self) -> str:
        """Format categories for prompt."""
        formatted = []
        for cat, desc in CLASSIFICATION_CATEGORIES.items():
            formatted.append(f"- {cat}: {desc}")
        return "\n".join(formatted)
    
    def _fallback_classify(self, question: str) -> dict:
        """Rule-based fallback classification when LLM unavailable."""
        ql = question.lower().strip()
        
        # Conversational patterns  
        conversational_patterns = [
            r'^hi$', r'^hi[.! ]', r'^hello', r'^hey', r'^thanks', r'^thank you',
            r'^good (morning|afternoon|evening)', r"what's up", r'^sup$'
        ]
        
        # Personal/system patterns
        personal_patterns = [
            r'^who are you', r'^what are you', r'^what can you do', 
            r'^tell me about yourself', r'^what are your capabilities'
        ]
        
        # Meta document patterns  
        meta_patterns = [
            r'pdf name', r'document name', r'file name', r'how many pages',
            r'pages count', r'document info', r'pdf info', r'upload'
        ]
        
        # General knowledge patterns
        general_patterns = [
            r"what's today", r"what is today", r"current date", r"today's date",
            r"what time", r"current time", r"explain", r"define", r"how does",
            r"what is.*\?$", r"why.*\?$", r"how.*\?$"
        ]
        
        # Check patterns
        for pattern in conversational_patterns:
            if re.search(pattern, ql):
                return {"category": "CONVERSATIONAL", "confidence": 0.8, "reasoning": "Matched conversational patterns"}
        
        for pattern in personal_patterns:
            if re.search(pattern, ql):
                return {"category": "PERSONAL", "confidence": 0.8, "reasoning": "Matched personal/system inquiry patterns"}
        
        for pattern in meta_patterns:
            if re.search(pattern, ql):
                return {"category": "PDF_META", "confidence": 0.7, "reasoning": "Matched document metadata patterns"}
        
        for pattern in general_patterns:
            if re.search(pattern, ql):
                return {"category": "GENERAL", "confidence": 0.6, "reasoning": "Matched general knowledge patterns"}
        
        # Default to PDF content if no patterns match and question seems substantive
        if len(ql) > 10 and '?' in question:
            return {"category": "PDF_CONTENT", "confidence": 0.5, "reasoning": "Default classification for substantial questions"}
        
        return {"category": "CONVERSATIONAL", "confidence": 0.3, "reasoning": "Default fallback classification"}

LOCATION = "us-central1"
EMBED_MODEL = "text-embedding-004"
LLM_MODEL = "gemini-1.5-flash"

app = FastAPI(title="DocSpotlight API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 1: Include authentication routes
app.include_router(auth_router)

@app.on_event("startup")
async def startup_event():
    """Load persisted document data on startup."""
    print("[Startup] Loading persisted document data...")
    DocumentPersistence.load_document_data()

class ChatRequest(BaseModel):
    question: str
    doc_id: str = None  # Optional for multi-document queries
    session_id: str = "default"  # Phase 3: Session tracking for conversation memory
    collection_id: str = None  # Phase 4: Multi-document collection support
    enable_cache: bool = True  # Phase 4: Performance optimization
    max_sources: int = 5  # Phase 4: Configurable source count

# In-memory stores (can later persist)
DOC_TEXT: Dict[str, List[str]] = {}
DOC_INDEX: Dict[str, faiss.Index] = {}
DOC_METADATA: Dict[str, Dict] = {}  # Store PDF metadata
DOC_FILES: Dict[str, str] = {}  # Store PDF file paths: doc_id -> file_path

class ContextManager:
    """Manages system and document context for enhanced responses."""
    
    @staticmethod
    def get_system_context() -> dict:
        """Get current system context including date, capabilities."""
        return {
            "current_date": datetime.now().strftime("%B %d, %Y"),
            "current_time": datetime.now().strftime("%I:%M %p"),
            "system_name": "DocSpotlight",
            "capabilities": [
                "PDF document analysis and Q&A",
                "General knowledge assistance", 
                "Document metadata queries",
                "Conversational AI assistance"
            ],
            "version": "1.0.0"
        }
    
    @staticmethod
    def get_document_context(doc_id: str) -> dict:
        """Get document-specific context and metadata."""
        if doc_id not in DOC_METADATA:
            return {}
        
        metadata = DOC_METADATA[doc_id]
        chunks_count = len(DOC_TEXT.get(doc_id, []))
        
        return {
            "document_id": doc_id,
            "filename": metadata.get("filename", "Unknown"),
            "pages_count": metadata.get("pages_count", 0),
            "chunks_count": chunks_count,
            "upload_time": metadata.get("upload_time", "Unknown"),
            "file_size_kb": metadata.get("file_size_kb", 0)
        }

# Init Vertex
try:
    credentials, project_id = google.auth.default()
    aiplatform.init(project=project_id, location=LOCATION, credentials=credentials)
except Exception as e:
    print("Vertex init failed:", e)
    project_id = None

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, length_function=len)

@app.get('/health')
async def health():
    return { 'status': 'ok', 'docs_loaded': len(DOC_TEXT) }

# Phase 4: New Advanced Feature Endpoints

@app.get('/performance')
async def get_performance_metrics():
    """Get system performance metrics and analytics."""
    return {
        'status': 'ok',
        'metrics': PerformanceMonitor.get_performance_summary(),
        'cache_stats': {
            'response_cache_size': len(RESPONSE_CACHE),
            'cache_hits': PERFORMANCE_METRICS['cache_hits']
        },
        'system_stats': {
            'documents_loaded': len(DOC_TEXT),
            'collections_created': len(DOCUMENT_COLLECTIONS),
            'active_sessions': len(CONVERSATION_MEMORY)
        }
    }

@app.post('/collections/create')
async def create_collection(collection_data: dict):
    """Create a document collection for multi-document queries."""
    collection_name = collection_data.get('name', 'untitled_collection')
    doc_ids = collection_data.get('doc_ids', [])
    
    if not doc_ids:
        raise HTTPException(status_code=400, detail='No document IDs provided')
    
    # Validate that all doc_ids exist
    missing_docs = [doc_id for doc_id in doc_ids if doc_id not in DOC_TEXT]
    if missing_docs:
        raise HTTPException(status_code=404, detail=f'Documents not found: {missing_docs}')
    
    collection_id = MultiDocumentManager.create_document_collection(collection_name, doc_ids)
    
    return {
        'collection_id': collection_id,
        'name': collection_name,
        'documents': len(doc_ids),
        'doc_ids': doc_ids
    }

@app.get('/collections/{collection_id}')
async def get_collection_info(collection_id: str):
    """Get information about a document collection."""
    if collection_id not in DOCUMENT_COLLECTIONS:
        raise HTTPException(status_code=404, detail='Collection not found')
    
    doc_ids = DOCUMENT_COLLECTIONS[collection_id]
    documents = []
    
    for doc_id in doc_ids:
        if doc_id in DOC_METADATA:
            documents.append({
                'doc_id': doc_id,
                'filename': DOC_METADATA[doc_id].get('filename'),
                'pages': DOC_METADATA[doc_id].get('pages_count'),
                'chunks': len(DOC_TEXT.get(doc_id, []))
            })
    
    return {
        'collection_id': collection_id,
        'documents': documents,
        'total_documents': len(documents)
    }

@app.get('/documents')
async def list_documents():
    """List all uploaded documents with metadata."""
    documents = []
    
    for doc_id, metadata in DOC_METADATA.items():
        documents.append({
            'doc_id': doc_id,
            'filename': metadata.get('filename'),
            'pages': metadata.get('pages_count'),
            'upload_time': metadata.get('upload_time'),
            'file_size_kb': metadata.get('file_size_kb'),
            'chunks': len(DOC_TEXT.get(doc_id, []))
        })
    
    return {
        'documents': documents,
        'total_count': len(documents)
    }

@app.post('/cache/clear')
async def clear_cache():
    """Clear response cache for performance testing."""
    global RESPONSE_CACHE
    cache_size = len(RESPONSE_CACHE)
    RESPONSE_CACHE.clear()
    
    return {
        'status': 'cache_cleared',
        'entries_removed': cache_size
    }

# Phase 4: Function definitions and constants
USE_FAKE = os.environ.get('USE_FAKE_EMBED', '0') == '1'

# Fallback embedding provider (deterministic hash-based) when Vertex AI not desired.
class FallbackEmbedder:
    def __init__(self, dim: int = 384):
        self.dim = dim
    def _vec(self, text: str):
        h = hashlib.sha256(text.encode('utf-8')).digest()
        # repeat hash to fill dim
        b = (h * ((self.dim // len(h)) + 1))[:self.dim]
        arr = np.frombuffer(b, dtype=np.uint8).astype('float32')
        # normalize
        norm = np.linalg.norm(arr) or 1.0
        return arr / norm
    def embed_documents(self, docs):
        return [self._vec(d) for d in docs]
    def embed_query(self, q):
        return self._vec(q)

def build_index(chunks: List[str], pid: str):
    if USE_FAKE:
        print('[Embed] Using fallback fake embeddings (hash-based)')
        embedder = FallbackEmbedder()
        vecs = embedder.embed_documents(chunks)
    else:
        print('[Embed] Using VertexAIEmbeddings model', EMBED_MODEL)
        embedder = VertexAIEmbeddings(model_name=EMBED_MODEL, project=pid, location=LOCATION)
        vecs = embedder.embed_documents(chunks)
    arr = np.array(vecs, dtype='float32')
    index = faiss.IndexFlatL2(arr.shape[1])
    index.add(arr)
    return index

def create_simple_faiss_index(chunks: List[str]):
    """Create a simple FAISS index using fallback embeddings when Vertex AI is not available"""
    print('[Upload] Creating simple FAISS index with fallback embeddings')
    embedder = FallbackEmbedder()
    vecs = embedder.embed_documents(chunks)
    arr = np.array(vecs, dtype='float32')
    index = faiss.IndexFlatL2(arr.shape[1])
    index.add(arr)
    return index

@app.post('/upload')
async def upload_pdf(file: UploadFile = File(...)):
    # Phase 4: Enhanced upload with performance monitoring
    start_time = PerformanceMonitor.start_request_timer("upload")
    
    print('[Upload] Received file', file.filename, 'content_type=', file.content_type)
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail='Only PDF allowed')
    contents = await file.read()
    file_size_kb = len(contents) / 1024
    
    # Create uploads directory if it doesn't exist
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    
    # Generate doc_id first
    doc_id = os.urandom(8).hex()
    
    # Save PDF file permanently
    pdf_filename = f"{doc_id}_{file.filename or 'uploaded.pdf'}"
    pdf_path = uploads_dir / pdf_filename
    
    with open(pdf_path, 'wb') as f:
        f.write(contents)
    
    try:
        reader = pypdf.PdfReader(str(pdf_path))
        pages = []
        for p in reader.pages:
            try:
                pages.append(p.extract_text() or '')
            except Exception:
                pages.append('')
        full_text = '\n'.join(pages)
        chunks = [c for c in splitter.split_text(full_text) if c.strip()]
        
        # Try to build index with Vertex AI, fallback to local embeddings if not available
        index = None
        try:
            if project_id:
                index = build_index(chunks, project_id)
            else:
                print("[Upload] Vertex AI not available, using local embeddings")
                # Create a simple local index fallback
                index = create_simple_faiss_index(chunks)
        except Exception as e:
            print(f"[Upload] Index building failed: {e}, creating simple index")
            index = create_simple_faiss_index(chunks)
        
        upload_time = datetime.now().strftime("%Y-%m-%d %I:%M %p")
        
        # Store document data and metadata
        DOC_TEXT[doc_id] = chunks
        DOC_INDEX[doc_id] = index
        DOC_FILES[doc_id] = str(pdf_path)  # Store file path
        DOC_METADATA[doc_id] = {
            "filename": file.filename or "uploaded.pdf",
            "pages_count": len(reader.pages),
            "upload_time": upload_time,
            "file_size_kb": round(file_size_kb, 2)
        }
        
        # Phase 4: Add enhanced citation tracking
        CitationTracker.add_chunk_metadata(doc_id, chunks, str(pdf_path))
        
        print(f'[Upload] Stored doc_id={doc_id} chunks={len(chunks)} pages={len(reader.pages)} file={pdf_path}')
        
        # Persist document data to disk
        DocumentPersistence.save_document_data()
        
        PerformanceMonitor.end_request_timer("upload", start_time)
        
        return { 
            'doc_id': doc_id, 
            'chunks': len(chunks),
            'filename': file.filename,
            'pages': len(reader.pages),
            'upload_time': upload_time,
            'file_size_kb': round(file_size_kb, 2)
        }
        
    except Exception as e:
        # Clean up the saved file if processing fails
        if pdf_path.exists():
            pdf_path.unlink()
        PerformanceMonitor.record_error("upload", type(e).__name__)
        print(f"[Upload] Error occurred: {str(e)}")
        print(f"[Upload] Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")

SMALL_TALK_PATTERNS = [
    r'^hi$', r'^hi[.! ]', r'^hello', r'^hey', r'^heyy', r'^heya', r'^yo$', r'^how are',
    r"what's up", r'^sup$', r'^good (morning|afternoon|evening)', r'^thank', r'^thanks',
    r'^help$', r'^help me', r'^hows it going', r'^how is it going'
]

META_QUESTION_PATTERNS = [
    r'^who are you', r'^what are you', r'^what can you do', r'^what is your name',
    r'^tell me about yourself', r'^what are your capabilities', r'^how do you work',
    r"what's your name", r"what's today", r"what is today", r"current date", r"today's date",
    r"what time", r"current time", r"what pdf", r"pdf name", r"document name", r"file name",
    r"how many pages", r"pages count", r"document info", r"pdf info"
]

def is_small_talk(q: str) -> bool:
    ql = q.lower().strip()
    if len(ql) <= 50:  # increased length gate
        for pat in SMALL_TALK_PATTERNS:
            if re.search(pat, ql):
                return True
    return False

def is_meta_question(q: str) -> bool:
    """Check if question is about system or document metadata."""
    ql = q.lower().strip()
    for pat in META_QUESTION_PATTERNS:
        if re.search(pat, ql):
            return True
    return False

class ResponseHandlers:
    """Handles different types of responses based on question classification."""
    
    def __init__(self, llm=None):
        self.llm = llm
    
    def handle_conversational(self, question: str, system_ctx: dict) -> dict:
        """Handle casual conversation and greetings."""
        if self.llm:
            prompt = (
                f"You are {system_ctx['system_name']}, a friendly and helpful PDF assistant. "
                f"Today is {system_ctx['current_date']}. "
                "Respond naturally to the user's casual conversation or greeting. "
                "Keep it warm, concise (1-2 sentences), and professional.\n\n"
                f"User: {question}\nAssistant:"
            )
            try:
                resp = self.llm.invoke(prompt)
                answer = getattr(resp, 'content', str(resp))
            except Exception as e:
                answer = f"Hello! I'm {system_ctx['system_name']}, ready to help you with your PDF documents."
        else:
            answer = f"Hi! I'm {system_ctx['system_name']}. How can I help you with your documents today?"
        
        return { 'answer': answer, 'response_type': 'conversational' }
    
    def handle_personal(self, question: str, system_ctx: dict) -> dict:
        """Handle questions about the AI system and its capabilities."""
        capabilities_text = ', '.join(system_ctx['capabilities'])
        
        if self.llm:
            prompt = (
                f"You are {system_ctx['system_name']}, an AI assistant for PDF document analysis. "
                f"Your capabilities include: {capabilities_text}. "
                f"Current version: {system_ctx['version']}. "
                "Answer the user's question about your identity, capabilities, or how you work. "
                "Be helpful, accurate, and concise.\n\n"
                f"User: {question}\nAssistant:"
            )
            try:
                resp = self.llm.invoke(prompt)
                answer = getattr(resp, 'content', str(resp))
            except Exception as e:
                answer = (f"I'm {system_ctx['system_name']}, an AI assistant specialized in PDF document analysis. "
                         f"I can help you with: {capabilities_text}.")
        else:
            answer = (f"I'm {system_ctx['system_name']}, an AI assistant that can help you with: "
                     f"{capabilities_text}. Upload a PDF and ask me anything about it!")
        
        return { 'answer': answer, 'response_type': 'personal' }
    
    def handle_pdf_meta(self, question: str, system_ctx: dict, doc_ctx: dict) -> dict:
        """Handle questions about document metadata and properties."""
        ql = question.lower().strip()
        
        # Direct answers for specific meta questions
        if any(pattern in ql for pattern in ['pdf name', 'document name', 'file name']):
            filename = doc_ctx.get('filename', 'No document uploaded')
            answer = f"The current document is: **{filename}**"
            return { 'answer': answer, 'response_type': 'pdf_meta_filename' }
        
        if any(pattern in ql for pattern in ['pages', 'page count', 'how many pages']):
            pages = doc_ctx.get('pages_count', 0)
            filename = doc_ctx.get('filename', 'the document')
            answer = f"**{filename}** has **{pages} pages** and is divided into **{doc_ctx.get('chunks_count', 0)} text chunks** for analysis."
            return { 'answer': answer, 'response_type': 'pdf_meta_pages' }
        
        if any(pattern in ql for pattern in ['upload', 'when', 'time']):
            upload_time = doc_ctx.get('upload_time', 'Unknown')
            size_kb = doc_ctx.get('file_size_kb', 0)
            answer = f"Document uploaded: **{upload_time}** (Size: **{size_kb} KB**)"
            return { 'answer': answer, 'response_type': 'pdf_meta_upload' }
        
        # Use LLM for complex meta questions
        if self.llm and doc_ctx:
            prompt = (
                f"You are {system_ctx['system_name']}, answering questions about document metadata. "
                f"Current document: {doc_ctx.get('filename', 'None')} "
                f"({doc_ctx.get('pages_count', 0)} pages, {doc_ctx.get('chunks_count', 0)} chunks, "
                f"uploaded {doc_ctx.get('upload_time', 'unknown')}, {doc_ctx.get('file_size_kb', 0)} KB). "
                "Answer the user's question about the document properties.\n\n"
                f"Question: {question}\nAnswer:"
            )
            try:
                resp = self.llm.invoke(prompt)
                answer = getattr(resp, 'content', str(resp))
            except Exception as e:
                answer = "I can provide information about your uploaded document. What specific details would you like to know?"
        else:
            answer = "I can help you with document information. Please ask about the filename, page count, or upload details."
        
        return { 'answer': answer, 'response_type': 'pdf_meta_general' }
    
    def handle_general(self, question: str, system_ctx: dict) -> dict:
        """Handle general knowledge questions."""
        if self.llm:
            prompt = (
                f"You are {system_ctx['system_name']}, a helpful AI assistant. "
                f"Today is {system_ctx['current_date']} at {system_ctx['current_time']}. "
                "Answer the user's general knowledge question accurately and concisely. "
                "If you don't know something, say so honestly.\n\n"
                f"Question: {question}\nAnswer:"
            )
            try:
                resp = self.llm.invoke(prompt)
                answer = getattr(resp, 'content', str(resp))
            except Exception as e:
                answer = "I'd be happy to help with general questions, but I'm currently having trouble accessing my knowledge base."
        else:
            # Handle specific questions without LLM
            ql = question.lower()
            if any(pattern in ql for pattern in ['today', 'date', 'current date']):
                answer = f"Today is {system_ctx['current_date']}, and the current time is {system_ctx['current_time']}."
            else:
                answer = "I can help with general questions when my language model is available. Please try again or ask about your PDF document."
        
        return { 'answer': answer, 'response_type': 'general' }
    
    def handle_pdf_content(self, question: str, doc_id: str, system_ctx: dict, doc_ctx: dict) -> dict:
        """Handle questions about PDF content using RAG."""
        chunks = DOC_TEXT[doc_id]
        index = DOC_INDEX[doc_id]
        
        # Embedding and search logic with fallback
        try:
            if USE_FAKE:
                embedder = FallbackEmbedder()
                q_vec = embedder.embed_query(question)
            else:
                embedder = VertexAIEmbeddings(model_name=EMBED_MODEL, project=project_id, location=LOCATION)
                q_vec = embedder.embed_query(question)
        except Exception as e:
            print(f"[Chat] Embedding failed, using fallback: {e}")
            # Use fallback embedder if Vertex AI fails
            embedder = FallbackEmbedder()
            q_vec = embedder.embed_query(question)
        
        distances, indices = index.search(np.array([q_vec], dtype='float32'), k=3)
        retrieved = [chunks[i] for i in indices[0] if 0 <= i < len(chunks)]
        
        if not retrieved:
            return {
                'answer': f"I couldn't find relevant information about that in **{doc_ctx.get('filename', 'your document')}**. Would you like me to provide general information about this topic instead?",
                'response_type': 'pdf_content_not_found',
                'sources': [],
                'suggestion': 'general_knowledge'
            }
        
        if not self.llm:
            return { 
                'answer': 'I found relevant content but need the language model to generate an answer.', 
                'response_type': 'pdf_content_error',
                'sources': retrieved 
            }

        # Generate answer from document context
        context = '\n\n'.join(retrieved)
        prompt = (
            f"You are {system_ctx['system_name']}, analyzing the document **{doc_ctx.get('filename', 'uploaded document')}**. "
            "Answer the question using ONLY the provided context from the PDF. "
            "If the answer isn't in the context, say so clearly. Be accurate and cite relevant details.\n\n"
            f"Document context:\n{context}\n\nQuestion: {question}\nAnswer:"
        )
        
        try:
            resp = self.llm.invoke(prompt)
            answer = getattr(resp, 'content', str(resp))
        except Exception as e:
            print(f'[ResponseHandler] PDF content generation failed: {e}')
            answer = f"I found relevant content in {doc_ctx.get('filename', 'your document')} but encountered an error generating the response."
        
        return { 
            'answer': answer, 
            'response_type': 'pdf_content',
            'sources': retrieved,
            'document_info': {
                'filename': doc_ctx.get('filename'),
                'pages': doc_ctx.get('pages_count'),
                'chunks_used': len(retrieved)
            }
        }
    
    def handle_multi_document_content(self, question: str, collection_id: str, system_ctx: dict, doc_ctx: dict) -> dict:
        """Phase 4: Handle questions across multiple documents in a collection."""
        if collection_id not in DOCUMENT_COLLECTIONS:
            return {
                'answer': "Collection not found for multi-document search.",
                'response_type': 'collection_error',
                'sources': []
            }
        
        doc_ids = DOCUMENT_COLLECTIONS[collection_id]
        
        # Use multi-document search if available
        if collection_id in CROSS_DOC_INDEX:
            # Build query vector with fallback
            try:
                if USE_FAKE:
                    embedder = FallbackEmbedder()
                    q_vec = embedder.embed_query(question)
                else:
                    embedder = VertexAIEmbeddings(model_name=EMBED_MODEL, project=project_id, location=LOCATION)
                    q_vec = embedder.embed_query(question)
            except Exception as e:
                print(f"[Chat] Multi-doc embedding failed, using fallback: {e}")
                # Use fallback embedder if Vertex AI fails
                embedder = FallbackEmbedder()
                q_vec = embedder.embed_query(question)
                
                # Search across collection
                results = MultiDocumentManager.search_across_documents(collection_id, np.array(q_vec), k=5)
                
                if not results:
                    return {
                        'answer': f"I couldn't find relevant information in the {len(doc_ids)} documents of this collection.",
                        'response_type': 'multi_doc_not_found',
                        'sources': [],
                        'collection_info': {
                            'collection_id': collection_id,
                            'document_count': len(doc_ids)
                        }
                    }
                
                # Prepare context from multiple documents
                context_parts = []
                sources_with_docs = []
                
                for result in results:
                    doc_metadata = DOC_METADATA.get(result['doc_id'], {})
                    source_info = f"[{doc_metadata.get('filename', 'Unknown')}]: {result['chunk']}"
                    context_parts.append(source_info)
                    sources_with_docs.append({
                        'text': result['chunk'],
                        'doc_id': result['doc_id'],
                        'filename': doc_metadata.get('filename', 'Unknown'),
                        'distance': float(result['distance'])
                    })
                
                if not self.llm:
                    return {
                        'answer': 'Found relevant content across multiple documents but need language model to generate answer.',
                        'response_type': 'multi_doc_error',
                        'sources': sources_with_docs
                    }
                
                # Generate answer from multi-document context
                context = '\n\n'.join(context_parts)
                prompt = (
                    f"You are {system_ctx['system_name']}, analyzing {len(doc_ids)} documents in a collection. "
                    "Answer the question using the provided context from multiple PDF documents. "
                    "When citing information, mention which document it comes from. "
                    "If the answer spans multiple documents, synthesize the information clearly.\n\n"
                    f"Multi-document context:\n{context}\n\nQuestion: {question}\nAnswer:"
                )
                
                try:
                    resp = self.llm.invoke(prompt)
                    answer = getattr(resp, 'content', str(resp))
                except Exception as e:
                    print(f'[ResponseHandler] Multi-document generation failed: {e}')
                    answer = f"I found relevant content across {len(results)} documents but encountered an error generating the response."
                
                return {
                    'answer': answer,
                    'response_type': 'multi_document_content',
                    'sources': [s['text'] for s in sources_with_docs],
                    'multi_doc_sources': sources_with_docs,
                    'collection_info': {
                        'collection_id': collection_id,
                        'documents_searched': len(doc_ids),
                        'sources_found': len(results)
                    }
                }
                
            except Exception as e:
                print(f'[ResponseHandler] Multi-document search failed: {e}')
                return {
                    'answer': f"Error searching across the {len(doc_ids)} documents in this collection.",
                    'response_type': 'multi_doc_search_error',
                    'sources': [],
                    'error': str(e)
                }
        else:
            # Fallback: search each document individually and combine results
            all_results = []
            
            for doc_id in doc_ids[:3]:  # Limit to first 3 docs for performance
                if doc_id in DOC_TEXT and doc_id in DOC_INDEX:
                    # Use existing single-doc search logic
                    try:
                        doc_result = self.handle_pdf_content(question, doc_id, system_ctx, 
                                                           ContextManager.get_document_context(doc_id))
                        if doc_result.get('sources'):
                            all_results.append({
                                'doc_id': doc_id,
                                'filename': DOC_METADATA.get(doc_id, {}).get('filename', 'Unknown'),
                                'answer': doc_result['answer'],
                                'sources': doc_result['sources']
                            })
                    except Exception as e:
                        print(f'[MultiDoc] Error searching doc {doc_id}: {e}')
                        continue
            
            if not all_results:
                return {
                    'answer': f"I couldn't find relevant information in any of the {len(doc_ids)} documents.",
                    'response_type': 'multi_doc_fallback_not_found',
                    'sources': []
                }
            
            # Synthesize results from multiple documents
            if self.llm:
                synthesis_parts = []
                all_sources = []
                
                for result in all_results:
                    synthesis_parts.append(f"From {result['filename']}: {result['answer']}")
                    all_sources.extend(result['sources'])
                
                synthesis_context = '\n\n'.join(synthesis_parts)
                synthesis_prompt = (
                    f"You are {system_ctx['system_name']}, synthesizing findings from multiple documents. "
                    f"The user asked: '{question}'. I searched {len(doc_ids)} documents and found relevant information. "
                    "Synthesize the following findings into a coherent answer:\n\n"
                    f"{synthesis_context}\n\nSynthesized answer:"
                )
                
                try:
                    resp = self.llm.invoke(synthesis_prompt)
                    answer = getattr(resp, 'content', str(resp))
                except Exception as e:
                    print(f'[MultiDoc] Synthesis failed: {e}')
                    answer = f"Found information in {len(all_results)} documents but couldn't synthesize the results."
                
                return {
                    'answer': answer,
                    'response_type': 'multi_document_fallback',
                    'sources': all_sources,
                    'document_results': all_results,
                    'collection_info': {
                        'collection_id': collection_id,
                        'documents_searched': len(doc_ids),
                        'documents_found': len(all_results)
                    }
                }
            else:
                # Simple concatenation fallback
                combined_answer = f"Found information in {len(all_results)} documents:\n\n"
                all_sources = []
                
                for result in all_results:
                    combined_answer += f"**{result['filename']}**: {result['answer']}\n\n"
                    all_sources.extend(result['sources'])
                
                return {
                    'answer': combined_answer,
                    'response_type': 'multi_document_simple',
                    'sources': all_sources,
                    'collection_info': {
                        'collection_id': collection_id,
                        'documents_found': len(all_results)
                    }
                }

@app.post('/chat')
async def chat(req: ChatRequest):
    """Phase 4: Enhanced chat endpoint with multi-document support, caching, and citation tracking."""
    # Phase 4: Performance monitoring
    start_time = PerformanceMonitor.start_request_timer("chat")
    
    print(f'[Chat] Processing question: doc_id={req.doc_id}, collection_id={req.collection_id}')
    
    # Validate input - either doc_id or collection_id required
    if not req.doc_id and not req.collection_id:
        raise HTTPException(status_code=400, detail='Either doc_id or collection_id is required')
    
    if req.doc_id and req.doc_id not in DOC_TEXT:
        raise HTTPException(status_code=404, detail='Document not found')
    
    if req.collection_id and req.collection_id not in DOCUMENT_COLLECTIONS:
        raise HTTPException(status_code=404, detail='Collection not found')

    question = req.question.strip()
    
    # Get context for enhanced responses
    system_ctx = ContextManager.get_system_context()
    doc_ctx = {}
    
    if req.doc_id:
        doc_ctx = ContextManager.get_document_context(req.doc_id)
    elif req.collection_id:
        # Multi-document context
        collection_docs = DOCUMENT_COLLECTIONS[req.collection_id]
        doc_ctx = {
            "collection_id": req.collection_id,
            "document_count": len(collection_docs),
            "total_chunks": sum(len(DOC_TEXT.get(doc_id, [])) for doc_id in collection_docs)
        }
    
    # Initialize LLM for classification and responses
    api_key = os.environ.get('GOOGLE_API_KEY')
    llm = None
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.4)
        except Exception as e:
            print('[Chat] LLM init failed', e)
    
    # Phase 4: Check cache first (if enabled)
    cached_response = {}
    if req.enable_cache:
        classification_preview = {"category": "CACHED", "confidence": 1.0}
        cached_response = ResponseCache.get_cached_response(question, req.doc_id or req.collection_id, classification_preview)
        
        if cached_response:
            print("[Chat] Returning cached response")
            PerformanceMonitor.end_request_timer("chat", start_time)
            return cached_response
    
    # Phase 2: Intelligent Question Classification
    classifier = QuestionClassifier(llm)
    classification = classifier.classify_question(question, doc_ctx)
    
    print(f'[Chat] Classification: {classification["category"]} (confidence: {classification["confidence"]:.2f}) - {classification["reasoning"]}')
    
    # Initialize response handlers
    handlers = ResponseHandlers(llm)
    
    # Route to appropriate handler based on classification
    category = classification["category"]
    confidence = classification["confidence"]
    
    # Phase 3: Conversation memory and advanced routing
    session_id = req.session_id or req.doc_id or req.collection_id
    ConversationManager.add_to_history(session_id, question, {"response_type": category}, classification)
    
    follow_up_info = ConversationManager.detect_follow_up(question, session_id)
    router = AdvancedRouter(llm)
    hybrid_decision = router.should_use_hybrid_response(classification, question, follow_up_info)
    
    if hybrid_decision.get("use_hybrid"):
        # Hybrid response from multiple handlers
        handlers_list = hybrid_decision.get("handlers", [])
        response = router.generate_hybrid_response(handlers_list, question, req.doc_id or req.collection_id, system_ctx, doc_ctx, handlers)
    else:
        # Single handler response
        primary_handler = hybrid_decision.get("primary_handler", category)
        if primary_handler == "CONVERSATIONAL":
            response = handlers.handle_conversational(question, system_ctx)
        elif primary_handler == "PERSONAL":
            response = handlers.handle_personal(question, system_ctx)
        elif primary_handler == "PDF_META":
            response = handlers.handle_pdf_meta(question, system_ctx, doc_ctx)
        elif primary_handler == "GENERAL":
            response = handlers.handle_general(question, system_ctx)
        elif primary_handler == "PDF_CONTENT":
            if req.collection_id:
                # Phase 4: Multi-document search
                response = handlers.handle_multi_document_content(question, req.collection_id, system_ctx, doc_ctx)
            else:
                response = handlers.handle_pdf_content(question, req.doc_id, system_ctx, doc_ctx)
        else:
            # Fallback for unknown categories
            response = handlers.handle_general(question, system_ctx)
    
    # Phase 4: Enhanced citations
    if req.doc_id and response.get("sources"):
        enhanced_citations = CitationTracker.get_enhanced_citations(req.doc_id, response["sources"])
        response["enhanced_citations"] = enhanced_citations
    
    # Phase 3: Add advanced metadata to response
    response.update({
        "classification": classification,
        "session_id": session_id,
        "follow_up_detected": follow_up_info.get("is_follow_up", False),
        "routing_decision": hybrid_decision,
        "conversation_turn": len(CONVERSATION_MEMORY.get(session_id, [])),
        "timestamp": datetime.now().isoformat(),
        "doc_id": req.doc_id,
        "collection_id": req.collection_id,
        "cached": False
    })
    
    # Phase 4: Cache response (if enabled)
    if req.enable_cache and response.get("response_type") not in ["conversational", "personal"]:
        ResponseCache.cache_response(question, req.doc_id or req.collection_id, classification, response)
    
    # Add response to conversation history
    ConversationManager.add_to_history(session_id, question, response, classification)
    
    PerformanceMonitor.end_request_timer("chat", start_time)
    
    return response

@app.get('/pdf/{doc_id}')
async def serve_pdf(doc_id: str):
    """Serve PDF file by document ID."""
    if doc_id not in DOC_FILES:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    pdf_path = DOC_FILES[doc_id]
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
    
    filename = DOC_METADATA.get(doc_id, {}).get('filename', 'document.pdf')
    
    return FileResponse(
        path=pdf_path,
        media_type='application/pdf',
        filename=filename
    )

# ====== CHAT PERSISTENCE ENDPOINTS ======

class SaveChatsRequest(BaseModel):
    """Request model for saving user chats."""
    chats: dict  # The complete chat data from frontend localStorage

class LoadChatsResponse(BaseModel):
    """Response model for loading user chats."""
    chats: dict

@app.post('/api/user/save-chats')
async def save_user_chats(
    request: SaveChatsRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Save user's chat history to the database."""
    try:
        from sqlalchemy import select, delete
        from models import Chat as ChatModel, Message as MessageModel, ChatDocument, Document
        
        user_id = current_user.user_id
        chat_data = request.chats
        
        # Clear existing chats for this user
        await db.execute(delete(MessageModel).where(MessageModel.user_id == user_id))
        await db.execute(delete(ChatDocument).where(ChatDocument.chat_id.in_(
            select(ChatModel.chat_id).where(ChatModel.user_id == user_id)
        )))
        await db.execute(delete(ChatModel).where(ChatModel.user_id == user_id))
        
        # Save new chats
        for chat_item in chat_data.get('history', []):
            chat_id = chat_item['id']
            
            # Create chat record
            chat_record = ChatModel(
                chat_id=str(chat_id),  # Ensure string conversion
                user_id=user_id,
                title=chat_item.get('title', 'New Chat'),
                created_at=datetime.fromtimestamp(chat_item.get('createdAt', time.time()) / 1000),
                last_activity=datetime.now()
            )
            db.add(chat_record)
            
            # Save messages for this chat
            messages = chat_data.get('messages', {}).get(chat_id, [])
            for i, message in enumerate(messages):
                message_record = MessageModel(
                    message_id=str(message['id']),  # Ensure string conversion
                    chat_id=str(chat_id),  # Ensure string conversion
                    user_id=user_id,
                    message_type=message['role'],
                    content=message['content'],
                    timestamp_created=datetime.fromtimestamp(message.get('timestamp', time.time()) / 1000),
                    order_index=i
                )
                db.add(message_record)
            
            # Save chat documents if any
            chat_documents = chat_data.get('chatDocuments', {}).get(chat_id, [])
            for doc in chat_documents:
                # Check if the document exists in DOC_METADATA (in-memory storage)
                # This is where uploaded documents are actually stored
                if doc['doc_id'] in DOC_METADATA:
                    # Check if document exists in database table, if not create it
                    from sqlalchemy import select
                    existing_doc = await db.execute(
                        select(Document).where(Document.doc_id == doc['doc_id'])
                    )
                    if existing_doc.scalar_one_or_none() is None:
                        # Create document record in database
                        doc_metadata = DOC_METADATA[doc['doc_id']]
                        doc_record = Document(
                            doc_id=doc['doc_id'],
                            user_id=user_id,
                            filename=doc.get('filename', doc_metadata.get('filename', 'Unknown')),
                            file_path=doc_metadata.get('file_path', ''),
                            file_size=int(doc.get('file_size_kb', 0) * 1024) if doc.get('file_size_kb') else 0,
                            pages=doc.get('pages', doc_metadata.get('pages', 0)),
                            upload_time=datetime.now(),
                            status='processed'
                        )
                        db.add(doc_record)
                        print(f"[Persistence] Created document record for {doc['doc_id']}")
                    
                    # Now create the chat-document association
                    chat_doc_record = ChatDocument(
                        chat_id=str(chat_id),  # Ensure string conversion
                        doc_id=doc['doc_id'],
                        added_at=datetime.now()
                    )
                    db.add(chat_doc_record)
                else:
                    print(f"[Warning] Skipping chat document {doc['doc_id']} - document not found in DOC_METADATA")
        
        await db.commit()
        
        return {"success": True, "message": "Chats saved successfully"}
        
    except Exception as e:
        await db.rollback()
        print(f"Error saving chats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save chats: {str(e)}")

@app.get('/api/user/load-chats')
async def load_user_chats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
) -> LoadChatsResponse:
    """Load user's chat history from the database."""
    try:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from models import Chat as ChatModel, Message as MessageModel, ChatDocument
        
        user_id = current_user.user_id
        
        # Load chats with messages and documents
        result = await db.execute(
            select(ChatModel)
            .where(ChatModel.user_id == user_id)
            .options(
                selectinload(ChatModel.messages),
                selectinload(ChatModel.chat_documents)
            )
            .order_by(ChatModel.last_activity.desc())
        )
        chats = result.scalars().all()
        
        # Format data to match frontend structure
        history = []
        messages = {}
        chat_documents = {}
        active_id = None
        
        for chat in chats:
            # Add to history
            history.append({
                'id': str(chat.chat_id),
                'title': chat.title,
                'createdAt': int(chat.created_at.timestamp() * 1000),
                'hasPdf': len(chat.chat_documents) > 0
            })
            
            # Set first chat as active
            if active_id is None:
                active_id = str(chat.chat_id)
            
            # Add messages
            chat_messages = []
            for msg in sorted(chat.messages, key=lambda x: x.order_index):
                chat_messages.append({
                    'id': str(msg.message_id),
                    'role': msg.message_type,
                    'content': msg.content,
                    'timestamp': int(msg.timestamp_created.timestamp() * 1000)
                })
            messages[str(chat.chat_id)] = chat_messages
            
            # Add chat documents
            docs = []
            for chat_doc in chat.chat_documents:
                # Get document metadata from DOC_METADATA
                doc_metadata = DOC_METADATA.get(chat_doc.doc_id, {})
                docs.append({
                    'doc_id': chat_doc.doc_id,
                    'filename': doc_metadata.get('filename', 'Unknown'),
                    'pages': doc_metadata.get('pages'),
                    'file_size_kb': doc_metadata.get('file_size_kb'),
                    'upload_time': doc_metadata.get('upload_time')
                })
            chat_documents[str(chat.chat_id)] = docs
        
        return LoadChatsResponse(chats={
            'history': history,
            'messages': messages,
            'activeId': active_id,
            'chatDocuments': chat_documents
        })
        
    except Exception as e:
        print(f"Error loading chats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load chats: {str(e)}")

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
