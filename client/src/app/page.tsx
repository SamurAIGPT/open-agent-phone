"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneCall,
  MessageSquare,
  KeySquare,
  ArrowRight,
  Plus,
  Cpu,
  Clock,
  ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { Stats, VoiceCall, SmsMessage, PhoneNumber } from "@/lib/types";

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [recentCalls, setRecentCalls] = useState<VoiceCall[]>([]);
  const [recentSms, setRecentSms] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      const s = await api.getStats();
      setStats(s);

      const nums = await api.getPhoneNumbers();
      setNumbers(nums);

      const calls = await api.getCalls();
      setRecentCalls(calls.slice(0, 5));

      const msgs = await api.getSmsMessages();
      setRecentSms(msgs.slice(0, 5));
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-simple p-4 space-y-1">
          <div className="text-xs text-[#8b949e]">Active Numbers</div>
          <div className="text-2xl font-semibold text-[#e6edf3] font-mono">
            {stats?.total_phone_numbers ?? 0}
          </div>
          <div className="text-[11px] text-[#8b949e]">Assigned agent lines</div>
        </div>

        <div className="card-simple p-4 space-y-1">
          <div className="text-xs text-[#8b949e]">Total Calls</div>
          <div className="text-2xl font-semibold text-[#58a6ff] font-mono">
            {stats?.total_calls ?? 0}
          </div>
          <div className="text-[11px] text-[#8b949e]">
            {stats?.active_calls ?? 0} active now
          </div>
        </div>

        <div className="card-simple p-4 space-y-1">
          <div className="text-xs text-[#8b949e]">SMS Messages</div>
          <div className="text-2xl font-semibold text-[#e6edf3] font-mono">
            {stats?.total_sms ?? 0}
          </div>
          <div className="text-[11px] text-[#8b949e]">Sent & received texts</div>
        </div>

        <div className="card-simple p-4 space-y-1">
          <div className="text-xs text-[#8b949e]">2FA / OTP Extracted</div>
          <div className="text-2xl font-semibold text-[#3fb950] font-mono">
            {stats?.codes_extracted ?? 0}
          </div>
          <div className="text-[11px] text-[#8b949e]">Verification codes parsed</div>
        </div>
      </div>

      {/* Main Grid: Calls & SMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Voice Calls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Voice Calls</span>
            </h2>
            <Link
              href="/calls"
              className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="card-simple divide-y divide-[#30363d] overflow-hidden">
            {recentCalls.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8b949e] space-y-2">
                <PhoneCall className="w-6 h-6 mx-auto opacity-40 text-[#8b949e]" />
                <div>No call logs recorded yet.</div>
                <Link
                  href="/calls"
                  className="inline-flex items-center gap-1 text-xs text-[#58a6ff] hover:underline"
                >
                  <Plus className="w-3 h-3" /> Place outbound call
                </Link>
              </div>
            ) : (
              recentCalls.map((call) => (
                <div key={call.id} className="p-3 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#e6edf3]">{call.to_number}</span>
                      <span className="px-1.5 py-0.2 text-[10px] rounded uppercase bg-[#21262d] text-[#8b949e]">
                        {call.direction}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8b949e] truncate max-w-xs">
                      {call.transcript || call.summary || "No transcript"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        call.status === "completed"
                          ? "bg-[#238636]/20 text-[#3fb950] border-[#238636]/40"
                          : call.status === "in_progress"
                          ? "bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40 animate-pulse"
                          : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                      }`}
                    >
                      {call.status}
                    </span>
                    <div className="text-[10px] text-[#8b949e] mt-1 font-mono">
                      {call.duration_seconds}s
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent SMS & Codes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>SMS & Verification Codes</span>
            </h2>
            <Link
              href="/sms"
              className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="card-simple divide-y divide-[#30363d] overflow-hidden">
            {recentSms.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8b949e] space-y-2">
                <MessageSquare className="w-6 h-6 mx-auto opacity-40 text-[#8b949e]" />
                <div>No SMS messages received yet.</div>
                <Link
                  href="/sms"
                  className="inline-flex items-center gap-1 text-xs text-[#58a6ff] hover:underline"
                >
                  <Plus className="w-3 h-3" /> Send an SMS
                </Link>
              </div>
            ) : (
              recentSms.map((sms) => (
                <div key={sms.id} className="p-3 text-xs flex items-center justify-between">
                  <div className="space-y-0.5 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#e6edf3]">{sms.from_number}</span>
                      {sms.verification_code && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded font-mono font-bold bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40">
                          CODE: {sms.verification_code}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8b949e] truncate">{sms.body}</p>
                  </div>
                  <span className="text-[10px] text-[#8b949e] font-mono shrink-0">
                    {new Date(sms.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MCP Quick Connect Footer */}
      <div className="card-simple p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-semibold text-[#e6edf3] flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-[#58a6ff]" />
            <span>Connect Coding Agents via MCP</span>
          </div>
          <p className="text-[11px] text-[#8b949e]">
            Cursor and Claude Code can dial voice calls, send SMS, and read 2FA codes directly through the local MCP endpoint.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="bg-[#0d1117] px-3 py-1.5 rounded border border-[#30363d] font-mono text-[11px] text-[#8b949e]">
            http://127.0.0.1:8001/mcp/rpc
          </code>
          <Link
            href="/mcp"
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded border border-[#30363d] font-medium transition"
          >
            Instructions
          </Link>
        </div>
      </div>
    </div>
  );
}
