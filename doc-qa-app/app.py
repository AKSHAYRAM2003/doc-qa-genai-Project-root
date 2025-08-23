import pypdf
import sys
import numpy as np
import faiss
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
import google.auth
from google.cloud import aiplatform
import os
from pathlib import Path
from dotenv import load_dotenv
import readline

# Load environment variables from .env file located alongside this script
load_dotenv(dotenv_path=Path(__file__).parent / '.env')

# --- Configuration ---
PROJECT_ID = None
LOCATION = "us-central1"
DEFAULT_EMBEDDING_MODEL = "text-embedding-004"
LLM_MODEL = "gemini-1.5-flash"  # updated from gemini-1.5-flash-001
BASE_DIR = Path(__file__).parent  # directory of this script
PDF_NAME = "sample.pdf"
PDF_PATH = BASE_DIR / PDF_NAME

# --- Functions from before (now implemented) ---
def extract_text_from_pdf(pdf_path: str) -> str:
    """Read all text from a PDF file and return as a single string."""
    print(f"Reading PDF file...{pdf_path}...")
    try:
        reader = pypdf.PdfReader(pdf_path)
    except FileNotFoundError:
        print(f"Error: PDF file not found at {pdf_path}")
        sys.exit(1)
    text_parts = []
    for i, page in enumerate(reader.pages):
        try:
            page_text = page.extract_text() or ""
        except Exception as e:
            print(f"Warning: failed to extract text from page {i}: {e}")
            page_text = ""
        text_parts.append(page_text)
    full_text = "\n".join(text_parts).strip()
    if not full_text:
        print("Warning: No extractable text found in PDF.")
    return full_text

def split_text_into_chunks(text: str, chunk_size: int = 1000, chunk_overlap: int = 200):
    """Split raw text into overlapping chunks for embedding."""
    print("Splitting text into chunks...")
    if not text:
        return []
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    chunks = splitter.split_text(text)
    return [c for c in chunks if c.strip()]

def generate_embeddings(chunks, project_id: str, location: str = LOCATION, model_name: str = DEFAULT_EMBEDDING_MODEL):
    """Generate embeddings for a list of text chunks using Vertex AI embeddings."""
    print(f"Generating embeddings for {len(chunks)} chunks using model '{model_name}'...")
    if not chunks:
        print("No chunks to embed.")
        return []
    try:
        embedder = VertexAIEmbeddings(model_name=model_name, project=project_id, location=location)
        vectors = embedder.embed_documents(chunks)
        return vectors
    except Exception as e:
        print(f"Embedding generation failed: {e}")
        sys.exit(1)

def create_vector_database(vectors):
    """Create a FAISS index (L2) from embedding vectors."""
    print("Creating FAISS vector database...")
    if not vectors:
        print("No vectors provided.")
        return None
    arr = np.array(vectors, dtype="float32")
    dim = arr.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(arr)
    print(f"FAISS index created with {index.ntotal} vectors (dim={dim}).")
    return index

def search_vector_database(query: str, index, chunks, project_id: str, k: int = 3, model_name: str = DEFAULT_EMBEDDING_MODEL):
    """Embed the query and perform a similarity search returning top-k chunks."""
    print(f"Searching top {k} similar chunks for query: {query}")
    if index is None or index.ntotal == 0:
        print("Empty index.")
        return []
    try:
        embedder = VertexAIEmbeddings(model_name=model_name, project=project_id, location=LOCATION)
        q_vec = embedder.embed_query(query)
    except Exception as e:
        print(f"Query embedding failed: {e}")
        return []
    q_arr = np.array([q_vec], dtype="float32")
    distances, indices = index.search(q_arr, k)
    results = []
    for idx in indices[0]:
        if 0 <= idx < len(chunks):
            results.append(chunks[idx])
    print(f"Found {len(results)} relevant chunks.")
    return results

# --- NEW GENERATION FUNCTION (unchanged except safety) ---
def generate_answer(relevant_chunks, query):
    """Generate a final answer using a Gemini model with provided context."""
    if not relevant_chunks:
        return "I could not find relevant information in the document."
    print("Generating a final answer...")
    context = "\n\n".join(relevant_chunks)
    prompt = f"""
You are a helpful assistant. Use the following context to answer the question.
If you don't know, say you don't know.

Context:
{context}

Question: {query}

Answer:"""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return "GOOGLE_API_KEY environment variable not set. Cannot call Gemini model."
    try:
        llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.3)
        resp = llm.invoke(prompt)
        return getattr(resp, "content", str(resp))
    except Exception as e:
        if "404" in str(e) and "ListModels" not in str(e):
            return f"Model not found: {LLM_MODEL}. Try 'gemini-1.5-flash' or 'gemini-1.5-pro'. Error: {e}"
        return f"LLM generation failed: {e}"

def interactive_loop(faiss_index, chunks):
    """Simple CLI loop for multiple user queries."""
    print("\nEnter questions (type 'exit' to quit):")
    while True:
        try:
            q = input("Q> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break
        if q.lower() in {"exit", "quit"}:
            break
        if not q:
            continue
        rel = search_vector_database(q, faiss_index, chunks, project_id=PROJECT_ID)
        ans = generate_answer(rel, q)
        print("A>", ans, "\n")

if __name__ == "__main__":
    # --- Authentication ---
    try:
        credentials, project_id = google.auth.default()
        aiplatform.init(project=project_id, location=LOCATION, credentials=credentials)
        PROJECT_ID = project_id
        print(f"Authenticated with project: {PROJECT_ID}")
    except Exception as e:
        print(f"Authentication failed: {e}")
        sys.exit(1)

    pdf_file_path = str(PDF_PATH)

    # --- RAG Pipeline ---
    extracted_text = extract_text_from_pdf(pdf_file_path)
    if not extracted_text:
        print("No text extracted; exiting.")
        sys.exit(0)
    text_chunks = split_text_into_chunks(extracted_text)
    print(f"Prepared {len(text_chunks)} chunks.")
    embedding_vectors = generate_embeddings(text_chunks, project_id=PROJECT_ID)
    faiss_index = create_vector_database(embedding_vectors)

    # --- Run a sample query ---
    sample_query = "What is Python Mastery?"
    relevant_chunks = search_vector_database(sample_query, faiss_index, text_chunks, project_id=PROJECT_ID)

    final_answer = generate_answer(relevant_chunks, sample_query)

    print("\n--- Question ---")
    print(sample_query)
    print("\n--- Final Answer ---")
    print(final_answer)

    # Start interactive Q&A
    interactive_loop(faiss_index, text_chunks)