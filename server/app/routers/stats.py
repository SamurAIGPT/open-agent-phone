from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import PhoneNumber, VoiceCall, SmsMessage
from app.schemas import StatsResponse
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/v1/stats", tags=["Stats"])

@router.get("", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Total Phone Numbers
    num_res = await db.execute(select(func.count(PhoneNumber.id)).where(PhoneNumber.status == "active"))
    total_numbers = num_res.scalar() or 0

    # Total & Active Calls
    calls_res = await db.execute(select(func.count(VoiceCall.id)))
    total_calls = calls_res.scalar() or 0

    active_calls_res = await db.execute(select(func.count(VoiceCall.id)).where(VoiceCall.status.in_(["ringing", "in_progress"])))
    active_calls = active_calls_res.scalar() or 0

    # Total SMS & OTP codes
    sms_res = await db.execute(select(func.count(SmsMessage.id)))
    total_sms = sms_res.scalar() or 0

    codes_res = await db.execute(select(func.count(SmsMessage.id)).where(SmsMessage.verification_code.isnot(None)))
    codes_extracted = codes_res.scalar() or 0

    return StatsResponse(
        total_phone_numbers=total_numbers,
        total_calls=total_calls,
        active_calls=active_calls,
        total_sms=total_sms,
        codes_extracted=codes_extracted,
        active_websockets=len(ws_manager.broadcast_connections)
    )
