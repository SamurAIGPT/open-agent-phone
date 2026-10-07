# Open Agent Phone

<div align="center">

### The Open-Source Telephony, SMS & Realtime Voice Gateway for Autonomous AI Agents

Give autonomous AI agents real phone numbers, two-way SMS messaging, automated OTP / 2FA verification code extraction, and realtime voice call bridging.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![MCP](https://img.shields.io/badge/MCP-JSON--RPC-purple.svg)](https://modelcontextprotocol.io/)

</div>

---

## 🌟 Key Capabilities

- **📱 Dedicated Agent Phone Numbers**: Assign dedicated E.164 telephone lines to AI agents (supporting Twilio, Telnyx, 46elks, or local dev simulation).
- **🔑 Automated 2FA & OTP Extraction**: Automated heuristic parser extracts 4–8 digit verification codes and one-time passwords from incoming SMS (e.g., Google, GitHub, Microsoft, Twilio), exposing a 1-call `GET /v1/sms/latest-code` and MCP tool.
- **🎙️ Realtime Voice Call Bridging**: Wires telephone calls to the **OpenAI Realtime Voice API (`gpt-4o-realtime-preview`)** with natural speech turn-taking, multiple voice characters (`alloy`, `echo`, `shimmer`, `ash`, `verse`, `ballad`), and live call transcripts.
- **💬 Two-Way SMS Conversations**: Send and receive SMS text messages programmatically via REST API, WebSockets, or MCP tools.
- **🤖 Model Context Protocol (MCP) Gateway**: Out-of-the-box MCP endpoint (`http://localhost:8001/mcp/rpc`) gives coding agents in **Cursor**, **Claude Code**, and **Windsurf** autonomous telephone and SMS capabilities.
- **⚡ Live Event WebSocket Streaming**: Real-time WebSocket feed (`/v1/ws/live`) streams active calls, status changes, incoming texts, and extracted security codes with zero latency.

---

## 🏗️ Architecture

```text
    Real Phone Network (Mobile / Landline)  ·  External Services (2FA / OTP)
                        │                               ▲
         Inbound Voice  │                               │ Outbound Voice / SMS
         & SMS Texts    ▼                               │ (Twilio / Telnyx / 46elks)
  ┌─────────────────────────────────────────────────────┴─────────────────────┐
  │                 Open Agent Phone Gateway (FastAPI :8001)                  │
  │                                                                           │
  │  1. Telephony Webhook Ingest (Twilio TwiML / Telnyx Call Control)         │
  │  2. Heuristic Verification Code (OTP / 2FA) Extractor Engine              │
  │  3. Realtime Audio WebSocket Bridge (OpenAI Realtime Voice API)           │
  │  4. Local SQLite / PostgreSQL Call & Message Store                        │
  └───────────────────────────────┬───────────────────────────────────────────┘
                                  │  WebSockets / MCP / REST
                                  ▼
  ┌───────────────────────────────────────────────────────────────────────────┐
  │     Next.js Dashboard (:3001)      ·     Coding Agents (Cursor / Claude)  │
  │     • Live Call Center & Transcripts     • initiate_voice_call            │
  │     • SMS Feed & OTP Code Card           • send_sms, list_sms_messages    │
  │     • Phone Line Provisioning            • get_latest_verification_code   │
  │     • Carrier & Voice Settings           • list_phone_numbers, list_calls │
  └───────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Start the FastAPI Backend

```bash
cd server

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server on port 8001
python run.py
```

The server initializes:
- **FastAPI HTTP API & MCP**: `http://127.0.0.1:8001`
- **Interactive OpenAPI Docs**: `http://127.0.0.1:8001/docs`

### 2. Start the Next.js Dashboard

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3001` in your browser.

---

## 🐳 Docker Deployment

Run the complete gateway stack with Docker Compose:

```bash
docker compose up -d --build
```

- Web Dashboard: `http://localhost:3001`
- REST API & MCP: `http://localhost:8001`

---

## ⚙️ Configuration & Features

### 1. Carrier & Telephony Provider (`/settings`)
Configure your telephony provider to connect to real phone networks:
- **Twilio**: Account SID, Auth Token, Webhook URL.
- **OpenAI Realtime Voice API Key**: For natural voice conversation bridging during phone calls.
- **Voice Character Selection**: Choose between `alloy`, `echo`, `shimmer`, `ash`, `verse`, or `ballad`.

### 2. Phone Numbers (`/numbers`)
- Provision telephone numbers in standard E.164 format (e.g. `+12025550199`).
- Assign lines to specific AI agent roles (e.g. *Support Concierge*, *Sales Assistant*).

### 3. SMS & OTP Extraction (`/sms`)
- Send outbound text messages to external phone numbers.
- Automated regex and heuristic code parser extracts 4–8 digit verification codes and OTP tokens from inbound SMS in real time.
- 1-call lookup via `GET /v1/sms/latest-code` returns:
  ```json
  {
    "found": true,
    "code": "849201",
    "from_number": "+18005550199",
    "body": "Your verification code is 849201"
  }
  ```

---

## 🤖 Coding Agent Integration (MCP)

Connect any Model Context Protocol compatible client to control agent telephone lines and SMS.

### Cursor Setup
Add to `.cursor/mcp.json` (or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "open-agent-phone": {
      "url": "http://127.0.0.1:8001/mcp/rpc"
    }
  }
}
```

### Claude Code Setup
```bash
claude mcp add open-agent-phone http://127.0.0.1:8001/mcp/rpc
```

### Available MCP Tools
| Tool | Description |
| :--- | :--- |
| `list_phone_numbers` | Lists all configured and active AI agent telephone numbers. |
| `send_sms` | Sends an SMS text message to an external phone number from the agent. |
| `list_sms_messages` | Fetches recent inbound and outbound SMS messages received or sent by the agent. |
| `get_latest_verification_code` | Retrieves the latest 4-8 digit OTP verification code or 2FA security code received via SMS. |
| `initiate_voice_call` | Places an outbound phone call to an external phone number using the AI voice concierge. |
| `list_call_logs` | Fetches voice call logs, including duration, status, and transcripts. |

---

## 🔒 Security & Privacy

- No personal phone numbers or credentials are hardcoded.
- API tokens and carrier secrets are masked at the API response boundary.
- Zero-leak architecture: dev simulator mode allows end-to-end testing without external carrier billing.

---

## 📄 License

Apache 2.0. Open-source for developers and autonomous AI agent systems.
