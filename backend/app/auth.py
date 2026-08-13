import hashlib
import hmac
import os
import secrets
import base64
import json
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Creator

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-development-secret")
JWT_ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210_000)
    return f"pbkdf2_sha256$210000${salt.hex()}${digest.hex()}"

def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded or "$" not in encoded:
        return False
    _, iterations, salt_hex, digest_hex = encoded.split("$", 3)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
    return hmac.compare_digest(candidate.hex(), digest_hex)

def create_access_token(creator_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": str(creator_id), "exp": expires}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def current_creator(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Creator:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        creator_id = int(payload.get("sub", ""))
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_error
    creator = db.get(Creator, creator_id)
    if creator is None:
        raise credentials_error
    return creator

def create_oauth_state() -> str:
    payload = {"nonce": secrets.token_urlsafe(24), "exp": int((datetime.now(timezone.utc) + timedelta(minutes=10)).timestamp())}
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature = hmac.new(JWT_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"

def verify_oauth_state(state: str) -> bool:
    try:
        encoded, signature = state.split(".", 1)
        expected = hmac.new(JWT_SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        return hmac.compare_digest(signature, expected) and int(payload["exp"]) > int(datetime.now(timezone.utc).timestamp())
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return False
