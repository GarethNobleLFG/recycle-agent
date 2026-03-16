import os
import hashlib
import random
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

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


class TopPrediction(BaseModel):
    label: str
    prob: float = Field(ge=0, le=100)
    color: str


class ClassificationStats(BaseModel):
    carbon: str
    water: str
    energy: str


class ClassificationResponse(BaseModel):
    result: str
    confidence: float = Field(ge=0, le=100)
    material: str
    top3: list[TopPrediction]
    stats: ClassificationStats


def _deterministic_classify(image_bytes: bytes) -> ClassificationResponse:
    digest = hashlib.sha256(image_bytes).hexdigest()
    rng = random.Random(int(digest[:16], 16))

    # Keep labels aligned with what the current UI expects.
    label_pool = [
        ("PET Plastic", "High-Density Polyethylene", "RECYCLE"),
        ("HDPE Plastic", "High-Density Polyethylene", "RECYCLE"),
        ("Mixed Glass", "Mixed Glass", "RECYCLE"),
        ("Aluminum", "Aluminum", "RECYCLE"),
        ("Cardboard", "Corrugated Cardboard", "RECYCLE"),
        ("Paper", "Mixed Paper", "RECYCLE"),
        ("Organic", "Food / Organic Waste", "COMPOST"),
        ("Landfill", "General Waste", "TRASH"),
    ]

    # Pick a primary label, then pick two distinct alternates.
    primary_idx = rng.randrange(len(label_pool))
    primary_label, primary_material, primary_result = label_pool[primary_idx]
    alt_indices = [i for i in range(len(label_pool)) if i != primary_idx]
    rng.shuffle(alt_indices)
    alt1_label, _, _ = label_pool[alt_indices[0]]
    alt2_label, _, _ = label_pool[alt_indices[1]]

    # Generate three probabilities that sum to 100.
    primary_prob = round(rng.uniform(84.0, 99.4), 1)
    remaining = 100.0 - primary_prob
    alt1_prob = round(rng.uniform(0.2, max(0.2, remaining - 0.2)), 1)
    alt2_prob = round(max(0.0, 100.0 - primary_prob - alt1_prob), 1)

    # Match colors already used by the UI.
    top3 = [
        TopPrediction(label=primary_label, prob=primary_prob, color="bg-emerald-500"),
        TopPrediction(label=alt1_label, prob=alt1_prob, color="bg-blue-500"),
        TopPrediction(label=alt2_label, prob=alt2_prob, color="bg-zinc-600"),
    ]

    # Derive a stable confidence number from the primary prob.
    confidence = primary_prob

    # Placeholder impact stats (deterministic ranges).
    carbon = f"{round(rng.uniform(0.4, 3.8), 1)}kg"
    water = f"{int(rng.uniform(3, 28))}L"
    energy = f"{round(rng.uniform(0.6, 6.5), 1)}kWh"

    return ClassificationResponse(
        result=primary_result,
        confidence=confidence,
        material=primary_material,
        top3=top3,
        stats=ClassificationStats(carbon=carbon, water=water, energy=energy),
    )


@app.post("/api/classify", response_model=ClassificationResponse)
async def classify(file: UploadFile = File(...), zip: str | None = Form(default=None)):
    # `zip` is accepted for future location-specific enrichment; not required yet.
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Please upload an image file.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty upload.")

    return _deterministic_classify(image_bytes)

