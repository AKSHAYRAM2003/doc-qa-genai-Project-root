"""
Storage manager for handling both local and cloud storage.
Switches between local filesystem (development) and Google Cloud Storage (production).
"""

import os
import tempfile
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import datetime
import json

try:
    from google.cloud import storage
    CLOUD_STORAGE_AVAILABLE = True
except ImportError:
    CLOUD_STORAGE_AVAILABLE = False

def is_production():
    """Check if running in production environment."""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"

class StorageManager:
    """Manages file storage for both local development and cloud production."""
    
    def __init__(self):
        self.storage_bucket = os.getenv("STORAGE_BUCKET")
        self.use_cloud_storage = is_production() and CLOUD_STORAGE_AVAILABLE and self.storage_bucket
        
        if self.use_cloud_storage:
            self.client = storage.Client()
            self.bucket = self.client.bucket(self.storage_bucket)
            print(f"[Storage] Using Cloud Storage bucket: {self.storage_bucket}")
        else:
            # Use local storage
            self.local_storage_path = Path("storage")
            self.local_uploads_path = Path("uploads")
            self.local_storage_path.mkdir(exist_ok=True)
            self.local_uploads_path.mkdir(exist_ok=True)
            print(f"[Storage] Using local filesystem storage")
    
    def save_pdf_file(self, file_content: bytes, filename: str) -> str:
        """
        Save PDF file and return the storage path/URL.
        
        Args:
            file_content: Binary content of the PDF file
            filename: Name of the file to save
            
        Returns:
            Storage path or URL for the saved file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{filename.replace(' ', '_')}"
        
        if self.use_cloud_storage:
            # Save to Cloud Storage
            blob_name = f"uploads/{safe_filename}"
            blob = self.bucket.blob(blob_name)
            blob.upload_from_string(file_content, content_type='application/pdf')
            
            # Return the blob name for later retrieval
            return blob_name
        else:
            # Save to local filesystem
            file_path = self.local_uploads_path / safe_filename
            with open(file_path, 'wb') as f:
                f.write(file_content)
            return str(file_path)
    
    def get_pdf_file(self, storage_path: str) -> bytes:
        """
        Retrieve PDF file content from storage.
        
        Args:
            storage_path: Path or blob name of the file
            
        Returns:
            Binary content of the PDF file
        """
        if self.use_cloud_storage:
            # Download from Cloud Storage
            blob = self.bucket.blob(storage_path)
            return blob.download_as_bytes()
        else:
            # Read from local filesystem
            with open(storage_path, 'rb') as f:
                return f.read()
    
    def create_temp_file(self, file_content: bytes, suffix: str = ".pdf") -> str:
        """
        Create a temporary file for processing.
        
        Args:
            file_content: Binary content to write to temp file
            suffix: File extension/suffix
            
        Returns:
            Path to the temporary file
        """
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(file_content)
        temp_file.close()
        return temp_file.name
    
    def cleanup_temp_file(self, temp_path: str):
        """Remove temporary file."""
        try:
            os.unlink(temp_path)
        except Exception as e:
            print(f"[Storage] Warning: Could not delete temp file {temp_path}: {e}")
    
    def save_json_data(self, data: dict, filename: str):
        """
        Save JSON data to storage.
        
        Args:
            data: Dictionary to save as JSON
            filename: Name of the JSON file
        """
        json_content = json.dumps(data, indent=2, default=str)
        
        if self.use_cloud_storage:
            # Save to Cloud Storage
            blob_name = f"data/{filename}"
            blob = self.bucket.blob(blob_name)
            blob.upload_from_string(json_content, content_type='application/json')
        else:
            # Save to local filesystem
            file_path = self.local_storage_path / filename
            with open(file_path, 'w') as f:
                f.write(json_content)
    
    def load_json_data(self, filename: str) -> dict:
        """
        Load JSON data from storage.
        
        Args:
            filename: Name of the JSON file
            
        Returns:
            Dictionary loaded from JSON
        """
        try:
            if self.use_cloud_storage:
                # Load from Cloud Storage
                blob_name = f"data/{filename}"
                blob = self.bucket.blob(blob_name)
                if blob.exists():
                    json_content = blob.download_as_text()
                    return json.loads(json_content)
                return {}
            else:
                # Load from local filesystem
                file_path = self.local_storage_path / filename
                if file_path.exists():
                    with open(file_path, 'r') as f:
                        return json.load(f)
                return {}
        except Exception as e:
            print(f"[Storage] Error loading JSON data from {filename}: {e}")
            return {}
    
    def file_exists(self, storage_path: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            storage_path: Path or blob name to check
            
        Returns:
            True if file exists, False otherwise
        """
        if self.use_cloud_storage:
            blob = self.bucket.blob(storage_path)
            return blob.exists()
        else:
            return Path(storage_path).exists()
    
    def get_storage_info(self) -> dict:
        """Get information about the current storage configuration."""
        return {
            "storage_type": "cloud" if self.use_cloud_storage else "local",
            "bucket_name": self.storage_bucket if self.use_cloud_storage else None,
            "local_path": str(self.local_storage_path) if not self.use_cloud_storage else None,
            "environment": os.getenv("ENVIRONMENT", "development"),
            "cloud_storage_available": CLOUD_STORAGE_AVAILABLE
        }

# Global storage manager instance
storage_manager = StorageManager()
