import os
import logging
import numpy as np
import tensorflow as tf
from PIL import Image
from typing import List, Tuple
import io
from utils.preprocess_image import preprocess_image_for_model
from utils.string_utils import clean_class_name
from .model_init_functions import load_model

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WasteClassificationModel:
    # Setup the model with path to .keras file.
    def __init__(self, model_path: str = None):
        if model_path is None:
            current_dir = os.path.dirname(__file__)  # services/model_handling/
            services_dir = os.path.dirname(current_dir)  # services/
            app_dir = os.path.dirname(services_dir)
            model_path = os.path.join(app_dir, "static", "ConvNeXtTiny.keras")
        
        self.model_path = model_path

        self.model = None  
        self.class_names = self._get_class_names() 
        self.input_size = (224, 224) 
                
        # Load model on initialization  
        self.model = load_model(self.model_path)
    
    def _get_class_names(self) -> List[str]:
        """Used to be 30 classes but"""
        return [
            'aerosol_cans', 'cardboard', 'clothing', 'coffee_grounds',
            'disposable_cups', 'disposable_plastic_cutlery', 'eggshells',
            'food_waste', 'glass_containers', 'magazines', 'metal_cans',
            'newspaper', 'office_paper', 'plastic_beverage_bottles',
            'plastic_cup_lids', 'plastic_detergent_bottles',
            'plastic_food_containers', 'plastic_shopping_bags',
            'plastic_straws', 'plastic_trash_bags', 'shoes',
            'styrofoam_food_containers', 'tea_bags',
        ]
    
    def predict(self, image_bytes: bytes) -> Tuple[List[str], List[float]]:
        """
        Make prediction on the input image.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Tuple of (class_names, probabilities) sorted by confidence
        """
        try:
            if self.model is None:
                raise RuntimeError("Model not loaded")
            
            # Preprocess the image
            processed_image = preprocess_image_for_model(image_bytes, self.input_size)

            # Make prediction
            predictions = self.model.predict(processed_image, verbose=0)
            probabilities = predictions[0]  # Remove batch dimension
            
            # Get top predictions sorted by confidence
            sorted_indices = np.argsort(probabilities)[::-1]
            sorted_classes = [self.class_names[i] for i in sorted_indices]
            sorted_probs = [float(probabilities[i]) * 100 for i in sorted_indices]  # Convert to percentages
            
            return sorted_classes, sorted_probs
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise
    
    # Formats prediction return with top 3 classes.
    def get_top_predictions(self, image_bytes: bytes, top_k: int = 3) -> List[dict]:
        classes, probabilities = self.predict(image_bytes)
        
        predictions = []
        
        for i in range(min(top_k, len(classes))):
            predictions.append({
                "label": clean_class_name(classes[i]),
                "prob": round(probabilities[i], 1),
            })
        
        return predictions

# Global model instance
_model_instance = None

def get_model_instance() -> WasteClassificationModel:
    """Get or create the global model instance."""
    global _model_instance
    if _model_instance is None:
        _model_instance = WasteClassificationModel()
    return _model_instance