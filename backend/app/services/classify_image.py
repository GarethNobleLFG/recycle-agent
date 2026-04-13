import logging
from typing import Dict, Any
from fastapi import UploadFile
from .model_handling.model_handler import get_model_instance

logger = logging.getLogger(__name__)

async def classify_image(file: UploadFile) -> Dict[str, Any]:
    """
    Classify an uploaded image and return predictions.
    
    Args:
        file: Uploaded image file
        
    Returns:
        Dictionary with classification results
    """
    try:
        # Get model instance
        model = get_model_instance()
        
        # Read image bytes
        image_bytes = await file.read()
        
        if not image_bytes:
            raise ValueError("Empty image file")
        
        # Get predictions from model
        top_predictions = model.get_top_predictions(image_bytes, top_k=3)
        
        return {
            "predictions": top_predictions
        }
        
    except Exception as e:
        logger.error(f"Classification failed: {str(e)}")
        raise