from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routes_forms import router as forms_router

app = FastAPI(title="Typeform Clone API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
app.include_router(forms_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
