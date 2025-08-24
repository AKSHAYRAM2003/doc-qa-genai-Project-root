# DocSpotlight

Intelligent PDF Q&A platform combining a modern ChatGPT‑style Next.js UI with a Python RAG (Retrieval Augmented Generation) backend powered by Google Vertex AI / Gemini and FAISS vector similarity search.

---
## ✨ Key Features
- Chat with your PDF documents (semantic Q&A)
- PDF ingestion: extraction, clean splitting, embedding
- RAG pipeline: Vertex AI embeddings + FAISS index + Gemini answer synthesis
- Modern responsive UI (Next.js App Router + Tailwind + Framer Motion)
- Collapsible / mobile‑aware sidebar with chat history & profile area
- ChatGPT‑like animated input bar with drag & drop + modal PDF upload
- Quick action suggested prompts after upload
- Custom typography (FK Grotesk & PP Editorial) via local fonts
- Dark, accessible aesthetic with subtle motion
- Streamlit prototype and FastAPI backend service options

---
## 🧱 Architecture Overview
```
┌──────────────┐        Upload / Ask         ┌──────────────────────┐
│  Next.js UI  │  ───────────────────────▶   │ FastAPI (backend_api)│
│ (Hero, Chat) │        JSON / multipart     │  RAG Orchestrator    │
└─────┬────────┘                             └───────┬──────────────┘
      │ Web API (app/api/*)                           │
      │                                               │
      ▼                                               ▼
 Frontend API Routes                        PDF → Text (pypdf)
  /api/upload                               Text Split (LangChain)
  /api/chat                               Embeddings (Vertex AI)
                                           Vectors → FAISS index
                                           Similarity Search
                                           Gemini LLM answer
```
Alternative prototypes:
- `backend_api.py` (FastAPI)
- `streamlit_app.py` (manual / exploratory UI)
- `app.py` standalone CLI RAG loop

---
## 🗂 Repository Layout (Key Paths)
- `doc-qa-app/` Python RAG & service code
  - `app.py` end‑to‑end CLI RAG script
  - `backend_api.py` FastAPI service
  - `streamlit_app.py` prototype UI
  - `sample.pdf` demo document
- `docspotlight-frontend/` Next.js application
  - `app/components/{Sidebar,Hero}.tsx`
  - `app/api/{upload,chat}/route.ts` proxy/API routes
  - `app/globals.css` custom fonts & global styles
  - `public/fonts/` local font assets

---
## 🔧 Tech Stack
**Frontend:**
- Next.js 14 (App Router) with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Custom typography (FK Grotesk & PP Editorial)

**Backend:**
- Python 3.10+ with FastAPI
- LangChain for document processing
- Google Vertex AI Embeddings
- Gemini LLM (langchain-google-genai)
- FAISS vector similarity search
- Streamlit (prototype UI)

**Infrastructure & Utilities:**
- Google Cloud Platform (Vertex AI)
- python-dotenv for environment management
- google-auth & google-cloud-aiplatform
- pypdf for PDF text extraction

---
## ✅ Prerequisites
- Node.js 18+
- Python 3.10+
- Google Cloud project with Vertex AI enabled
- API key / service account authentication

---
## 🔐 Environment Variables
Create `.env` files (never commit them). Examples:

`doc-qa-app/.env`:
```
GOOGLE_API_KEY=your_gemini_api_key
# (Or rely on ADC / gcloud auth application-default login)
```
`docspotlight-frontend/.env.local` (if needed for direct backend URL):
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```
Authentication options:
1. Application Default Credentials (`gcloud auth application-default login`) plus proper IAM roles
2. Explicit `GOOGLE_API_KEY` for Gemini (langchain-google-genai)

---
## 🏗 Local Setup
### 1. Backend (Python)
```bash
cd doc-qa-app
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements.txt
# (Ensure gcloud credentials or set GOOGLE_API_KEY)
python app.py  # run standalone RAG demo
```
Run FastAPI service:
```bash
uvicorn backend_api:app --reload --port 8000
```
### 2. Frontend (Next.js)
```bash
cd docspotlight-frontend
npm install
npm run dev
# Visit http://localhost:3000
```
Frontend API routes can either:
- Directly perform upload + chat logic (current placeholder) OR
- Proxy to FastAPI (`NEXT_PUBLIC_BACKEND_URL`)

---
## 💬 Usage Flow (Web UI)
1. Open the app – landing hero invites PDF upload
2. Click + (or drag & drop) a PDF → upload modal → file processed
3. After processing, quick suggestion buttons appear
4. Ask free‑form questions; answers stream in chat style
5. Start a new chat via sidebar; previous chats persisted in session state

---
## 🧪 Testing Ideas (Manual)
- Upload small vs large PDF; verify chunk count log (backend)
- Ask factual vs out‑of‑scope questions (LLM should decline when unknown)
- Mobile viewport (≤425px): sidebar hidden until hamburger
- Accessibility: tab through input & buttons, focus states visible

---
## 🗺 Roadmap
- Persist chat sessions (DB / vector store persistence)
- Multi‑document workspace support
- Streaming token responses (Server Sent Events)
- Auth / user accounts
- Shareable chat links
- Citation highlighting (source chunk mapping)
- Evaluation harness (retrieval quality metrics)

---
## 🤝 Contributing
1. Fork & branch (`feat/<name>`)
2. Follow conventional commits (e.g., `feat:`, `fix:`, `docs:`)
3. PR with concise description & screenshots for UI changes

---
## 🧾 License
Add an OSS license (e.g., MIT) at project root (`LICENSE`).

---
## 🙏 Acknowledgements
- Google Vertex AI & Gemini
- LangChain ecosystem
- FAISS similarity search
- Next.js & Vercel tooling

---
## 📬 Support
Issues & feature requests: open a GitHub Issue.

---
Happy querying!  
DocSpotlight Team
