import json
from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import PhoneNumber, SmsMessage, VoiceCall, CarrierConfig
from app.services.code_extractor import CodeExtractor
from app.services.twilio_service import CarrierService

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])

MCP_TOOLS = [
    {
        "name": "list_phone_numbers",
        "description": "Lists all configured and active AI agent phone numbers.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "send_sms",
        "description": "Sends an SMS text message to an external phone number from the agent.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "to_number": {"type": "string", "description": "Destination phone number in E.164 format, e.g. +15551234567"},
                "body": {"type": "string", "description": "Text message content to send"}
            },
            "required": ["to_number", "body"]
        }
    },
    {
        "name": "list_sms_messages",
        "description": "Fetches recent inbound and outbound SMS messages received or sent by the agent.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "direction": {"type": "string", "enum": ["inbound", "outbound"], "description": "Filter by message direction"}
            }
        }
    },
    {
        "name": "get_latest_verification_code",
        "description": "Retrieves the latest 4-8 digit OTP verification code or 2FA security code received via SMS.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "initiate_voice_call",
        "description": "Places an outbound phone call to an external phone number using the AI voice concierge.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "to_number": {"type": "string", "description": "Destination phone number in E.164 format"},
                "initial_greeting": {"type": "string", "description": "First sentence the AI voice agent says when call connects"}
            },
            "required": ["to_number"]
        }
    },
    {
        "name": "list_call_logs",
        "description": "Fetches voice call logs, including duration, status, and transcripts.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by call status (ringing, in_progress, completed)"}
            }
        }
    }
]

@router.get("/info")
async def mcp_info():
    return {
        "name": "open-agent-phone",
        "version": "1.0.0",
        "description": "Model Context Protocol (MCP) Server for AI Agent Phone Numbers, SMS & Realtime Voice",
        "tools": MCP_TOOLS
    }

@router.post("/rpc")
async def mcp_json_rpc(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Standard JSON-RPC 2.0 endpoint for MCP clients like Cursor and Claude.
    """
    try:
        payload = await request.json()
    except Exception:
        return {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None}

    method = payload.get("method")
    req_id = payload.get("id")

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "open-agent-phone", "version": "1.0.0"}
            }
        }

    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": MCP_TOOLS}}

    if method == "tools/call":
        params = payload.get("params", {})
        tool_name = params.get("name")
        args = params.get("arguments", {})

        if tool_name == "list_phone_numbers":
            res = await db.execute(select(PhoneNumber))
            numbers = res.scalars().all()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": json.dumps([{"id": n.id, "number": n.phone_number, "agent": n.agent_name, "status": n.status} for n in numbers])}]}
            }

        elif tool_name == "get_latest_verification_code":
            query = select(SmsMessage).where(SmsMessage.verification_code.isnot(None)).order_by(SmsMessage.created_at.desc()).limit(1)
            res = await db.execute(query)
            latest = res.scalar_one_or_none()
            if latest:
                result_text = f"Verification Code: {latest.verification_code} (From: {latest.from_number}, Received: {latest.created_at})"
            else:
                result_text = "No verification codes found in recent SMS messages."
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": result_text}]}
            }

        elif tool_name == "send_sms":
            to_num = args.get("to_number")
            body = args.get("body")
            res_num = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active").limit(1))
            num_record = res_num.scalar_one_or_none()
            from_num = num_record.phone_number if num_record else "+10000000000"

            cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
            carrier_cfg = cfg_res.scalar_one_or_none()

            success, info = await CarrierService.send_sms(carrier_cfg, from_num, to_num, body)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": f"SMS sent: {success} ({info})"}]}
            }

        elif tool_name == "list_sms_messages":
            res = await db.execute(select(SmsMessage).order_by(SmsMessage.created_at.desc()).limit(15))
            msgs = res.scalars().all()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": json.dumps([{"from": m.from_number, "to": m.to_number, "body": m.body, "code": m.verification_code} for m in msgs])}]}
            }

        elif tool_name == "initiate_voice_call":
            to_num = args.get("to_number")
            greeting = args.get("initial_greeting", "Hello from Open Agent Phone.")
            res_num = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active").limit(1))
            num_record = res_num.scalar_one_or_none()
            from_num = num_record.phone_number if num_record else "+10000000000"

            cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
            carrier_cfg = cfg_res.scalar_one_or_none()

            success, sid = await CarrierService.make_call(carrier_cfg, from_num, to_num, "http://localhost:8001/v1/calls/inbound-twiml")
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": f"Voice call initiated to {to_num}. Status SID: {sid}"}]}
            }

        elif tool_name == "list_call_logs":
            res = await db.execute(select(VoiceCall).order_by(VoiceCall.created_at.desc()).limit(10))
            calls = res.scalars().all()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": json.dumps([{"from": c.from_number, "to": c.to_number, "status": c.status, "duration": c.duration_seconds} for c in calls])}]}
            }

    return {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": req_id}
