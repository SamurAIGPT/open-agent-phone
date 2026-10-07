"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VoiceCall, OperatorQuery } from "@/lib/types";
import { Dropdown } from "@/components/Dropdown";
import {
  PhoneCall,
  PhoneForwarded,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileText,
  X,
  Plus,
  HelpCircle,
  Send,
  CheckCircle,
  PhoneOff,
  Sparkles
} from "lucide-react";

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (Neutral, Balanced)" },
  { value: "echo", label: "Echo (Warm, Confident)" },
  { value: "shimmer", label: "Shimmer (Expressive, Clear)" },
  { value: "ash", label: "Ash (Conversational, Soft)" },
  { value: "verse", label: "Verse (Dynamic, Polished)" },
  { value: "ballad", label: "Ballad (Resonant, Warm)" },
];

const DURATION_OPTIONS = [
  { value: "300", label: "5 minutes (Quick check)" },
  { value: "900", label: "15 minutes (Standard)" },
  { value: "1800", label: "30 minutes (Support queue)" },
  { value: "3600", label: "1 hour (Long bureaucracy)" },
  { value: "7200", label: "2 hours (Maximum ceiling)" },
];

export default function CallsPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  // New Mission Form
  const [toNum, setToNum] = useState<string>("");
  const [task, setTask] = useState<string>("Call restaurant to inquire about reservation for 4 this Friday at 7pm.");
  const [greeting, setGreeting] = useState<string>("Hello, I am calling on behalf of my operator regarding your table availability.");
  const [voiceName, setVoiceName] = useState<string>("alloy");
  const [durationSecs, setDurationSecs] = useState<string>("1800");
  const [dialing, setDialing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Answering Operator Query Modal
  const [answeringQuery, setAnsweringQuery] = useState<{ query: OperatorQuery; callId: string } | null>(null);
  const [answerInput, setAnswerInput] = useState<string>("");
  const [answering, setAnswering] = useState<boolean>(false);

  const fetchCalls = async () => {
    try {
      const data = await api.getCalls();
      setCalls(data);
      if (selectedCall) {
        const updated = data.find((c) => c.id === selectedCall.id);
        if (updated) setSelectedCall(updated);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load voice calls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, [selectedCall?.id]);

  const handleStartMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toNum.trim() || !task.trim()) return;
    try {
      setDialing(true);
      setError(null);
      await api.initiateCall({
        to_number: toNum.trim(),
        task: task.trim(),
        initial_greeting: greeting.trim(),
        voice_name: voiceName,
        policy_max_duration: parseInt(durationSecs, 10),
      });
      setToNum("");
      await fetchCalls();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place call");
    } finally {
      setDialing(false);
    }
  };

  const handleSimulateTurn = async (callId: string) => {
    try {
      await api.simulateVoiceTurn(callId, {
        user_speech: "Yes, we have a table at 7:30 PM. What name should I put it under?",
        agent_speech: "One moment please, let me check with my operator.",
      });
      // also simulate operator query
      await api.createOperatorQuery(callId, {
        question: "The host has a 7:30 PM table instead of 7:00 PM. Do you want to accept 7:30 PM?",
        call_context: "Booking table for 4",
        urgency: "high",
      });
      await fetchCalls();
    } catch (err: unknown) {
      alert("Simulation failed: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleHangUp = async (callId: string) => {
    try {
      await api.completeCall(callId);
      await fetchCalls();
    } catch (err: unknown) {
      alert("Failed to hang up: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const submitAnswer = async () => {
    if (!answeringQuery || !answerInput.trim()) return;
    try {
      setAnswering(true);
      await api.answerOperatorQuery(answeringQuery.query.id, {
        answer: answerInput.trim(),
        answered_via: "dashboard",
      });
      setAnsweringQuery(null);
      setAnswerInput("");
      await fetchCalls();
    } catch (err: unknown) {
      alert("Failed to submit answer: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAnswering(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#30363d] pb-6">
        <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">Voice Missions & Realtime Telephony</h1>
        <p className="text-xs text-[#8b949e] mt-1">
          Autonomous goal-driven AI phone calls with OpenAI Realtime speech, policy duration caps, and Human-in-the-Loop (<code className="text-[#58a6ff]">ask_operator</code>).
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-xs text-[#f85149]">
          {error}
        </div>
      )}

      {/* Start Mission Section */}
      <div className="card-simple p-5">
        <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider mb-3 flex items-center gap-2">
          <PhoneForwarded className="w-4 h-4 text-[#58a6ff]" />
          <span>Launch Autonomous Voice Mission</span>
        </h2>
        <form onSubmit={handleStartMission} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-[#8b949e] mb-1">Destination Phone Number (E.164)</label>
              <input
                type="text"
                placeholder="+15551234567"
                value={toNum}
                onChange={(e) => setToNum(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#8b949e] mb-1">AI Voice Character</label>
              <Dropdown
                value={voiceName}
                onChange={setVoiceName}
                options={VOICE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#8b949e] mb-1">Policy Duration Envelope</label>
              <Dropdown
                value={durationSecs}
                onChange={setDurationSecs}
                options={DURATION_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#8b949e] mb-1">Mission Objective / Task Prompt</label>
            <textarea
              rows={2}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Detailed instructions for what the AI agent should accomplish on the phone..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff] resize-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-[11px] text-[#8b949e] mb-1">Spoken Initial Greeting</label>
              <input
                type="text"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={dialing || !toNum.trim() || !task.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold rounded-md transition disabled:opacity-50 cursor-pointer"
              >
                <PhoneCall className={`w-3.5 h-3.5 ${dialing ? "animate-pulse" : ""}`} />
                <span>{dialing ? "Dialing Mission..." : "Start Mission"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Calls Log Table */}
      <div className="card-simple overflow-hidden">
        <div className="p-4 border-b border-[#30363d] text-xs font-semibold text-[#e6edf3] flex items-center justify-between">
          <span>Active Missions & Call History</span>
          <span className="text-[11px] text-[#8b949e] font-normal">{calls.length} total recorded</span>
        </div>

        {loading && calls.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8b949e]">Loading calls...</div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <PhoneCall className="w-8 h-8 mx-auto opacity-40 text-[#8b949e]" />
            <div className="text-xs font-semibold text-[#e6edf3]">No voice missions recorded</div>
            <p className="text-xs max-w-sm mx-auto">
              Start an outbound mission above or connect via MCP to place automated calls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8b949e] border-b border-[#30363d] bg-[#0d1117]/50">
                  <th className="py-2.5 px-4 font-medium">Mission / Target</th>
                  <th className="py-2.5 px-4 font-medium">Task Objective</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Duration</th>
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50 font-mono text-[11px]">
                {calls.map((c) => {
                  const pendingQ = (c.operator_queries || []).find((q) => q.status === "pending");
                  return (
                    <tr key={c.id} className="hover:bg-[#21262d]/30 transition">
                      <td className="py-3 px-4 text-[#e6edf3]">
                        <div className="font-semibold">{c.to_number}</div>
                        <div className="text-[10px] text-[#8b949e]">ID: {c.id}</div>
                      </td>
                      <td className="py-3 px-4 text-[#8b949e] font-sans max-w-xs truncate">
                        {c.task || c.summary || "General voice call"}
                      </td>
                      <td className="py-3 px-4">
                        {c.status === "needs_operator" ? (
                          <button
                            onClick={() => pendingQ && setAnsweringQuery({ query: pendingQ, callId: c.id })}
                            className="px-2 py-0.5 rounded text-[10px] bg-[#d29922]/20 text-[#f0883e] border border-[#d29922] font-semibold flex items-center gap-1 animate-pulse cursor-pointer"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Needs Operator</span>
                          </button>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border ${
                              c.status === "completed"
                                ? "bg-[#238636]/20 text-[#3fb950] border-[#238636]/40"
                                : c.status === "conversing" || c.status === "in_progress"
                                ? "bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40 animate-pulse"
                                : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                            }`}
                          >
                            {c.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#8b949e]">{c.duration_seconds}s</td>
                      <td className="py-3 px-4 text-[#8b949e]">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-right font-sans space-x-1.5">
                        {/* Simulation turn helper for dev */}
                        {c.status === "conversing" && (
                          <button
                            onClick={() => handleSimulateTurn(c.id)}
                            title="Simulate speech turn & operator question"
                            className="px-2 py-1 bg-[#1f6feb]/10 hover:bg-[#1f6feb]/25 text-[#58a6ff] text-[11px] rounded border border-[#1f6feb]/30 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Simulate</span>
                          </button>
                        )}

                        {/* Hang up button */}
                        {(c.status === "conversing" || c.status === "needs_operator") && (
                          <button
                            onClick={() => handleHangUp(c.id)}
                            title="Hang up call"
                            className="px-2 py-1 bg-[#da3633]/10 hover:bg-[#da3633]/25 text-[#f85149] text-[11px] rounded border border-[#da3633]/30 transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PhoneOff className="w-3 h-3" />
                            <span>End</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedCall(c)}
                          className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-[11px] rounded border border-[#30363d] transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Transcript</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transcript & Mission Inspection Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#58a6ff]" />
                <h3 className="text-sm font-semibold text-[#e6edf3]">Mission Session & Transcript</h3>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-[#8b949e] hover:text-[#e6edf3] text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0d1117] p-3 rounded border border-[#30363d] space-y-1.5 text-xs">
              <div className="text-[#8b949e]">
                <strong className="text-[#e6edf3]">Objective:</strong> {selectedCall.task || "Direct call"}
              </div>
              <div className="flex items-center gap-4 text-[#8b949e]">
                <span>To: <strong className="text-[#e6edf3] font-mono">{selectedCall.to_number}</strong></span>
                <span>Status: <strong className="text-[#58a6ff] font-mono">{selectedCall.status}</strong></span>
                <span>Duration: <strong className="text-[#e6edf3] font-mono">{selectedCall.duration_seconds}s</strong></span>
              </div>
            </div>

            {/* Operator Queries on this call */}
            {selectedCall.operator_queries && selectedCall.operator_queries.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#d29922] flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Operator Queries (Human-in-the-Loop):</span>
                </div>
                {selectedCall.operator_queries.map((q) => (
                  <div key={q.id} className="p-3 bg-[#1c2128] border border-[#d29922]/40 rounded text-xs space-y-1">
                    <div className="text-[#f0883e] font-medium">Q: &ldquo;{q.question}&rdquo;</div>
                    {q.answer ? (
                      <div className="text-[#3fb950]">A: &ldquo;{q.answer}&rdquo; ({q.answered_via})</div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[#8b949e] italic">Awaiting operator response...</span>
                        <button
                          onClick={() => setAnsweringQuery({ query: q, callId: selectedCall.id })}
                          className="px-2 py-0.5 text-xs bg-[#d29922] hover:bg-[#e3b341] text-black font-semibold rounded"
                        >
                          Answer Now
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#0d1117] p-3.5 rounded-md border border-[#30363d] text-xs font-mono text-[#e6edf3] whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
              {selectedCall.transcript || "No dialogue recorded for this session."}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs rounded font-medium border border-[#30363d] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answer Modal */}
      {answeringQuery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-simple p-6 max-w-lg w-full space-y-4 border border-[#d29922] shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#d29922]/20 text-[#f0883e] border border-[#d29922]/40">
                  HUMAN-IN-THE-LOOP (ask_operator)
                </span>
                <h3 className="text-base font-semibold text-[#e6edf3] mt-2">
                  Answer Voice Agent
                </h3>
              </div>
              <button
                onClick={() => setAnsweringQuery(null)}
                className="text-[#8b949e] hover:text-[#e6edf3] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#1c2128] border border-[#30363d] rounded text-sm text-[#e6edf3] font-medium leading-relaxed">
              &ldquo;{answeringQuery.query.question}&rdquo;
            </div>

            <div>
              <label className="block text-xs text-[#8b949e] mb-1.5">
                Your Answer to the Voice Agent:
              </label>
              <textarea
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="e.g. Yes, approve 7:30 PM under name Jane Doe"
                className="w-full h-24 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#58a6ff] focus:outline-none resize-none font-sans"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAnsweringQuery(null)}
                className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitAnswer}
                disabled={answering || !answerInput.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{answering ? "Sending..." : "Submit Answer"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
