def clean_class_name(class_name: str) -> str:
    """
    Convert class name to display-friendly format.
    Examples: 
        'plastic_water_bottles' -> 'Plastic Water Bottles'
        'aluminum_food_cans' -> 'Aluminum Food Cans'
    """
    return class_name.replace('_', ' ').title()