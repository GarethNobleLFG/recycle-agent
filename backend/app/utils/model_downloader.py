import os
import gdown
import logging

logger = logging.getLogger(__name__)

def download_model(model_path: str) -> bool:
    """
    Download model from Google Drive using URL from environment variable.
    
    Args:
        model_path: Local path where model should be stored
        
    Returns:
        True if model is available (downloaded or already exists)
    """
    try:
        # Check if model already exists
        if os.path.exists(model_path):
            logger.info(f"Model already exists at {model_path}")
            return True
        
        # Get model URL from environment variable
        model_url = os.getenv("MODEL_DOWNLOAD_URL")
        if not model_url:
            logger.error("MODEL_DOWNLOAD_URL environment variable not set")
            return False
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
                
        gdown.download(model_url, model_path, quiet=False, fuzzy=True)
        
        if os.path.exists(model_path):
            logger.info("Model download completed successfully!")
            return True
        else:
            logger.error("Download completed but file not found")
            return False
            
    except Exception as e:
        logger.error(f"Error downloading model: {str(e)}")
        return False