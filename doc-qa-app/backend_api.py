#!/usr/bin/env python3
"""FastAPI backend for DocSpotlight bridging PDF ingestion, embeddings, and chat."""
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
from typing import List, Dict
from dotenv import load_dotenv
from pathlib import Path
import hashlib
import re

load_dotenv()

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

class ChatRequest(BaseModel):
    question: str
    doc_id: str

# In-memory stores (can later persist)
DOC_TEXT: Dict[str, List[str]] = {}
DOC_INDEX: Dict[str, faiss.Index] = {}

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

USE_FAKE = os.environ.get('USE_FAKE_EMBED', '0') == '1'

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

@app.post('/upload')
async def upload_pdf(file: UploadFile = File(...)):
    print('[Upload] Received file', file.filename, 'content_type=', file.content_type)
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail='Only PDF allowed')
    contents = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        reader = pypdf.PdfReader(tmp_path)
        pages = []
        for p in reader.pages:
            try:
                pages.append(p.extract_text() or '')
            except Exception:
                pages.append('')
        full_text = '\n'.join(pages)
        chunks = [c for c in splitter.split_text(full_text) if c.strip()]
        if not project_id:
            raise HTTPException(status_code=500, detail='Vertex project not initialized')
        index = build_index(chunks, project_id)
    finally:
        os.unlink(tmp_path)
    doc_id = os.urandom(8).hex()
    DOC_TEXT[doc_id] = chunks
    DOC_INDEX[doc_id] = index
    print(f'[Upload] Stored doc_id={doc_id} chunks={len(chunks)}')
    return { 'doc_id': doc_id, 'chunks': len(chunks) }

SMALL_TALK_PATTERNS = [
    r'^hi$', r'^hi[.! ]', r'^hello', r'^hey', r'^heyy', r'^heya', r'^yo$', r'^how are',
    r"what's up", r'^sup$', r'^good (morning|afternoon|evening)', r'^thank', r'^thanks',
    r'^who are you', r'^help$', r'^help me', r'^hows it going', r'^how is it going'
]

def is_small_talk(q: str) -> bool:
    ql = q.lower().strip()
    if len(ql) <= 40:  # quick length gate
        for pat in SMALL_TALK_PATTERNS:
            if re.search(pat, ql):
                return True
    return False

@app.post('/chat')
async def chat(req: ChatRequest):
    print('[Chat] question for doc', req.doc_id)
    if req.doc_id not in DOC_TEXT:
        raise HTTPException(status_code=404, detail='Document not found')

    question = req.question.strip()
    small_talk = is_small_talk(question)

    api_key = os.environ.get('GOOGLE_API_KEY')
    llm = None
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.4)
        except Exception as e:
            print('[Chat] LLM init failed', e)

    if small_talk:
        if llm:
            prompt = (
                "You are DocSpotlight, a concise, warm PDF assistant. Respond naturally to the user greeting or small-talk. "
                "Keep it under 2 short sentences. Do not mention documents unless the user explicitly refers to them.\n\nUser: "
                f"{question}\nAssistant:"
            )
            try:
                resp = llm.invoke(prompt)
                answer = getattr(resp, 'content', str(resp))
            except Exception as e:
                answer = f"(Hi!) I'm here and ready to help with your PDF. (LLM error: {e})"
        else:
            answer = "Hi! I'm DocSpotlight. Upload a PDF and ask me anything about it."
        return { 'answer': answer, 'small_talk': True }

    # --- Retrieval flow (non-small-talk) ---
    chunks = DOC_TEXT[req.doc_id]
    index = DOC_INDEX[req.doc_id]
    if USE_FAKE:
        embedder = FallbackEmbedder()
        q_vec = embedder.embed_query(question)
    else:
        embedder = VertexAIEmbeddings(model_name=EMBED_MODEL, project=project_id, location=LOCATION)
        q_vec = embedder.embed_query(question)
    distances, indices = index.search(np.array([q_vec], dtype='float32'), k=3)
    retrieved = [chunks[i] for i in indices[0] if 0 <= i < len(chunks)]
    if not retrieved:
        return { 'answer': 'No relevant context found in the document for that question.', 'sources': [] }
    if not llm:
        return { 'answer': 'LLM unavailable (missing GOOGLE_API_KEY).', 'sources': retrieved }

    context = '\n\n'.join(retrieved)
    prompt = (
        "You are DocSpotlight, a helpful AI assistant answering questions strictly using the provided PDF context. "
        "If the answer is not present, say you do not know succinctly. Be concise.\n\nContext:\n"
        f"{context}\n\nQuestion: {question}\nAnswer:"
    )
    try:
        resp = llm.invoke(prompt)
        answer = getattr(resp, 'content', str(resp))
    except Exception as e:
        print('[Chat] Generation failed', e)
        answer = f"Generation failed: {e}"
    return { 'answer': answer, 'sources': retrieved, 'small_talk': False }

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
