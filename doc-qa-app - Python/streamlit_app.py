import streamlit as st
import os
from pathlib import Path
from dotenv import load_dotenv
import google.auth
from google.cloud import aiplatform
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
import pypdf
import numpy as np
import faiss

load_dotenv(Path(__file__).parent / '.env')

LOCATION = "us-central1"
EMBED_MODEL = "text-embedding-004"
LLM_MODEL = "gemini-1.5-flash"

@st.cache_resource(show_spinner=False)
def init_vertex():
    credentials, project_id = google.auth.default()
    aiplatform.init(project=project_id, location=LOCATION, credentials=credentials)
    return project_id

@st.cache_data(show_spinner=False)
def load_pdf(file_bytes):
    reader = pypdf.PdfReader(file_bytes)
    text_parts = []
    for page in reader.pages:
        try:
            text_parts.append(page.extract_text() or "")
        except Exception:
            pass
    return "\n".join(text_parts)

@st.cache_data(show_spinner=False)
def make_chunks(text, size=1000, overlap=200):
    splitter = RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=overlap, length_function=len)
    return splitter.split_text(text)

@st.cache_resource(show_spinner=False)
def embed_chunks(chunks, project_id):
    embedder = VertexAIEmbeddings(model_name=EMBED_MODEL, project=project_id, location=LOCATION)
    vectors = embedder.embed_documents(chunks)
    arr = np.array(vectors, dtype='float32')
    index = faiss.IndexFlatL2(arr.shape[1])
    index.add(arr)
    return index, vectors

def search(query, project_id, index, chunks, k=3):
    embedder = VertexAIEmbeddings(model_name=EMBED_MODEL, project=project_id, location=LOCATION)
    q_vec = embedder.embed_query(query)
    distances, indices = index.search(np.array([q_vec], dtype='float32'), k)
    return [chunks[i] for i in indices[0] if 0 <= i < len(chunks)]

def answer(query, context_chunks):
    if not context_chunks:
        return "No relevant context found."
    llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.3)
    context = "\n\n".join(context_chunks)
    prompt = f"""Use the context to answer. If unsure say you don't know.\nContext:\n{context}\n\nQuestion: {query}\nAnswer:"""
    resp = llm.invoke(prompt)
    return getattr(resp, 'content', str(resp))

st.title("Document Q&A (Vertex + Gemini)")
project_id = init_vertex()

api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    st.error("GOOGLE_API_KEY not set in environment.")

uploaded = st.file_uploader("Upload a PDF", type=["pdf"]) 
if uploaded:
    text = load_pdf(uploaded)
    st.write(f"Characters extracted: {len(text)}")
    chunks = make_chunks(text)
    st.write(f"Chunks: {len(chunks)}")
    index, vectors = embed_chunks(chunks, project_id)

    query = st.text_input("Ask a question about the document")
    if query:
        top_chunks = search(query, project_id, index, chunks)
        with st.expander("Retrieved Chunks"):
            for c in top_chunks:
                st.write(c[:500] + ('...' if len(c) > 500 else ''))
        ans = answer(query, top_chunks)
        st.subheader("Answer")
        st.write(ans)
else:
    st.info("Upload a PDF to begin.")
