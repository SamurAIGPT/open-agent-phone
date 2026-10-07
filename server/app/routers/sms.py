import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import PhoneNumber, SmsMessage, CarrierConfig
from app.schemas import SmsSendRequest, SmsResponse, LatestCodeResponse
from app.services.code_extractor import CodeExtractor
from app.services.twilio_service import CarrierService
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/v1/sms", tags=["SMS & 2FA"])

@router.get("", response_model=List[SmsResponse])
async def list_sms(
    phone_number_id: Optional[str] = None,
    direction: Optional[str] = None,
    has_code: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(SmsMessage)
    conditions = []
    if phone_number_id:
        conditions.append(SmsMessage.phone_number_id == phone_number_id)
    if direction:
        conditions.append(SmsMessage.direction == direction)
    if has_code is True:
        conditions.append(SmsMessage.verification_code.isnot(None))

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(SmsMessage.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/send", response_model=SmsResponse, status_code=201)
async def send_sms(payload: SmsSendRequest, db: AsyncSession = Depends(get_db)):
    # 1. Determine from_number
    sender_number = None
    phone_record = None
    if payload.phone_number_id:
        res = await db.execute(select(PhoneNumber).where(PhoneNumber.id == payload.phone_number_id))
        phone_record = res.scalar_one_or_none()
        if phone_record:
            sender_number = phone_record.phone_number
    else:
        # Pick first active number
        res = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active").limit(1))
        phone_record = res.scalar_one_or_none()
        if phone_record:
            sender_number = phone_record.phone_number

    if not sender_number:
        sender_number = "+10000000000"

    # 2. Get carrier config
    cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
    carrier_cfg = cfg_res.scalar_one_or_none()

    # 3. Dispatch via carrier service
    success, dispatch_info = await CarrierService.send_sms(
        config=carrier_cfg,
        from_number=sender_number,
        to_number=payload.to_number,
        body=payload.body
    )

    msg_id = f"sms_{uuid.uuid4().hex[:12]}"
    status = "sent" if success else "failed"

    sms = SmsMessage(
        id=msg_id,
        phone_number_id=phone_record.id if phone_record else None,
        direction="outbound",
        from_number=sender_number,
        to_number=payload.to_number,
        body=payload.body,
        status=status,
        verification_code=None,
        created_at=datetime.datetime.utcnow()
    )
    db.add(sms)
    await db.commit()
    await db.refresh(sms)

    # Broadcast WebSocket event
    await ws_manager.broadcast_event("sms.sent", {
        "id": sms.id,
        "from_number": sms.from_number,
        "to_number": sms.to_number,
        "body": sms.body,
        "status": sms.status,
        "created_at": sms.created_at.isoformat()
    })

    return sms

@router.post("/inbound", response_model=SmsResponse)
async def inbound_sms_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Webhook endpoint for carriers (Twilio / Telnyx / 46elks) or direct testing.
    """
    from_num = ""
    to_num = ""
    body = ""

    # Parse either Form data (Twilio standard) or JSON
    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        from_num = form.get("From", "")
        to_num = form.get("To", "")
        body = form.get("Body", "")
    else:
        try:
            data = await request.json()
            from_num = data.get("from_number") or data.get("From", "")
            to_num = data.get("to_number") or data.get("To", "")
            body = data.get("body") or data.get("Body", "")
        except Exception:
            pass

    if not body:
        raise HTTPException(status_code=400, detail="Missing SMS body")

    # Match receiving agent phone number
    num_res = await db.execute(select(PhoneNumber).where(PhoneNumber.phone_number == to_num))
    phone_record = num_res.scalar_one_or_none()

    # Extract OTP / 2FA code if present
    code = CodeExtractor.extract_code(body)

    msg_id = f"sms_{uuid.uuid4().hex[:12]}"
    sms = SmsMessage(
        id=msg_id,
        phone_number_id=phone_record.id if phone_record else None,
        direction="inbound",
        from_number=from_num or "+10000000000",
        to_number=to_num or "+10000000000",
        body=body,
        status="received",
        verification_code=code,
        created_at=datetime.datetime.utcnow()
    )
    db.add(sms)
    await db.commit()
    await db.refresh(sms)

    # Broadcast WebSocket
    event_data = {
        "id": sms.id,
        "from_number": sms.from_number,
        "to_number": sms.to_number,
        "body": sms.body,
        "verification_code": sms.verification_code,
        "created_at": sms.created_at.isoformat()
    }
    await ws_manager.broadcast_event("sms.received", event_data)

    if code:
        await ws_manager.broadcast_event("sms.code_extracted", {
            "code": code,
            "sms_id": sms.id,
            "from_number": sms.from_number
        })

    return sms

@router.get("/latest-code", response_model=LatestCodeResponse)
async def get_latest_code(db: AsyncSession = Depends(get_db)):
    """
    Returns the most recent verification code extracted from an inbound SMS.
    (Matches AgenticMail's /sms/latest-code tool)
    """
    query = select(SmsMessage).where(SmsMessage.verification_code.isnot(None)).order_by(SmsMessage.created_at.desc()).limit(1)
    res = await db.execute(query)
    latest = res.scalar_one_or_none()
    if not latest:
        return LatestCodeResponse(found=False)

    return LatestCodeResponse(
        found=True,
        code=latest.verification_code,
        from_number=latest.from_number,
        body=latest.body,
        received_at=latest.created_at
    )
