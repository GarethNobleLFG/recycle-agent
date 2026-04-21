import os
from google import genai

def get_recycling_rules_by_zip(zip_code: str, material: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Google Gemini API key not set in environment variable GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    prompt = (
        f"In one sentence, tell me how to properly recycle or dispose of '{material}' "
        f"for a resident of zip code {zip_code} in the United States."
    )
    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    return response.text.strip()
