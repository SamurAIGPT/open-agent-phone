"use client";

import { useEffect, useState } from "react";
import { Activity, ExternalLink, HelpCircle, Send } from "lucide-react";
import { api } from "@/lib/api";
import { OperatorQuery } from "@/lib/types";

export function Header() {
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [pendingQueries, setPendingQueries] = useState<OperatorQuery[]>([]);
  const [activeQuery, setActiveQuery] = useState<OperatorQuery | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQueries = async () => {
    try {
      const q = await api.getPendingQueries();
      setPendingQueries(q);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchQueries();
    const interval = setInterval(fetchQueries, 4000);

    let ws: WebSocket | null = null;
    const connect = () => {
      try {
        const wsUrl = "ws://127.0.0.1:8000/v1/ws/live";
        ws = new WebSocket(wsUrl);

        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "operator_query.created" || data.event === "operator_query.answered") {
              fetchQueries();
            }
          } catch {
            // ignore
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connect, 3000);
        };
        ws.onerror = () => setWsConnected(false);
      } catch {
        setWsConnected(false);
      }
    };
    connect();

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const handleAnswer = async () => {
    if (!activeQuery || !answerText.trim()) return;
    setSubmitting(true);
    try {
      await api.answerOperatorQuery(activeQuery.id, {
        answer: answerText.trim(),
        answered_via: "dashboard",
      });
      setActiveQuery(null);
      setAnswerText("");
      await fetchQueries();
    } catch (e: any) {
      alert("Failed to submit answer: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="h-12 border-b border-[#30363d] bg-[#161b22]/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#e6edf3]">Gateway Control Panel</span>
          <span className="text-[#30363d]">/</span>
          <span className="text-[11px] text-[#8b949e]">Autonomous Voice & SMS</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Pending Operator Query Alert Banner */}
          {pendingQueries.length > 0 && (
            <button
              onClick={() => setActiveQuery(pendingQueries[0])}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#d29922]/20 border border-[#d29922] text-[#f0883e] text-xs font-medium animate-pulse hover:bg-[#d29922]/30 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{pendingQueries.length} Action Needed: Agent Asked Operator</span>
            </button>
          )}

          {/* WebSocket Live Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] text-[11px]">
            <Activity
              className={`w-3 h-3 ${
                wsConnected ? "text-[#3fb950] animate-pulse" : "text-[#8b949e]"
              }`}
            />
            <span className="text-[#8b949e]">Event Stream:</span>
            <span className={`font-mono ${wsConnected ? "text-[#3fb950]" : "text-[#f85149]"}`}>
              {wsConnected ? "LIVE" : "DISCONNECTED"}
            </span>
          </div>

          {/* API Docs Link */}
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] flex items-center gap-1 transition"
          >
            <span>OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Operator Query Modal */}
      {activeQuery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-simple p-6 max-w-lg w-full space-y-4 border border-[#d29922] shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#d29922]/20 text-[#f0883e] border border-[#d29922]/40">
                  HUMAN-IN-THE-LOOP (ask_operator)
                </span>
                <h3 className="text-base font-semibold text-[#e6edf3] mt-2">
                  Voice Agent Question
                </h3>
              </div>
              <button
                onClick={() => setActiveQuery(null)}
                className="text-[#8b949e] hover:text-[#e6edf3] text-sm"
              >
                ✕
              </button>
            </div>

            {activeQuery.call_context && (
              <div className="text-xs text-[#8b949e] bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                <strong className="text-[#e6edf3]">Call Context:</strong> {activeQuery.call_context}
              </div>
            )}

            <div className="p-3 bg-[#1c2128] border border-[#30363d] rounded text-sm text-[#e6edf3] font-medium leading-relaxed">
              &ldquo;{activeQuery.question}&rdquo;
            </div>

            <div>
              <label className="block text-xs text-[#8b949e] mb-1.5">
                Your Answer to the Voice Agent:
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="e.g. Yes, approve the booking under name Jane Doe"
                className="w-full h-24 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#58a6ff] focus:outline-none resize-none font-sans"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveQuery(null)}
                className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAnswer}
                disabled={submitting || !answerText.trim()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Sending..." : "Submit Answer to Agent"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
