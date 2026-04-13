import os
import gdown
import logging
import tensorflow as tf

logger = logging.getLogger(__name__)

# Dowload model from google drive link.
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

# Load keras model to be used in handler.
def load_model(model_path: str):
    """
    Download (if needed) and load the Keras model.
    
    Args:
        model_path: Path to the model file
        
    Returns:
        Loaded TensorFlow/Keras model
    """
    try:
        # Download model if it doesn't exist
        if not download_model(model_path):
            raise FileNotFoundError(f"Failed to download or find model at {model_path}")
        
        model = tf.keras.models.load_model(model_path)
        
        # Log model details
        logger.info(f"Model input shape: {model.input_shape}")
        logger.info(f"Model output shape: {model.output_shape}")
        
        return model
        
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise