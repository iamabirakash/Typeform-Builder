import os
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_access_token, create_oauth_state, current_creator, hash_password, verify_oauth_state, verify_password
from .database import get_db
from .models import Creator
from .schemas import AuthResponse, CreatorOut, LoginRequest, SignupRequest

router = APIRouter(prefix="/api/auth")

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.scalar(select(Creator).where(Creator.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    creator = Creator(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), auth_provider="password")
    db.add(creator)
    db.commit()
    db.refresh(creator)
    return AuthResponse(access_token=create_access_token(creator.id), creator=creator)

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    creator = db.scalar(select(Creator).where(Creator.email == payload.email.strip().lower()))
    if creator is None or not verify_password(payload.password, creator.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return AuthResponse(access_token=create_access_token(creator.id), creator=creator)

@router.get("/me", response_model=CreatorOut)
def me(creator: Creator = Depends(current_creator)):
    return creator

@router.get("/google/start")
def google_start():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    query = urlencode({"client_id": client_id, "redirect_uri": redirect_uri, "response_type": "code", "scope": "openid email profile", "access_type": "offline", "state": create_oauth_state()})
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")

@router.get("/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    if not verify_oauth_state(state):
        raise HTTPException(status_code=400, detail="Invalid Google sign-in state")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    async with httpx.AsyncClient(timeout=15) as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data={"code": code, "client_id": client_id, "client_secret": client_secret, "redirect_uri": redirect_uri, "grant_type": "authorization_code"})
        if token_response.status_code >= 400:
            raise HTTPException(status_code=400, detail="Google sign-in could not be completed")
        access_token = token_response.json().get("access_token")
        profile_response = await client.get("https://openidconnect.googleapis.com/v1/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        if profile_response.status_code >= 400:
            raise HTTPException(status_code=400, detail="Google profile could not be loaded")
    profile = profile_response.json()
    google_sub = profile.get("sub")
    email = (profile.get("email") or "").lower()
    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Google did not provide a usable profile")
    creator = db.scalar(select(Creator).where(Creator.google_sub == google_sub)) or db.scalar(select(Creator).where(Creator.email == email))
    if creator is None:
        creator = Creator(name=profile.get("name") or email.split("@")[0], email=email, auth_provider="google", google_sub=google_sub)
        db.add(creator)
    else:
        creator.google_sub = google_sub
        creator.auth_provider = "google"
    db.commit()
    return RedirectResponse(f"{frontend_url}/auth?token={create_access_token(creator.id)}")
