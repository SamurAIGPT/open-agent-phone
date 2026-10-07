"use client";

import { useState } from "react";
import { Cpu, Copy, Check, Terminal, Code2, Phone, MessageSquare, KeyRound } from "lucide-react";

export default function McpPage() {
  const [copiedCursor, setCopiedCursor] = useState<boolean>(false);
  const [copiedClaude, setCopiedClaude] = useState<boolean>(false);

  const cursorJson = JSON.stringify(
    {
      mcpServers: {
        "open-agent-phone": {
          url: "http://127.0.0.1:8001/mcp/rpc",
        },
      },
    },
    null,
    2
  );

  const claudeCommand = "claude mcp add open-agent-phone http://127.0.0.1:8001/mcp/rpc";

  const copyToClipboard = (text: string, type: "cursor" | "claude") => {
    navigator.clipboard.writeText(text);
    if (type === "cursor") {
      setCopiedCursor(true);
      setTimeout(() => setCopiedCursor(false), 2000);
    } else {
      setCopiedClaude(true);
      setTimeout(() => setCopiedClaude(false), 2000);
    }
  };

  const tools = [
    {
      name: "list_phone_numbers",
      description: "Lists all configured and active AI agent telephone numbers.",
      sampleParams: "{}",
    },
    {
      name: "send_sms",
      description: "Sends an SMS text message to an external phone number from the agent.",
      sampleParams: '{"to_number": "+15551234567", "body": "Hello from my AI agent!"}',
    },
    {
      name: "list_sms_messages",
      description: "Fetches recent inbound and outbound SMS messages received or sent by the agent.",
      sampleParams: '{"direction": "inbound"}',
    },
    {
      name: "get_latest_verification_code",
      description: "Retrieves the latest 4-8 digit OTP verification code or 2FA security code received via SMS.",
      sampleParams: "{}",
    },
    {
      name: "initiate_voice_call",
      description: "Places an outbound phone call to an external phone number using the AI voice concierge.",
      sampleParams: '{"to_number": "+15551234567", "initial_greeting": "Hello, I am calling regarding your account."}',
    },
    {
      name: "list_call_logs",
      description: "Fetches voice call logs, including duration, status, and transcripts.",
      sampleParams: '{"status": "completed"}',
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#30363d] pb-6">
        <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">Model Context Protocol (MCP) Server</h1>
        <p className="text-xs text-[#8b949e] mt-1">
          Connect coding agents (Cursor, Claude Code, Windsurf) to give them autonomous telephony, SMS, and 2FA capabilities.
        </p>
      </div>

      {/* Integration Code Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cursor Config */}
        <div className="card-simple p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-[#58a6ff]" /> Cursor Configuration (.cursor/mcp.json)
            </span>
            <button
              onClick={() => copyToClipboard(cursorJson, "cursor")}
              className="text-xs text-[#8b949e] hover:text-[#e6edf3] flex items-center gap-1"
            >
              {copiedCursor ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5 text-[#8b949e]" />}
              <span>{copiedCursor ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre className="bg-[#0d1117] p-3 rounded border border-[#30363d] text-[11px] font-mono text-[#e6edf3] overflow-x-auto">
            {cursorJson}
          </pre>
        </div>

        {/* Claude Code Command */}
        <div className="card-simple p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e6edf3] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#3fb950]" /> Claude Code Terminal Command
            </span>
            <button
              onClick={() => copyToClipboard(claudeCommand, "claude")}
              className="text-xs text-[#8b949e] hover:text-[#e6edf3] flex items-center gap-1"
            >
              {copiedClaude ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5 text-[#8b949e]" />}
              <span>{copiedClaude ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre className="bg-[#0d1117] p-3 rounded border border-[#30363d] text-[11px] font-mono text-[#e6edf3] overflow-x-auto whitespace-pre-wrap">
            {claudeCommand}
          </pre>
        </div>
      </div>

      {/* Tools Table */}
      <div className="card-simple overflow-hidden">
        <div className="p-4 border-b border-[#30363d] text-xs font-semibold text-[#e6edf3]">
          Available Telephony Tools for AI Agents
        </div>
        <div className="divide-y divide-[#30363d]/50">
          {tools.map((tool) => (
            <div key={tool.name} className="p-4 space-y-1 hover:bg-[#21262d]/20 transition">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#58a6ff]">{tool.name}</span>
              </div>
              <p className="text-xs text-[#8b949e]">{tool.description}</p>
              <div className="text-[11px] font-mono text-[#8b949e] pt-1">
                Sample arguments: <span className="text-[#e6edf3]">{tool.sampleParams}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
