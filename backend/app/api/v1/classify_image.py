from fastapi import APIRouter, File, UploadFile, HTTPException
from ...services.classify_image import classify_image

router = APIRouter()

@router.post("/classify")
async def classify_waste_image(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Please upload an image file.")
    
    try:
        result = await classify_image(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))