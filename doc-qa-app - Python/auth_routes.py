"""
Authentication API routes for DocSpotlight.
Handles user registration, login, logout, and profile management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from models import User, UserSession
from database import get_async_db
from auth import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, get_current_active_user, authenticate_user,
    validate_password, is_valid_email, create_user_session,
    is_allowed_email_domain, validate_required_fields
)
from datetime import datetime, timedelta
from typing import Optional
import uuid
import os
import resend

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Pydantic models for request/response
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str  # Required field
    last_name: str   # Required field

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

class UserResponse(BaseModel):
    user_id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Email service functions
resend.api_key = "re_jFqGbL1p_4rZhZAYpECU1XfBfifAbBBtg"

def send_password_reset_email(email: str, first_name: str, reset_token: str):
    """Send password reset email using Resend."""
    
    reset_url = f"http://localhost:3001/auth/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 DocSpotlight Password Reset</h1>
            </div>
            <div class="content">
                <h2>Hello {first_name}!</h2>
                <p>We received a request to reset your password for your DocSpotlight account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                <p>If you didn't request this password reset, you can safely ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 14px; color: #666;">
                    If the button doesn't work, copy and paste this link in your browser:<br>
                    <a href="{reset_url}" style="color: #667eea;">{reset_url}</a>
                </p>
            </div>
            <div class="footer">
                <p>This email was sent by DocSpotlight. If you have questions, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    DocSpotlight Password Reset
    
    Hello {first_name}!
    
    We received a request to reset your password for your DocSpotlight account.
    
    Please click on the following link to reset your password:
    {reset_url}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, you can safely ignore this email.
    
    ---
    This email was sent by DocSpotlight.
    """
    
    try:
        email_data = {
            "from": "DocSpotlight <onboarding@resend.dev>",
            "to": [email],
            "subject": "🔐 Reset Your DocSpotlight Password",
            "html": html_content,
            "text": text_content
        }
        response = resend.Emails.send(email_data)
        print(f"[Email] Password reset email sent successfully to {email}. Response: {response}")
        return response
    except Exception as e:
        print(f"[Email] Failed to send password reset email to {email}: {e}")
        raise e

# Authentication endpoints
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister, 
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Register a new user account."""
    
    # Validate required fields
    is_valid_req, req_message = validate_required_fields(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password=user_data.password
    )
    if not is_valid_req:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=req_message
        )
    
    # Validate email format
    if not is_valid_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate email domain restriction
    if not is_allowed_email_domain(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be from gmail.com domain"
        )
    
    # Validate password strength
    is_valid, message = validate_password(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email, db)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email.lower(),
        password_hash=hashed_password,
        first_name=user_data.first_name.strip(),
        last_name=user_data.last_name.strip(),
        is_active=True,
        is_verified=False  # Email verification can be added later
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    print(f"[Auth] New user registered: {new_user.email}")
    
    return UserResponse(
        user_id=str(new_user.user_id),
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        is_active=new_user.is_active,
        is_verified=new_user.is_verified,
        created_at=new_user.created_at
    )

@router.post("/login", response_model=TokenResponse)
async def login_user(
    user_data: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Authenticate user and return access tokens."""
    
    # Validate required fields
    is_valid_req, req_message = validate_required_fields(
        email=user_data.email,
        password=user_data.password
    )
    if not is_valid_req:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=req_message
        )
    
    # Validate email domain restriction
    if not is_allowed_email_domain(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be from gmail.com domain"
        )
    
    # Authenticate user
    user = await authenticate_user(user_data.email.lower(), user_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    
    # Create access and refresh tokens
    access_token = create_access_token(data={"sub": str(user.user_id)})
    refresh_token = create_refresh_token(data={"sub": str(user.user_id)})
    
    # Create session record
    client_ip = getattr(request.client, 'host', None) if request.client else None
    user_agent = request.headers.get('user-agent', None)
    
    await create_user_session(
        user=user,
        access_token=access_token,
        refresh_token=refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
        db=db
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()
    
    print(f"[Auth] User logged in: {user.email}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=1800,  # 30 minutes
        user={
            "user_id": str(user.user_id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_verified": user.is_verified
        }
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current authenticated user information."""
    return UserResponse(
        user_id=str(current_user.user_id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Update current user profile information."""
    
    # Update user information
    if user_update.first_name is not None:
        current_user.first_name = user_update.first_name
    if user_update.last_name is not None:
        current_user.last_name = user_update.last_name
    
    current_user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(current_user)
    
    print(f"[Auth] User profile updated: {current_user.email}")
    
    return UserResponse(
        user_id=str(current_user.user_id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at
    )

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Change user password."""
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    is_valid, message = validate_password(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    print(f"[Auth] Password changed for user: {current_user.email}")
    
    return {"message": "Password updated successfully"}

@router.post("/logout")
async def logout_user(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Logout user by invalidating current session."""
    
    # In a more sophisticated implementation, we would:
    # 1. Track the current token
    # 2. Add it to a blacklist
    # 3. Or invalidate specific sessions
    
    # For now, we'll just return success
    # Client should remove the token from storage
    
    print(f"[Auth] User logged out: {current_user.email}")
    
    return {"message": "Successfully logged out"}

# Password recovery endpoints
@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Send password reset email to user."""
    
    # Validate email domain restriction
    if not is_allowed_email_domain(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be from gmail.com domain"
        )
    
    # Find user by email
    result = await db.execute(select(User).where(User.email == request.email.lower()))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a password reset link has been sent"}
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive"
        )
    
    # Generate reset token (valid for 1 hour)
    reset_token = create_access_token(
        data={"sub": str(user.user_id), "purpose": "reset"}, 
        expires_delta=timedelta(hours=1)
    )
    
    # Send email using Resend
    try:
        send_password_reset_email(user.email, user.first_name, reset_token)
        print(f"[Auth] Password reset email sent to: {user.email}")
    except Exception as e:
        print(f"[Auth] Failed to send password reset email to {user.email}: {e}")
        # Don't reveal the error to the user for security
    
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Reset user password using reset token."""
    
    try:
        # Verify the reset token
        from auth import verify_token
        payload = verify_token(request.token)
        user_id = payload.get("sub")
        purpose = payload.get("purpose")
        
        if not user_id or purpose != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Find user
        result = await db.execute(select(User).where(User.user_id == uuid.UUID(user_id)))
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Validate new password
        is_valid, message = validate_password(request.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Update password
        user.password_hash = get_password_hash(request.new_password)
        user.updated_at = datetime.utcnow()
        
        await db.commit()
        
        print(f"[Auth] Password reset successful for user: {user.email}")
        
        return {"message": "Password reset successful"}
        
    except Exception as e:
        print(f"[Auth] Password reset failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

# Helper function to get user by email (used in auth.py)
async def get_user_by_email(email: str, db: AsyncSession) -> Optional[User]:
    """Get user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()

# Health check for auth service
@router.get("/health")
async def auth_health():
    """Health check for authentication service."""
    return {
        "status": "ok",
        "service": "authentication",
        "timestamp": datetime.utcnow().isoformat()
    }
