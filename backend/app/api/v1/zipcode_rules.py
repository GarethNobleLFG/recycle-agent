from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.zipcode_rules import get_recycling_rules_by_zip

router = APIRouter()

class ZipCodeRequest(BaseModel):
    zip_code: str
    material: str

@router.post("/zipcode-rules")
async def zipcode_rules(req: ZipCodeRequest):
    try:
        rules = get_recycling_rules_by_zip(req.zip_code, req.material)
        return {"rules": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
