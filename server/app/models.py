import datetime
from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PhoneNumber(Base):
    __tablename__ = "phone_numbers"

    id = Column(String(64), primary_key=True, index=True)
    phone_number = Column(String(32), unique=True, index=True, nullable=False)
    agent_name = Column(String(255), nullable=False)
    country = Column(String(8), default="US")
    capabilities = Column(String(64), default='["voice", "sms"]')
    status = Column(String(32), default="active", index=True)  # active, released
    carrier = Column(String(32), default="twilio")  # twilio, telnyx, 46elks, simulated
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    sms_messages = relationship("SmsMessage", back_populates="number", cascade="all, delete-orphan")
    calls = relationship("VoiceCall", back_populates="number", cascade="all, delete-orphan")


class SmsMessage(Base):
    __tablename__ = "sms_messages"

    id = Column(String(64), primary_key=True, index=True)
    phone_number_id = Column(String(64), ForeignKey("phone_numbers.id"), index=True, nullable=True)
    direction = Column(String(16), nullable=False, index=True)  # inbound, outbound
    from_number = Column(String(32), nullable=False, index=True)
    to_number = Column(String(32), nullable=False, index=True)
    body = Column(Text, nullable=False)
    status = Column(String(32), default="received", index=True)  # received, sent, delivered, failed
    verification_code = Column(String(32), nullable=True, index=True)  # extracted 4-8 digit OTP
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    number = relationship("PhoneNumber", back_populates="sms_messages")


class VoiceCall(Base):
    __tablename__ = "voice_calls"

    id = Column(String(64), primary_key=True, index=True)
    call_sid = Column(String(128), unique=True, index=True, nullable=True)
    phone_number_id = Column(String(64), ForeignKey("phone_numbers.id"), index=True, nullable=True)
    direction = Column(String(16), nullable=False, index=True)  # inbound, outbound
    from_number = Column(String(32), nullable=False)
    to_number = Column(String(32), nullable=False)
    task = Column(Text, nullable=True)  # Mission objective / system instructions
    policy_max_duration = Column(Integer, default=1800)  # max call duration in seconds
    policy_max_cost = Column(Integer, default=5)  # cost cap in currency units
    record_call = Column(Boolean, default=False)
    status = Column(String(32), default="ringing", index=True)  # draft, dialing, connected, conversing, needs_operator, completed, failed
    duration_seconds = Column(Integer, default=0)
    recording_url = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)

    number = relationship("PhoneNumber", back_populates="calls")
    operator_queries = relationship("OperatorQuery", back_populates="call", cascade="all, delete-orphan")


class OperatorQuery(Base):
    __tablename__ = "operator_queries"

    id = Column(String(64), primary_key=True, index=True)
    call_id = Column(String(64), ForeignKey("voice_calls.id"), index=True, nullable=False)
    question = Column(Text, nullable=False)
    call_context = Column(String(255), nullable=True)
    urgency = Column(String(16), default="normal")  # normal, high
    status = Column(String(16), default="pending", index=True)  # pending, answered
    answer = Column(Text, nullable=True)
    asked_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    answered_at = Column(DateTime, nullable=True)
    answered_via = Column(String(32), default="dashboard")

    call = relationship("VoiceCall", back_populates="operator_queries")


class CarrierConfig(Base):
    __tablename__ = "carrier_configs"

    id = Column(String(64), primary_key=True, default="default")
    provider = Column(String(32), default="twilio")  # twilio, telnyx, 46elks, simulated
    account_sid = Column(String(255), default="")
    auth_token = Column(String(255), default="")
    api_key = Column(String(255), default="")
    webhook_url = Column(String(255), default="")
    elks_username = Column(String(255), default="")
    elks_password = Column(String(255), default="")
    telnyx_api_key = Column(String(255), default="")
    openai_api_key = Column(String(255), default="")
    voice_name = Column(String(32), default="alloy")
    voice_model = Column(String(64), default="gpt-4o-realtime-preview")
    realtime_prompt = Column(Text, default="You are an autonomous AI voice concierge assisting callers concisely over the phone.")
    enabled = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    prefix = Column(String(16), nullable=False)
    key_hash = Column(String(128), nullable=False)
    scope = Column(String(64), default="full_access")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
