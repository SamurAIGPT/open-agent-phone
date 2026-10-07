import json
import uuid
import datetime
from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import PhoneNumber, SmsMessage, VoiceCall, CarrierConfig, OperatorQuery
from app.services.code_extractor import CodeExtractor
from app.services.twilio_service import CarrierService
from app.services.ws_manager import ws_manager

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
        "name": "start_phone_mission",
        "description": "Starts an objective-driven phone call mission with a specific task, policy duration, and realtime voice agent.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "to_number": {"type": "string", "description": "Destination phone number in E.164 format"},
                "task": {"type": "string", "description": "The mission objective / instructions for the AI voice agent (e.g., 'Reschedule dental appointment for Thursday at 3pm')"},
                "initial_greeting": {"type": "string", "description": "First sentence the agent speaks when connected"},
                "voice_name": {"type": "string", "enum": ["alloy", "echo", "shimmer", "ash", "verse", "ballad"], "description": "OpenAI voice character"},
                "max_duration_seconds": {"type": "integer", "description": "Hard cap on call duration (default 1800, max 7200)"}
            },
            "required": ["to_number", "task"]
        }
    },
    {
        "name": "answer_operator_query",
        "description": "Provides human operator answer to a pending question raised by a voice agent mid-call (Human-in-the-Loop ask_operator).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query_id": {"type": "string", "description": "The unique operator query ID (e.g. oq_xxx)"},
                "answer": {"type": "string", "description": "The operator's answer or authorization"}
            },
            "required": ["query_id", "answer"]
        }
    },
    {
        "name": "get_mission_status",
        "description": "Checks the live status, transcript, and pending operator queries of an active or past voice call mission.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "mission_id": {"type": "string", "description": "The unique call mission ID (e.g. cm_xxx)"}
            },
            "required": ["mission_id"]
        }
    },
    {
        "name": "list_call_logs",
        "description": "Fetches voice call logs, including duration, status, task, and transcripts.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Filter by call status (conversing, completed, needs_operator, failed)"}
            }
        }
    }
]

@router.get("/info")
async def mcp_info():
    return {
        "name": "open-agent-phone",
        "version": "1.0.0",
        "description": "Model Context Protocol (MCP) Server for AI Agent Phone Numbers, SMS, 2FA Extraction & Voice Missions",
        "tools": MCP_TOOLS
    }

