import io
import logging
import numpy as np
from PIL import Image
from typing import Tuple

logger = logging.getLogger(__name__)

def preprocess_image_for_model(image_bytes: bytes, input_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """
    Preprocess the input image for model prediction.
    
    Args:
        image_bytes: Raw image bytes
        input_size: Target size for the image (width, height)
        
    Returns:
        Preprocessed image array ready for model prediction, shape (1, H, W, 3)
    """
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed (handles RGBA, grayscale, palette images)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize to model input size
        image = image.resize(input_size, Image.Resampling.LANCZOS)
        
        # Convert to numpy array as float32 — keep raw 0-255 range
        # ConvNeXt's internal preprocessing layer handles normalization.
        image_array = np.array(image, dtype=np.float32)
        
        # Add batch dimension: (H, W, 3) → (1, H, W, 3)
        image_array = np.expand_dims(image_array, axis=0)
        
        return image_array
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise