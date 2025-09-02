"""
Enhanced persistent storage utilities for DocSpotlight.
Provides additional helper functions for managing document persistence.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

STORAGE_DIR = Path("storage")
STORAGE_DIR.mkdir(exist_ok=True)

def get_storage_stats():
    """Get statistics about stored data."""
    stats = {
        "storage_dir": str(STORAGE_DIR),
        "files": {},
        "total_size_bytes": 0,
        "last_modified": {}
    }
    
    files_to_check = [
        "doc_metadata.json",
        "doc_files.json", 
        "doc_chunks.json"
    ]
    
    for filename in files_to_check:
        file_path = STORAGE_DIR / filename
        if file_path.exists():
            stat = file_path.stat()
            stats["files"][filename] = {
                "exists": True,
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
            stats["total_size_bytes"] += stat.st_size
            stats["last_modified"][filename] = stat.st_mtime
        else:
            stats["files"][filename] = {"exists": False}
    
    return stats

def cleanup_orphaned_files():
    """Clean up PDF files that no longer have metadata entries."""
    metadata_file = STORAGE_DIR / "doc_metadata.json"
    files_file = STORAGE_DIR / "doc_files.json"
    
    if not (metadata_file.exists() and files_file.exists()):
        print("[Cleanup] Storage files not found, nothing to clean")
        return
    
    try:
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        with open(files_file, 'r') as f:
            files = json.load(f)
        
        # Find orphaned files
        valid_doc_ids = set(metadata.keys())
        file_doc_ids = set(files.keys())
        
        orphaned_ids = file_doc_ids - valid_doc_ids
        
        if orphaned_ids:
            print(f"[Cleanup] Found {len(orphaned_ids)} orphaned files")
            
            for doc_id in orphaned_ids:
                file_path = files[doc_id]
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        print(f"[Cleanup] Removed orphaned file: {file_path}")
                    except Exception as e:
                        print(f"[Cleanup] Failed to remove {file_path}: {e}")
                
                # Remove from files tracking
                del files[doc_id]
            
            # Save updated files mapping
            with open(files_file, 'w') as f:
                json.dump(files, f)
            
            print(f"[Cleanup] Cleanup completed")
        else:
            print("[Cleanup] No orphaned files found")
    
    except Exception as e:
        print(f"[Cleanup] Cleanup failed: {e}")

def backup_storage():
    """Create backup of current storage files."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = STORAGE_DIR / f"backup_{timestamp}"
    backup_dir.mkdir(exist_ok=True)
    
    files_to_backup = [
        "doc_metadata.json",
        "doc_files.json", 
        "doc_chunks.json"
    ]
    
    backed_up = []
    
    for filename in files_to_backup:
        source = STORAGE_DIR / filename
        if source.exists():
            destination = backup_dir / filename
            try:
                import shutil
                shutil.copy2(source, destination)
                backed_up.append(filename)
            except Exception as e:
                print(f"[Backup] Failed to backup {filename}: {e}")
    
    if backed_up:
        print(f"[Backup] Created backup in {backup_dir}")
        print(f"[Backup] Backed up files: {', '.join(backed_up)}")
        return str(backup_dir)
    else:
        # Remove empty backup directory
        try:
            backup_dir.rmdir()
        except:
            pass
        print("[Backup] No files to backup")
        return None

def verify_storage_integrity():
    """Verify the integrity of stored data."""
    issues = []
    
    metadata_file = STORAGE_DIR / "doc_metadata.json"
    files_file = STORAGE_DIR / "doc_files.json"
    chunks_file = STORAGE_DIR / "doc_chunks.json"
    
    try:
        # Load all storage files
        metadata = {}
        files = {}
        chunks = {}
        
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        else:
            issues.append("doc_metadata.json not found")
        
        if files_file.exists():
            with open(files_file, 'r') as f:
                files = json.load(f)
        else:
            issues.append("doc_files.json not found")
        
        if chunks_file.exists():
            with open(chunks_file, 'r') as f:
                chunks = json.load(f)
        
        # Verify consistency
        metadata_ids = set(metadata.keys())
        files_ids = set(files.keys())
        chunks_ids = set(chunks.keys())
        
        # Check for missing file entries
        missing_files = metadata_ids - files_ids
        if missing_files:
            issues.append(f"Missing file entries for doc_ids: {list(missing_files)}")
        
        # Check for orphaned file entries
        orphaned_files = files_ids - metadata_ids
        if orphaned_files:
            issues.append(f"Orphaned file entries for doc_ids: {list(orphaned_files)}")
        
        # Check actual file existence
        missing_physical_files = []
        for doc_id, file_path in files.items():
            if not os.path.exists(file_path):
                missing_physical_files.append(f"{doc_id}: {file_path}")
        
        if missing_physical_files:
            issues.append(f"Missing physical files: {missing_physical_files}")
        
        # Summary
        if not issues:
            print("[Verify] ✅ Storage integrity check passed")
            print(f"[Verify] Documents: {len(metadata_ids)}")
            print(f"[Verify] Files tracked: {len(files_ids)}")
            print(f"[Verify] Chunks stored: {len(chunks_ids)}")
            return True
        else:
            print("[Verify] ❌ Storage integrity issues found:")
            for issue in issues:
                print(f"[Verify]   - {issue}")
            return False
    
    except Exception as e:
        print(f"[Verify] ❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    print("DocSpotlight Storage Utilities")
    print("=" * 40)
    
    print("\n📊 Storage Statistics:")
    stats = get_storage_stats()
    print(json.dumps(stats, indent=2))
    
    print("\n🔍 Verifying storage integrity:")
    verify_storage_integrity()
    
    print("\n🧹 Checking for cleanup needed:")
    cleanup_orphaned_files()
