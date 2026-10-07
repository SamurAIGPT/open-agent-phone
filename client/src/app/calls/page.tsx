"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VoiceCall } from "@/lib/types";
import { Dropdown } from "@/components/Dropdown";
import {
  PhoneCall,
  PhoneForwarded,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  FileText,
  X,
  Plus
} from "lucide-react";

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy (Neutral, Balanced)" },
  { value: "echo", label: "Echo (Warm, Confident)" },
  { value: "shimmer", label: "Shimmer (Expressive, Clear)" },
  { value: "ash", label: "Ash (Conversational, Soft)" },
  { value: "verse", label: "Verse (Dynamic, Polished)" },
];

export default function CallsPage() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  // Place Call Form
  const [toNum, setToNum] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Hello, I am your autonomous AI assistant. How can I help you today?");
  const [voiceName, setVoiceName] = useState<string>("alloy");
  const [dialing, setDialing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const data = await api.getCalls();
      setCalls(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load voice calls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleDial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toNum.trim()) return;
    try {
      setDialing(true);
      setError(null);
      await api.initiateCall({
        to_number: toNum.trim(),
        initial_greeting: greeting.trim(),
        voice_name: voiceName,
      });
      setToNum("");
      await fetchCalls();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place call");
    } finally {
      setDialing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#30363d] pb-6">
        <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">Voice Calls & Telephony</h1>
        <p className="text-xs text-[#8b949e] mt-1">
          Initiate outbound AI telephone calls, review live audio sessions, and inspect conversation transcripts.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-xs text-[#f85149]">
          {error}
        </div>
      )}

      {/* Place Call Section */}
      <div className="card-simple p-5">
        <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider mb-3 flex items-center gap-2">
          <PhoneForwarded className="w-4 h-4 text-[#58a6ff]" />
          <span>Place Outbound Call</span>
        </h2>
        <form onSubmit={handleDial} className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <label className="block text-[11px] text-[#8b949e] mb-1">AI Voice Model / Tone</label>
            <Dropdown
              value={voiceName}
              onChange={setVoiceName}
              options={VOICE_OPTIONS}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={dialing || !toNum.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold rounded-md transition disabled:opacity-50"
            >
              <PhoneCall className={`w-3.5 h-3.5 ${dialing ? "animate-pulse" : ""}`} />
              <span>{dialing ? "Dialing..." : "Initiate Call"}</span>
            </button>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] text-[#8b949e] mb-1">Initial AI Greeting</label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </form>
      </div>

      {/* Calls Log Table */}
      <div className="card-simple overflow-hidden">
        <div className="p-4 border-b border-[#30363d] text-xs font-semibold text-[#e6edf3]">
          Call History & Live Streams
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#8b949e]">Loading calls...</div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <PhoneCall className="w-8 h-8 mx-auto opacity-40 text-[#8b949e]" />
            <div className="text-xs font-semibold text-[#e6edf3]">No voice calls recorded</div>
            <p className="text-xs max-w-sm mx-auto">
              Outbound calls placed by the agent or inbound telephone calls will appear here with live transcripts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8b949e] border-b border-[#30363d] bg-[#0d1117]/50">
                  <th className="py-2.5 px-4 font-medium">Direction</th>
                  <th className="py-2.5 px-4 font-medium">From / To</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Duration</th>
                  <th className="py-2.5 px-4 font-medium">Transcript Preview</th>
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50 font-mono text-[11px]">
                {calls.map((c) => (
                  <tr key={c.id} className="hover:bg-[#21262d]/30 transition">
                    <td className="py-3 px-4">
                      {c.direction === "inbound" ? (
                        <span className="flex items-center gap-1 text-[#3fb950] font-semibold">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Inbound
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#58a6ff] font-semibold">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Outbound
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#e6edf3]">
                      <div>{c.to_number}</div>
                      <div className="text-[10px] text-[#8b949e]">via {c.from_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          c.status === "completed"
                            ? "bg-[#238636]/20 text-[#3fb950] border-[#238636]/40"
                            : c.status === "in_progress"
                            ? "bg-[#1f6feb]/20 text-[#58a6ff] border-[#1f6feb]/40 animate-pulse"
                            : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#8b949e]">{c.duration_seconds}s</td>
                    <td className="py-3 px-4 text-[#8b949e] font-sans truncate max-w-xs">
                      {c.transcript || c.summary || "No transcript"}
                    </td>
                    <td className="py-3 px-4 text-[#8b949e]">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedCall(c)}
                        className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs rounded border border-[#30363d] transition flex items-center gap-1 inline-flex"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Transcript</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#58a6ff]" />
                <h3 className="text-xs font-semibold text-[#e6edf3]">Call Session Transcript</h3>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-[#8b949e] hover:text-[#e6edf3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="text-[#8b949e]">
                To: <span className="font-mono text-[#e6edf3]">{selectedCall.to_number}</span>
              </div>
              <div className="text-[#8b949e]">
                Status: <span className="font-mono text-[#3fb950]">{selectedCall.status}</span> · Duration: <span className="font-mono text-[#e6edf3]">{selectedCall.duration_seconds}s</span>
              </div>
            </div>

            <div className="bg-[#0d1117] p-3 rounded-md border border-[#30363d] text-xs font-mono text-[#e6edf3] whitespace-pre-wrap max-h-60 overflow-y-auto">
              {selectedCall.transcript || "No dialogue recorded for this session."}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs rounded font-medium border border-[#30363d]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
