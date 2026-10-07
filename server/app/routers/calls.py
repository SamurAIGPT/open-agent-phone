import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import PhoneNumber, VoiceCall, CarrierConfig
from app.schemas import VoiceCallInitiateRequest, VoiceCallResponse
from app.services.twilio_service import CarrierService
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/v1/calls", tags=["Voice Calls"])

@router.get("", response_model=List[VoiceCallResponse])
async def list_calls(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(VoiceCall)
    conditions = []
    if status:
        conditions.append(VoiceCall.status == status)
    if direction:
        conditions.append(VoiceCall.direction == direction)
    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(VoiceCall.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{call_id}", response_model=VoiceCallResponse)
async def get_call(call_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VoiceCall).where(VoiceCall.id == call_id))
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")
    return call

@router.post("/initiate", response_model=VoiceCallResponse, status_code=201)
async def initiate_call(payload: VoiceCallInitiateRequest, db: AsyncSession = Depends(get_db)):
    # 1. Determine from_number
    sender_number = "+10000000000"
    phone_record = None
    if payload.phone_number_id:
        res = await db.execute(select(PhoneNumber).where(PhoneNumber.id == payload.phone_number_id))
        phone_record = res.scalar_one_or_none()
        if phone_record:
            sender_number = phone_record.phone_number
    else:
        res = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active").limit(1))
        phone_record = res.scalar_one_or_none()
        if phone_record:
            sender_number = phone_record.phone_number

    # 2. Get carrier config
    cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
    carrier_cfg = cfg_res.scalar_one_or_none()

    # 3. Call initiation
    call_id = f"call_{uuid.uuid4().hex[:12]}"
    twiml_url = f"{carrier_cfg.webhook_url if carrier_cfg and carrier_cfg.webhook_url else 'http://localhost:8001'}/v1/calls/inbound-twiml"

    success, sid = await CarrierService.make_call(
        config=carrier_cfg,
        from_number=sender_number,
        to_number=payload.to_number,
        twiml_url=twiml_url
    )

    initial_transcript = f"Agent ({payload.voice_name}): \"{payload.initial_greeting}\""

    voice_call = VoiceCall(
        id=call_id,
        call_sid=sid or f"CA_{uuid.uuid4().hex[:16]}",
        phone_number_id=phone_record.id if phone_record else None,
        direction="outbound",
        from_number=sender_number,
        to_number=payload.to_number,
        status="in_progress" if success else "failed",
        duration_seconds=0,
        recording_url=None,
        transcript=initial_transcript,
        summary="Outbound call initiated by agent.",
        created_at=datetime.datetime.utcnow()
    )
    db.add(voice_call)
    await db.commit()
    await db.refresh(voice_call)

    # Broadcast WebSocket
    await ws_manager.broadcast_event("call.initiated", {
        "id": voice_call.id,
        "call_sid": voice_call.call_sid,
        "from_number": voice_call.from_number,
        "to_number": voice_call.to_number,
        "status": voice_call.status,
        "created_at": voice_call.created_at.isoformat()
    })

    return voice_call

@router.post("/inbound-twiml")
async def inbound_twiml_webhook(request: Request):
    """
    Returns TwiML telling Twilio to connect the voice call to the realtime WebSocket media stream.
    """
    stream_url = "wss://localhost:8001/v1/voice/stream"
    twiml = CarrierService.generate_twiml_stream(stream_url)
    return Response(content=twiml, media_type="application/xml")
