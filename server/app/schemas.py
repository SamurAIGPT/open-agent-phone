from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Phone Number Schemas ---
class PhoneNumberCreate(BaseModel):
    phone_number: str = Field(..., example="+12025550199")
    agent_name: str = Field(..., example="Customer Concierge")
    country: str = Field("US", example="US")
    carrier: str = Field("twilio", example="twilio")

class PhoneNumberResponse(BaseModel):
    id: str
    phone_number: str
    agent_name: str
    country: str
    capabilities: str
    status: str
    carrier: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- SMS Schemas ---
class SmsSendRequest(BaseModel):
    phone_number_id: Optional[str] = None
    to_number: str = Field(..., example="+15551234567")
    body: str = Field(..., example="Hello from your autonomous AI agent!")

class SmsResponse(BaseModel):
    id: str
    phone_number_id: Optional[str]
    direction: str
    from_number: str
    to_number: str
    body: str
    status: str
    verification_code: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class LatestCodeResponse(BaseModel):
    found: bool
    code: Optional[str] = None
    from_number: Optional[str] = None
    body: Optional[str] = None
    received_at: Optional[datetime] = None


# --- Voice Call & Mission Schemas ---
class OperatorQueryCreate(BaseModel):
    question: str = Field(..., example="The clerk asked for the reservation name. What name should I give?")
    call_context: Optional[str] = Field(None, example="Booking dinner for 4 at 7 PM")
    urgency: str = Field("normal", example="normal")

class OperatorQueryAnswer(BaseModel):
    answer: str = Field(..., example="Please use the name Jane Doe.")
    answered_via: str = Field("dashboard", example="dashboard")

class OperatorQueryResponse(BaseModel):
    id: str
    call_id: str
    question: str
    call_context: Optional[str] = None
    urgency: str
    status: str
    answer: Optional[str] = None
    asked_at: datetime
    answered_at: Optional[datetime] = None
    answered_via: Optional[str] = None

    class Config:
        from_attributes = True

class VoiceCallInitiateRequest(BaseModel):
    phone_number_id: Optional[str] = None
    to_number: str = Field(..., example="+15551234567")
    task: Optional[str] = Field("You are an autonomous AI voice concierge assisting callers concisely.", example="Call restaurant and check table availability")
    initial_greeting: Optional[str] = Field("Hello, I am calling on behalf of my operator regarding your services.")
    voice_name: Optional[str] = Field("alloy")
    policy_max_duration: Optional[int] = Field(1800, example=1800)
    policy_max_cost: Optional[int] = Field(5, example=5)
    record_call: Optional[bool] = Field(False)

class VoiceCallResponse(BaseModel):
    id: str
    call_sid: Optional[str]
    phone_number_id: Optional[str]
    direction: str
    from_number: str
    to_number: str
    task: Optional[str] = None
    policy_max_duration: Optional[int] = 1800
    policy_max_cost: Optional[int] = 5
    record_call: Optional[bool] = False
    status: str
    duration_seconds: int
    recording_url: Optional[str]
    transcript: Optional[str]
    summary: Optional[str]
    created_at: datetime
    ended_at: Optional[datetime]
    operator_queries: Optional[List[OperatorQueryResponse]] = []

    class Config:
        from_attributes = True


# --- Carrier Config Schemas ---
class CarrierConfigUpdate(BaseModel):
    provider: str = Field("twilio", example="twilio")
    account_sid: str = Field("", example="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    auth_token: Optional[str] = Field(None, example="your_auth_token")
    api_key: Optional[str] = Field(None, example="your_api_key")
    webhook_url: str = Field("", example="https://agent.example.com/api/webhooks/voice")
    elks_username: Optional[str] = Field(None, example="u46elks...")
    elks_password: Optional[str] = Field(None, example="46elks_password")
    telnyx_api_key: Optional[str] = Field(None, example="KEY...")
    openai_api_key: Optional[str] = Field(None, example="sk-...")
    voice_name: str = Field("alloy", example="alloy")
    voice_model: str = Field("gpt-4o-realtime-preview", example="gpt-4o-realtime-preview")
    realtime_prompt: str = Field("You are an autonomous AI voice concierge assisting callers concisely.", example="Prompt")
    enabled: bool = False

class CarrierConfigResponse(BaseModel):
    id: str
    provider: str
    account_sid: str
    auth_token_configured: bool
    api_key_configured: bool
    webhook_url: str
    elks_configured: bool = False
    telnyx_configured: bool = False
    openai_api_key_configured: bool
    voice_name: str
    voice_model: str
    realtime_prompt: str
    enabled: bool
    updated_at: Optional[datetime] = None


# --- API Key Schemas ---
class ApiKeyCreate(BaseModel):
    name: str = Field(..., example="Cursor AI Integration")
    scope: str = Field("full_access", example="full_access")

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    prefix: str
    scope: str
    created_at: datetime

    class Config:
        from_attributes = True

class ApiKeyCreatedResponse(BaseModel):
    id: str
    name: str
    key: str
    prefix: str
    scope: str
    created_at: datetime


# --- Stats Schema ---
class StatsResponse(BaseModel):
    total_phone_numbers: int
    total_calls: int
    active_calls: int
    total_sms: int
    codes_extracted: int
    active_websockets: int
