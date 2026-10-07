import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import CarrierConfig
from app.schemas import CarrierConfigUpdate, CarrierConfigResponse

router = APIRouter(prefix="/v1/carrier", tags=["Carrier Settings"])

@router.get("", response_model=CarrierConfigResponse)
async def get_carrier_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
    config = result.scalar_one_or_none()
    if not config:
        config = CarrierConfig(
            id="default",
            provider="twilio",
            account_sid="",
            auth_token="",
            api_key="",
            webhook_url="",
            openai_api_key="",
            voice_name="alloy",
            voice_model="gpt-4o-realtime-preview",
            realtime_prompt="You are an autonomous AI voice concierge assisting callers concisely over the phone.",
            enabled=False,
            updated_at=datetime.datetime.utcnow()
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return CarrierConfigResponse(
        id=config.id,
        provider=config.provider,
        account_sid=config.account_sid,
        auth_token_configured=bool(config.auth_token),
        api_key_configured=bool(config.api_key),
        webhook_url=config.webhook_url,
        openai_api_key_configured=bool(config.openai_api_key),
        voice_name=config.voice_name,
        voice_model=config.voice_model,
        realtime_prompt=config.realtime_prompt,
        enabled=config.enabled,
        updated_at=config.updated_at
    )

@router.post("", response_model=CarrierConfigResponse)
async def update_carrier_config(payload: CarrierConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
    config = result.scalar_one_or_none()
    if not config:
        config = CarrierConfig(id="default")
        db.add(config)

    config.provider = payload.provider.strip()
    config.account_sid = payload.account_sid.strip()
    if payload.auth_token is not None and payload.auth_token != "":
        config.auth_token = payload.auth_token
    if payload.api_key is not None and payload.api_key != "":
        config.api_key = payload.api_key
    if payload.openai_api_key is not None and payload.openai_api_key != "":
        config.openai_api_key = payload.openai_api_key
    config.webhook_url = payload.webhook_url.strip()
    config.voice_name = payload.voice_name.strip()
    config.voice_model = payload.voice_model.strip()
    config.realtime_prompt = payload.realtime_prompt.strip()
    config.enabled = payload.enabled
    config.updated_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(config)

    return CarrierConfigResponse(
        id=config.id,
        provider=config.provider,
        account_sid=config.account_sid,
        auth_token_configured=bool(config.auth_token),
        api_key_configured=bool(config.api_key),
        webhook_url=config.webhook_url,
        openai_api_key_configured=bool(config.openai_api_key),
        voice_name=config.voice_name,
        voice_model=config.voice_model,
        realtime_prompt=config.realtime_prompt,
        enabled=config.enabled,
        updated_at=config.updated_at
    )
