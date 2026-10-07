"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  PhoneCall,
  Sliders,
  Cpu,
  KeySquare
} from "lucide-react";
import { api } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const [activeCalls, setActiveCalls] = useState<number>(0);
  const [extractedCodes, setExtractedCodes] = useState<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await api.getStats();
        setActiveCalls(stats.active_calls);
        setExtractedCodes(stats.codes_extracted);
      } catch {
        // quiet fallback
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Phone Numbers", href: "/numbers", icon: Phone },
    {
      name: "SMS & 2FA Codes",
      href: "/sms",
      icon: MessageSquare,
      badge: extractedCodes > 0 ? extractedCodes : undefined,
    },
    {
      name: "Voice Calls",
      href: "/calls",
      icon: PhoneCall,
      badge: activeCalls > 0 ? activeCalls : undefined,
    },
    { name: "Carrier & Voice", href: "/settings", icon: Sliders },
    { name: "MCP Gateway", href: "/mcp", icon: Cpu },
  ];

  return (
    <aside className="w-56 border-r border-[#30363d] bg-[#161b22] flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#30363d]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#1f6feb] flex items-center justify-center text-white font-bold text-xs">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#e6edf3] tracking-tight">
                Open Agent Phone
              </div>
              <div className="text-[10px] text-[#8b949e]">Voice & SMS Gateway</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#21262d] text-white font-semibold"
                    : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-[#8b949e]" />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Voice Bridge Status Footer */}
      <div className="p-3 border-t border-[#30363d] text-[11px] text-[#8b949e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3fb950] inline-block animate-pulse" />
          <span>Realtime Voice</span>
        </div>
        <span className="text-[10px] font-mono text-[#8b949e]">ONLINE</span>
      </div>
    </aside>
  );
}
