import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1.classify_image import router as classify_router
from api.v1.zipcode_rules import router as zipcode_rules_router

# Load .env from the project root (two levels up from backend/app/)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

app = FastAPI(title="RecycleAgent API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "RecycleAgent API is running!"}

# Include the classification API routes
app.include_router(classify_router, prefix="/v1", tags=["classification"])
app.include_router(zipcode_rules_router, prefix="/v1", tags=["zipcode-rules"])