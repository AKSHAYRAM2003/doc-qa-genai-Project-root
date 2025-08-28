"""
Database models for DocSpotlight authentication and user management.
This extends the existing in-memory storage with user-aware persistence.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, BigInteger, UUID, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID as PostgreSQL_UUID
import uuid

Base = declarative_base()

class User(Base):
    """User model for authentication and user management."""
    __tablename__ = "users"
    
    user_id = Column(PostgreSQL_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    """User session management for JWT tokens."""
    __tablename__ = "user_sessions"
    
    session_id = Column(PostgreSQL_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    ip_address = Column(String(45))
    user_agent = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Relationship
    user = relationship("User", back_populates="sessions")

class Chat(Base):
    """Chat sessions associated with users."""
    __tablename__ = "chats"
    
    chat_id = Column(PostgreSQL_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    title = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_activity = Column(DateTime, default=func.now())
    message_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    chat_documents = relationship("ChatDocument", back_populates="chat", cascade="all, delete-orphan")

class Message(Base):
    """Individual messages within chats."""
    __tablename__ = "messages"
    
    message_id = Column(PostgreSQL_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("chats.chat_id"), nullable=False)
    user_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    message_type = Column(String(10), nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    timestamp_created = Column(DateTime, default=func.now())
    order_index = Column(Integer, nullable=False)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")
    user = relationship("User")

class Document(Base):
    """Documents uploaded by users (extends existing DOC_METADATA)."""
    __tablename__ = "documents"
    
    doc_id = Column(String(255), primary_key=True)  # Keep string to match existing doc_ids
    user_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    pages = Column(Integer)
    upload_time = Column(DateTime, default=func.now())
    status = Column(String(20), default='processing')  # 'processing', 'ready', 'failed'
    
    # Relationships
    user = relationship("User", back_populates="documents")
    chat_documents = relationship("ChatDocument", back_populates="document", cascade="all, delete-orphan")

class ChatDocument(Base):
    """Association between chats and documents."""
    __tablename__ = "chat_documents"
    
    id = Column(PostgreSQL_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("chats.chat_id"), nullable=False)
    doc_id = Column(String(255), ForeignKey("documents.doc_id"), nullable=False)
    added_at = Column(DateTime, default=func.now())
    
    # Relationships
    chat = relationship("Chat", back_populates="chat_documents")
    document = relationship("Document", back_populates="chat_documents")
    
    # Ensure unique chat-document pairs
    __table_args__ = (
        {'schema': None},  # Default schema
    )

# Additional metadata tables for extending existing functionality
class DocumentChunk(Base):
    """Store document chunks in database (future enhancement)."""
    __tablename__ = "document_chunks"
    
    chunk_id = Column(PostgreSQL_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doc_id = Column(String(255), ForeignKey("documents.doc_id"), nullable=False)
    user_id = Column(PostgreSQL_UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    document = relationship("Document")
    user = relationship("User")
