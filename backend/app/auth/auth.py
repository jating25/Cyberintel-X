import os
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, ValidationError

from app.database.models import User, UserInDB, TokenData, Token, UserRole
from app.database.db import Database, get_database
from app.config import settings
from app.app_logging import logger

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# JWT configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 days

class AuthError(Exception):
    """Base authentication error"""
    pass

class InvalidCredentialsError(AuthError):
    """Raised when invalid credentials are provided"""
    pass

class InactiveUserError(AuthError):
    """Raised when a user is inactive"""
    pass

class InsufficientPermissionsError(AuthError):
    """Raised when a user doesn't have sufficient permissions"""
    pass

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash"""
    return pwd_context.hash(password)

async def get_user(username: str, db=None) -> Optional[UserInDB]:
    """Get a user by username"""
    if db is None:
        db = await Database.get_database()
    
    user_data = await db["users"].find_one({"username": username})
    if user_data:
        return UserInDB(**user_data)
    return None

async def authenticate_user(username: str, password: str) -> UserInDB:
    """Authenticate a user with username and password"""
    user = await get_user(username)
    if not user:
        raise InvalidCredentialsError("Incorrect username or password")
    
    if not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Incorrect username or password")
    
    if not user.is_active:
        raise InactiveUserError("User is inactive")
    
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new refresh token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def create_tokens(username: str, user_id: str, roles: list) -> Dict[str, str]:
    """Create access and refresh tokens for a user"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPILE_DAYS)
    
    access_token = create_access_token(
        data={"sub": username, "user_id": user_id, "roles": roles},
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": username, "user_id": user_id},
        expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get the current user from a JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        
        # Check token type (should be access token)
        token_type = payload.get("type")
        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def has_role(required_roles: list[UserRole]):
    """Check if the current user has any of the required roles"""
    async def role_checker(current_user: UserInDB = Depends(get_current_active_user)):
        if not any(role in current_user.roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Role-based access control decorators
def admin_required():
    """Require admin role"""
    return has_role([UserRole.ADMIN])

def analyst_required():
    """Require analyst or admin role"""
    return has_role([UserRole.ANALYST, UserRole.ADMIN])

def viewer_required():
    """Require viewer, analyst, or admin role"""
    return has_role([UserRole.VIEWER, UserRole.ANALYST, UserRole.ADMIN])

# Token refresh
def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verify a refresh token and return the payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check token type (should be refresh token)
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def refresh_tokens(refresh_token: str) -> Dict[str, str]:
    """Refresh access and refresh tokens"""
    try:
        payload = verify_refresh_token(refresh_token)
        username = payload.get("sub")
        user_id = payload.get("user_id")
        
        if not username or not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get the user to check if they still exist and are active
        user = await get_user(username)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create new tokens
        return await create_tokens(username, user_id, user.roles)
    except Exception as e:
        logger.error(f"Error refreshing tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh tokens",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Password reset functionality
async def create_password_reset_token(email: str) -> str:
    """Create a password reset token"""
    expires = datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
    to_encode = {
        "sub": email,
        "exp": expires,
        "type": "password_reset"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)

async def verify_password_reset_token(token: str) -> str:
    """Verify a password reset token and return the email"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check token type
        if payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
        
        return email
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )

# Initial admin user creation
async def create_initial_admin():
    """Create an initial admin user if no users exist"""
    db = await Database.get_database()
    
    # Check if any users exist
    user_count = await db["users"].count_documents({})
    
    if user_count == 0 and settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
        # Create admin user
        admin_user = UserInDB(
            username="admin",
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            full_name="Administrator",
            is_active=True,
            is_superuser=True,
            roles=[UserRole.ADMIN],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Insert the admin user
        result = await db["users"].insert_one(admin_user.dict(exclude={"id"}))
        logger.info(f"Created initial admin user with ID: {result.inserted_id}")
    elif user_count == 0:
        logger.warning("No admin credentials provided. Please create an admin user manually.")
