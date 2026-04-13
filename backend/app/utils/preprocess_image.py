import io
import numpy as np
from PIL import Image, ImageFile
from typing import Tuple

# Allow loading of truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

def detect_image_format(image_bytes: bytes) -> str:
    if image_bytes.startswith(b'\x00\x00\x00\x1cftypavif'):
        return 'AVIF'
    elif image_bytes.startswith(b'\xFF\xD8\xFF'):
        return 'JPEG'
    elif image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'PNG'
    elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):
        return 'GIF'
    elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
        return 'WEBP'
    elif image_bytes.startswith(b'BM'):
        return 'BMP'
    else:
        return 'UNKNOWN'

def preprocess_image_for_model(image_bytes: bytes, input_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """
    Preprocess the input image for model prediction.
    """
    try:
        if len(image_bytes) == 0:
            raise ValueError("Empty image data received")
        
        detected_format = detect_image_format(image_bytes)
        if detected_format == 'AVIF':
            raise ValueError("AVIF format is not supported. Please upload a JPEG, PNG, or WEBP image instead.")
        
        # Try to open image from bytes
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode in ['RGBA', 'LA', 'P']:
            # Handle transparency by creating white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ['RGBA', 'LA'] else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize to model input size.
        image = image.resize(input_size, Image.Resampling.LANCZOS)
        
        # Convert to numpy array and normalize.
        image_array = np.array(image, dtype=np.float32) / 255.0
        
        # Add batch dimension.
        image_array = np.expand_dims(image_array, axis=0)
        
        return image_array
        
    except Exception as e:
        if "AVIF format is not supported" in str(e):
            raise e
        else:
            raise ValueError("Please upload a different image format (JPEG, PNG, or WEBP). This file type is not supported.")