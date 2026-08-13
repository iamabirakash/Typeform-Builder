import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import load_local_env

load_local_env()

from .database import init_db
from .routes_forms import router as forms_router
from .routes_auth import router as auth_router
from .routes_public import router as public_router
from .routes_results import router as results_router

app = FastAPI(title="Typeform Clone API", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
app.include_router(forms_router)
app.include_router(auth_router)
app.include_router(public_router)
app.include_router(results_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
