"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SmsMessage, LatestCode } from "@/lib/types";
import { Dropdown } from "@/components/Dropdown";
import {
  MessageSquare,
  Send,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Plus,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight
} from "lucide-react";

const FILTER_OPTIONS = [
  { value: "all", label: "All Messages" },
  { value: "codes_only", label: "Verification Codes Only (OTP)" },
  { value: "inbound", label: "Inbound Received" },
  { value: "outbound", label: "Outbound Sent" },
];

export default function SmsPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [latestCode, setLatestCode] = useState<LatestCode | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  // Send SMS Form
  const [toNum, setToNum] = useState<string>("");
  const [smsBody, setSmsBody] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isCodesOnly = filter === "codes_only";
      const directionFilter = filter === "inbound" || filter === "outbound" ? filter : undefined;

      const msgs = await api.getSmsMessages({
        has_code: isCodesOnly ? true : undefined,
        direction: directionFilter,
      });
      setMessages(msgs);

      const code = await api.getLatestCode();
      setLatestCode(code);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load SMS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toNum.trim() || !smsBody.trim()) return;
    try {
      setSending(true);
      setError(null);
      await api.sendSms({
        to_number: toNum.trim(),
        body: smsBody.trim(),
      });
      setToNum("");
      setSmsBody("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#30363d] pb-6">
        <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">SMS & 2FA Verification Codes</h1>
        <p className="text-xs text-[#8b949e] mt-1">
          Two-way SMS text messaging with automated heuristic extraction of one-time login passwords (OTPs) and security verification codes.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-xs text-[#f85149]">
          {error}
        </div>
      )}

      {/* Latest Verification Code Banner (Inspired by AgenticMail) */}
      <div className="card-simple p-5 border-[#3fb950]/30 bg-[#238636]/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3fb950]">
            <KeyRound className="w-4 h-4" />
            <span>Latest Extracted Verification Code</span>
          </div>
          <button
            onClick={fetchData}
            className="p-1 text-[#8b949e] hover:text-[#e6edf3] transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {latestCode?.found && latestCode.code ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1117] p-3 rounded-md border border-[#30363d]">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold font-mono tracking-widest text-[#e6edf3]">
                  {latestCode.code}
                </span>
                <span className="text-[11px] font-mono text-[#8b949e]">
                  From: {latestCode.from_number}
                </span>
              </div>
              <p className="text-xs text-[#8b949e] italic truncate max-w-lg">
                &ldquo;{latestCode.body}&rdquo;
              </p>
            </div>
            <button
              onClick={() => copyCode(latestCode.code!)}
              className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs font-semibold rounded border border-[#30363d] transition flex items-center gap-1.5 self-start sm:self-center shrink-0"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? "Copied" : "Copy Code"}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 text-xs text-[#8b949e] bg-[#0d1117] rounded-md border border-[#30363d]">
            No verification codes parsed yet. When an SMS containing an OTP (e.g. from Google, Twilio, GitHub) arrives, it will appear here automatically.
          </div>
        )}
      </div>

      {/* Send SMS Section */}
      <div className="card-simple p-5">
        <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider mb-3">
          Dispatch Outbound SMS
        </h2>
        <form onSubmit={handleSend} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-[#8b949e] mb-1">Destination Number (E.164)</label>
              <input
                type="text"
                placeholder="+15551234567"
                value={toNum}
                onChange={(e) => setToNum(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] text-[#8b949e] mb-1">Message Body</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Hello, your requested confirmation code is 882103."
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                />
                <button
                  type="submit"
                  disabled={sending || !toNum.trim() || !smsBody.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold rounded-md transition disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? "Sending..." : "Send"}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Messages Feed */}
      <div className="card-simple overflow-hidden">
        <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#e6edf3]">SMS Message Log</span>
          <div className="w-56">
            <Dropdown
              value={filter}
              onChange={setFilter}
              options={FILTER_OPTIONS}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#8b949e]">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-[#8b949e]" />
            <div className="text-xs font-semibold text-[#e6edf3]">No SMS messages found</div>
            <p className="text-xs max-w-sm mx-auto">
              Messages received on agent telephone numbers or sent out will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#30363d]/50">
            {messages.map((m) => (
              <div key={m.id} className="p-4 hover:bg-[#21262d]/20 transition flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    {m.direction === "inbound" ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-[#3fb950] font-medium bg-[#3fb950]/10 px-2 py-0.5 rounded border border-[#3fb950]/20">
                        <ArrowDownLeft className="w-3 h-3" /> INBOUND
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] font-medium bg-[#58a6ff]/10 px-2 py-0.5 rounded border border-[#58a6ff]/20">
                        <ArrowUpRight className="w-3 h-3" /> OUTBOUND
                      </span>
                    )}
                    <span className="font-mono text-xs text-[#e6edf3]">{m.from_number}</span>
                    <span className="text-xs text-[#8b949e]">→</span>
                    <span className="font-mono text-xs text-[#e6edf3]">{m.to_number}</span>

                    {m.verification_code && (
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 flex items-center gap-1">
                        <KeyRound className="w-3 h-3" /> {m.verification_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#e6edf3]">{m.body}</p>
                </div>
                <div className="text-right text-[11px] text-[#8b949e] font-mono shrink-0">
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