@router.post("/rpc")
async def mcp_json_rpc(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Standard JSON-RPC 2.0 endpoint for MCP clients like Cursor and Claude Code.
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

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": MCP_TOOLS}
        }

    elif method == "tools/call":
        params = payload.get("params", {})
        tool_name = params.get("name")
        args = params.get("arguments", {})

        try:
            if tool_name == "list_phone_numbers":
                res = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active"))
                numbers = res.scalars().all()
                result_text = json.dumps([{
                    "id": n.id,
                    "phone_number": n.phone_number,
                    "agent_name": n.agent_name,
                    "carrier": n.carrier
                } for n in numbers], indent=2)
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": result_text}]}}

            elif tool_name == "send_sms":
                to_number = args.get("to_number")
                body = args.get("body")
                num_res = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active").limit(1))
                active_num = num_res.scalar_one_or_none()
                sender = active_num.phone_number if active_num else "+10000000000"

                cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
                carrier_cfg = cfg_res.scalar_one_or_none()
                success, info = await CarrierService.send_sms(carrier_cfg, sender, to_number, body)

                msg = SmsMessage(
                    id=f"sms_{uuid.uuid4().hex[:12]}",
                    phone_number_id=active_num.id if active_num else None,
                    direction="outbound",
                    from_number=sender,
                    to_number=to_number,
                    body=body,
                    status="sent" if success else "failed"
                )
                db.add(msg)
                await db.commit()

                return {"jsonrpc": "2.0", "id": req_id, "result": {
                    "content": [{"type": "text", "text": f"SMS {msg.status} to {to_number} (ID: {msg.id})"}]
                }}

            elif tool_name == "get_latest_verification_code":
                res = await db.execute(select(SmsMessage).where(SmsMessage.verification_code.isnot(None)).order_by(SmsMessage.created_at.desc()).limit(1))
                sms = res.scalar_one_or_none()
                if sms:
                    output = json.dumps({
                        "found": True,
                        "code": sms.verification_code,
                        "from": sms.from_number,
                        "received_at": sms.created_at.isoformat(),
                        "snippet": sms.body
                    }, indent=2)
                else:
                    output = json.dumps({"found": False, "message": "No verification codes received yet."})
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": output}]}}

            elif tool_name == "start_phone_mission":
                to_number = args.get("to_number")
                task = args.get("task", "Accomplish operator goal.")
                greeting = args.get("initial_greeting", "Hello, I am calling on behalf of my operator.")
                voice_name = args.get("voice_name", "alloy")
                max_duration = min(int(args.get("max_duration_seconds", 1800)), 7200)

                num_res = await db.execute(select(PhoneNumber).where(PhoneNumber.status == "active").limit(1))
                active_num = num_res.scalar_one_or_none()
                sender = active_num.phone_number if active_num else "+10000000000"

                cfg_res = await db.execute(select(CarrierConfig).where(CarrierConfig.id == "default"))
                carrier_cfg = cfg_res.scalar_one_or_none()

                mission_id = f"cm_{uuid.uuid4().hex[:12]}"
                twiml_url = f"{carrier_cfg.webhook_url if carrier_cfg and carrier_cfg.webhook_url else 'http://localhost:8000'}/v1/calls/inbound-twiml"

                success, sid = await CarrierService.make_call(carrier_cfg, sender, to_number, twiml_url)

                call = VoiceCall(
                    id=mission_id,
                    call_sid=sid or f"CA_{uuid.uuid4().hex[:16]}",
                    phone_number_id=active_num.id if active_num else None,
                    direction="outbound",
                    from_number=sender,
                    to_number=to_number,
                    task=task,
                    policy_max_duration=max_duration,
                    status="conversing" if success else "failed",
                    transcript=f"System: Mission started. Task: {task}\nAgent ({voice_name}): \"{greeting}\"",
                    summary=f"Mission: {task[:80]}"
                )
                db.add(call)
                await db.commit()

                return {"jsonrpc": "2.0", "id": req_id, "result": {
                    "content": [{"type": "text", "text": json.dumps({
                        "mission_id": mission_id,
                        "status": call.status,
                        "to_number": to_number,
                        "task": task
                    }, indent=2)}]
                }}

            elif tool_name == "answer_operator_query":
                query_id = args.get("query_id")
                answer = args.get("answer")
                res = await db.execute(select(OperatorQuery).where(OperatorQuery.id == query_id))
                query = res.scalar_one_or_none()
                if not query:
                    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": f"Query {query_id} not found"}}

                query.answer = answer
                query.answered_at = datetime.datetime.utcnow()
                query.answered_via = "mcp"
                query.status = "answered"

                call_res = await db.execute(select(VoiceCall).where(VoiceCall.id == query.call_id))
                call = call_res.scalar_one_or_none()
                if call:
                    call.status = "conversing"
                    call.transcript = (call.transcript or "") + f"\n[Operator answered via MCP: \"{answer}\"]"

                await db.commit()
                return {"jsonrpc": "2.0", "id": req_id, "result": {
                    "content": [{"type": "text", "text": f"Answer delivered for query {query_id}. Call resumed."}]
                }}

            elif tool_name == "get_mission_status":
                mission_id = args.get("mission_id")
                res = await db.execute(select(VoiceCall).where(VoiceCall.id == mission_id).options(selectinload(VoiceCall.operator_queries)))
                call = res.scalar_one_or_none()
                if not call:
                    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "Mission not found"}}

                return {"jsonrpc": "2.0", "id": req_id, "result": {
                    "content": [{"type": "text", "text": json.dumps({
                        "id": call.id,
                        "status": call.status,
                        "to_number": call.to_number,
                        "task": call.task,
                        "duration_seconds": call.duration_seconds,
                        "transcript": call.transcript,
                        "pending_queries": [{
                            "id": q.id,
                            "question": q.question,
                            "urgency": q.urgency
                        } for q in (call.operator_queries or []) if q.status == "pending"]
                    }, indent=2)}]
                }}

            elif tool_name == "list_call_logs":
                res = await db.execute(select(VoiceCall).order_by(VoiceCall.created_at.desc()).limit(15))
                calls = res.scalars().all()
                return {"jsonrpc": "2.0", "id": req_id, "result": {
                    "content": [{"type": "text", "text": json.dumps([{
                        "id": c.id,
                        "status": c.status,
                        "from": c.from_number,
                        "to": c.to_number,
                        "task": c.task,
                        "duration_seconds": c.duration_seconds
                    } for c in calls], indent=2)}]
                }}

            elif tool_name == "list_sms_messages":
                res = await db.execute(select(SmsMessage).order_by(SmsMessage.created_at.desc()).limit(20))
                msgs = res.scalars().all()
                return {"jsonrpc": "2.0", "id": req_id, "result": {
                    "content": [{"type": "text", "text": json.dumps([{
                        "id": m.id,
                        "direction": m.direction,
                        "from": m.from_number,
                        "to": m.to_number,
                        "body": m.body,
                        "code": m.verification_code
                    } for m in msgs], indent=2)}]
                }}

            else:
                return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Tool '{tool_name}' not found"}}

        except Exception as e:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32000, "message": str(e)}}

    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "Method not found"}}
