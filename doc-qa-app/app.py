import pypdf
import sys
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_vertexai import VertexAIEmbeddings
import google.auth
from google.cloud import aiplatform




pdf_path = ("/Users/akshayram/Desktop/Projects/doc-qa-genai-Project-root/doc-qa-app/sample.pdf")
def extract_text_from_pdf(pdf_path):
    """Opens and reads the text from a PDF file."""
    print(f"Reading PDF file...{pdf_path}...")

    try:
        reader = pypdf.PdfReader(pdf_path)
        pdf_text=""
        for page in reader.pages:
            pdf_text+=page.extract_text()
        return pdf_text
    except FileNotFoundError:
        print(f"Error: The file at {pdf_path} was not found")
        sys.exit(1)

# text splitting code
def split_text_into_chunks(text):
    """Splits the input text into smaller chunks."""
    print("Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    return chunks


#Embedding code

def generate_embedings(chunks):
    """Generates embeddings for the given text chunks."""
    print("Generating embeddings for text chunks...")
     # Create an instance of the Google's embedding model
    embeddings = VertexAIEmbeddings(model_name="textembedding-gecko@001")
     # Generate embeddings for the documents
    vectors = embeddings.embed_documents(chunks)
    return vectors


# This is the main part of our application:
if __name__ == "__main__":
    # --- NEW AUTHENTICATION CODE ---
    try:
        credentials, project_id = google.auth.default()
        aiplatform.init(project=project_id, credentials=credentials)
    except Exception as e:
        print(f"Authentication failed: {e}")
        sys.exit(1)
    # -----------------------------

    pdf_file_path = "/Users/akshayram/Desktop/Projects/doc-qa-genai-Project-root/doc-qa-app/sample.pdf"

    #step1: extract text from pdf
    extracted_text = extract_text_from_pdf(pdf_file_path)
    print("successfully extracted text from PDF:")
    # print(extracted_text[:500])
    # print("total number of characters extracted:", len(extracted_text))

    #step2: split text into chunks
    text_chunks = split_text_into_chunks(extracted_text)
    print("successfully split text into chunks:")
    print(text_chunks[:2])
    # print(text_chunks)

    #step3: generate embeddings for the chunks
    embedding_vectors = generate_embedings(text_chunks)
    print("successfully generated embeddings for text chunks:")
    print(f"✅ Created {len(embedding_vectors)} vectors")
    print(f"Each vector has {len(embedding_vectors[0])} dimensions.")
    print("--- First vector (first 10 values) ---")
    print(embedding_vectors[0][:10])