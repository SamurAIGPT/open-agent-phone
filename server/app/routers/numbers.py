import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import PhoneNumber
from app.schemas import PhoneNumberCreate, PhoneNumberResponse

router = APIRouter(prefix="/v1/numbers", tags=["Phone Numbers"])

@router.get("", response_model=List[PhoneNumberResponse])
async def list_numbers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PhoneNumber).order_by(PhoneNumber.created_at.desc()))
    return result.scalars().all()

@router.post("", response_model=PhoneNumberResponse, status_code=201)
async def create_number(payload: PhoneNumberCreate, db: AsyncSession = Depends(get_db)):
    clean_num = payload.phone_number.strip()
    existing = await db.execute(select(PhoneNumber).where(PhoneNumber.phone_number == clean_num))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Phone number {clean_num} is already registered")

    num_id = f"num_{uuid.uuid4().hex[:12]}"
    new_num = PhoneNumber(
        id=num_id,
        phone_number=clean_num,
        agent_name=payload.agent_name.strip(),
        country=payload.country.upper(),
        capabilities='["voice", "sms"]',
        status="active",
        carrier=payload.carrier,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_num)
    await db.commit()
    await db.refresh(new_num)
    return new_num

@router.delete("/{number_id}", status_code=204)
async def delete_number(number_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PhoneNumber).where(PhoneNumber.id == number_id))
    num = res.scalar_one_or_none()
    if not num:
        raise HTTPException(status_code=404, detail="Phone number not found")

    await db.delete(num)
    await db.commit()
    return None
