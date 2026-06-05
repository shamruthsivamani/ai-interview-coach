import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.interview import router as interview_router

app = FastAPI(title="AI Interview Coach API")

frontend_url = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router)


@app.get("/")
def root():
    return {"message": "AI Interview Coach API running"}
