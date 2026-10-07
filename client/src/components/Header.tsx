"use client";

import { useEffect, useState } from "react";
import { Activity, ExternalLink } from "lucide-react";

export function Header() {
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    const connect = () => {
      try {
        const wsUrl = "ws://127.0.0.1:8001/v1/ws/live";
        ws = new WebSocket(wsUrl);

        ws.onopen = () => setWsConnected(true);
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
      if (ws) ws.close();
    };
  }, []);

  return (
    <header className="h-12 border-b border-[#30363d] bg-[#161b22]/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[#e6edf3]">Gateway Control Panel</span>
        <span className="text-[#30363d]">/</span>
        <span className="text-[11px] text-[#8b949e]">Autonomous Voice & SMS</span>
      </div>

      <div className="flex items-center gap-4">
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
          href="http://127.0.0.1:8001/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#8b949e] hover:text-[#e6edf3] flex items-center gap-1 transition"
        >
          <span>OpenAPI Docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  );
}
