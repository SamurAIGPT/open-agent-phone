import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import PhoneNumber, VoiceCall, CarrierConfig, OperatorQuery
from app.schemas import (
    VoiceCallInitiateRequest,
    VoiceCallResponse,
    OperatorQueryCreate,
    OperatorQueryAnswer,
    OperatorQueryResponse
)
from app.services.twilio_service import CarrierService
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/v1/calls", tags=["Voice Calls & Missions"])

@router.get("", response_model=List[VoiceCallResponse])
async def list_calls(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(VoiceCall).options(selectinload(VoiceCall.operator_queries))
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

@router.get("/queries/pending", response_model=List[OperatorQueryResponse])
async def list_pending_operator_queries(db: AsyncSession = Depends(get_db)):
    """
    List all pending human-in-the-loop queries from live voice calls (ask_operator).
    """
    query = select(OperatorQuery).where(OperatorQuery.status == "pending").order_by(OperatorQuery.asked_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{call_id}", response_model=VoiceCallResponse)
async def get_call(call_id: str, db: AsyncSession = Depends(get_db)):
    query = select(VoiceCall).where(VoiceCall.id == call_id).options(selectinload(VoiceCall.operator_queries))
    res = await db.execute(query)
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")
    return call

@router.post("/initiate", response_model=VoiceCallResponse, status_code=201)
async def initiate_call_mission(payload: VoiceCallInitiateRequest, db: AsyncSession = Depends(get_db)):
    """
    Start an autonomous Voice Mission: dials out, wires to OpenAI Realtime stream,
    and executes the specified task / prompt.
    """
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

    cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
    carrier_cfg = cfg_res.scalar_one_or_none()

    mission_id = f"cm_{uuid.uuid4().hex[:12]}"
    twiml_url = f"{carrier_cfg.webhook_url if carrier_cfg and carrier_cfg.webhook_url else 'http://localhost:8000'}/v1/calls/inbound-twiml"

    success, sid = await CarrierService.make_call(
        config=carrier_cfg,
        from_number=sender_number,
        to_number=payload.to_number,
        twiml_url=twiml_url
    )

    task_desc = payload.task or "Assist the caller politely and accomplish the operator's mission."
    initial_transcript = f"System: Call initialized. Objective: {task_desc}\nAgent ({payload.voice_name or 'alloy'}): \"{payload.initial_greeting}\""

    voice_call = VoiceCall(
        id=mission_id,
        call_sid=sid or f"CA_{uuid.uuid4().hex[:16]}",
        phone_number_id=phone_record.id if phone_record else None,
        direction="outbound",
        from_number=sender_number,
        to_number=payload.to_number,
        task=task_desc,
        policy_max_duration=min(payload.policy_max_duration or 1800, 7200),
        policy_max_cost=payload.policy_max_cost or 5,
        record_call=payload.record_call or False,
        status="conversing" if success else "failed",
        duration_seconds=0,
        recording_url=None,
        transcript=initial_transcript,
        summary=f"Voice Mission: {task_desc[:80]}",
        created_at=datetime.datetime.utcnow()
    )
    db.add(voice_call)
    await db.commit()
    
    # Reload with relationships
    res = await db.execute(select(VoiceCall).where(VoiceCall.id == mission_id).options(selectinload(VoiceCall.operator_queries)))
    voice_call = res.scalar_one()

    await ws_manager.broadcast_event("call.initiated", {
        "id": voice_call.id,
        "call_sid": voice_call.call_sid,
        "from_number": voice_call.from_number,
        "to_number": voice_call.to_number,
        "task": voice_call.task,
        "status": voice_call.status,
        "created_at": voice_call.created_at.isoformat()
    })

    return voice_call

@router.post("/{call_id}/operator-queries", response_model=OperatorQueryResponse, status_code=201)
async def create_operator_query(
    call_id: str,
    payload: OperatorQueryCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Called when an AI agent on a live call uses the 'ask_operator' tool mid-call.
    Sets the call status to 'needs_operator' and notifies the human operator.
    """
    call_res = await db.execute(select(VoiceCall).where(VoiceCall.id == call_id))
    call = call_res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    query_id = f"oq_{uuid.uuid4().hex[:12]}"
    query = OperatorQuery(
        id=query_id,
        call_id=call_id,
        question=payload.question,
        call_context=payload.call_context,
        urgency=payload.urgency,
        status="pending",
        asked_at=datetime.datetime.utcnow()
    )
    db.add(query)
    call.status = "needs_operator"
    if call.transcript:
        call.transcript += f"\n[Agent paused call - Asking operator: \"{payload.question}\"]"
    else:
        call.transcript = f"[Agent paused call - Asking operator: \"{payload.question}\"]"

    await db.commit()
    await db.refresh(query)

    await ws_manager.broadcast_event("operator_query.created", {
        "id": query.id,
        "call_id": query.call_id,
        "question": query.question,
        "urgency": query.urgency,
        "asked_at": query.asked_at.isoformat()
    })

    return query

@router.post("/queries/{query_id}/answer", response_model=OperatorQueryResponse)
async def answer_operator_query(
    query_id: str,
    payload: OperatorQueryAnswer,
    db: AsyncSession = Depends(get_db)
):
    """
    Human operator answers a pending question from a live call.
    Resumes the call from 'needs_operator' back to 'conversing'.
    """
    res = await db.execute(select(OperatorQuery).where(OperatorQuery.id == query_id))
    query = res.scalar_one_or_none()
    if not query:
        raise HTTPException(status_code=404, detail="Operator query not found")

    query.answer = payload.answer
    query.answered_at = datetime.datetime.utcnow()
    query.answered_via = payload.answered_via
    query.status = "answered"

    call_res = await db.execute(select(VoiceCall).where(VoiceCall.id == query.call_id))
    call = call_res.scalar_one_or_none()
    if call:
        call.status = "conversing"
        if call.transcript:
            call.transcript += f"\n[Operator answered: \"{payload.answer}\" - Agent resumes call]"

    await db.commit()
    await db.refresh(query)

    await ws_manager.broadcast_event("operator_query.answered", {
        "id": query.id,
        "call_id": query.call_id,
        "answer": query.answer,
        "status": query.status
    })

    return query

@router.post("/{call_id}/complete", response_model=VoiceCallResponse)
async def complete_call(call_id: str, db: AsyncSession = Depends(get_db)):
    """
    Terminates or marks a voice call mission as completed.
    """
    res = await db.execute(select(VoiceCall).where(VoiceCall.id == call_id).options(selectinload(VoiceCall.operator_queries)))
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    call.status = "completed"
    call.ended_at = datetime.datetime.utcnow()
    delta = call.ended_at - call.created_at
    call.duration_seconds = max(int(delta.total_seconds()), 15)
    if call.transcript:
        call.transcript += "\n[Call ended cleanly by agent]"

    await db.commit()
    await db.refresh(call)

    await ws_manager.broadcast_event("call.completed", {
        "id": call.id,
        "status": call.status,
        "duration_seconds": call.duration_seconds
    })

    return call

@router.post("/{call_id}/simulate-turn", response_model=VoiceCallResponse)
async def simulate_turn(
    call_id: str,
    user_speech: str = "Yes, can I book a table for tomorrow?",
    agent_speech: str = "Certainly! Let me check availability for you right now.",
    db: AsyncSession = Depends(get_db)
):
    """
    Simulates a speech turn for dev testing and demonstration.
    """
    res = await db.execute(select(VoiceCall).where(VoiceCall.id == call_id).options(selectinload(VoiceCall.operator_queries)))
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    turn = f"\nUser: \"{user_speech}\"\nAgent: \"{agent_speech}\""
    call.transcript = (call.transcript or "") + turn
    await db.commit()
    await db.refresh(call)

    await ws_manager.broadcast_event("call.transcript_updated", {
        "id": call.id,
        "transcript": call.transcript
    })
    return call

@router.post("/inbound-twiml")
async def inbound_twiml_webhook(request: Request):
    """
    Returns TwiML telling Twilio to connect the voice call to the realtime WebSocket media stream.
    """
    stream_url = "wss://localhost:8000/v1/voice/stream"
    twiml = CarrierService.generate_twiml_stream(stream_url)
    return Response(content=twiml, media_type="application/xml")
