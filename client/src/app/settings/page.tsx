"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CarrierConfig } from "@/lib/types";
import { Dropdown } from "@/components/Dropdown";
import { Sliders, Save, CheckCircle2, ShieldCheck, Radio } from "lucide-react";

const PROVIDER_OPTIONS = [
  { value: "twilio", label: "Twilio Telephony (SMS & Voice)" },
  { value: "telnyx", label: "Telnyx Communications" },
  { value: "46elks", label: "46elks (EU & International)" },
  { value: "simulated", label: "Local Simulated Carrier (Development)" },
];

const MODEL_OPTIONS = [
  { value: "gpt-4o-realtime-preview", label: "OpenAI gpt-4o-realtime-preview" },
  { value: "gpt-4o-mini-realtime-preview", label: "OpenAI gpt-4o-mini-realtime-preview" },
];

const VOICE_OPTIONS = [
  { value: "alloy", label: "Alloy" },
  { value: "echo", label: "Echo" },
  { value: "shimmer", label: "Shimmer" },
  { value: "ash", label: "Ash" },
  { value: "verse", label: "Verse" },
  { value: "ballad", label: "Ballad" },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<Partial<CarrierConfig>>({
    provider: "twilio",
    account_sid: "",
    auth_token_configured: false,
    webhook_url: "",
    openai_api_key_configured: false,
    voice_name: "alloy",
    voice_model: "gpt-4o-realtime-preview",
    realtime_prompt: "You are an autonomous AI voice concierge assisting callers concisely over the phone.",
    enabled: false,
  });

  const [authToken, setAuthToken] = useState<string>("");
  const [openaiKey, setOpenaiKey] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await api.getCarrierConfig();
        setConfig(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const payload: Record<string, unknown> = {
        provider: config.provider,
        account_sid: config.account_sid,
        webhook_url: config.webhook_url,
        voice_name: config.voice_name,
        voice_model: config.voice_model,
        realtime_prompt: config.realtime_prompt,
        enabled: config.enabled,
      };

      if (authToken) payload.auth_token = authToken;
      if (openaiKey) payload.openai_api_key = openaiKey;

      const updated = await api.updateCarrierConfig(payload as Partial<CarrierConfig>);
      setConfig(updated);
      setAuthToken("");
      setOpenaiKey("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-[#8b949e]">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#30363d] pb-6">
        <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">Carrier & Voice Engine Settings</h1>
        <p className="text-xs text-[#8b949e] mt-1">
          Configure telephony credentials (Twilio, Telnyx, 46elks) and the OpenAI Realtime Voice engine for live phone call bridging.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-xs text-[#f85149]">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-[#238636]/10 border border-[#238636]/30 rounded-md text-xs text-[#3fb950] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Carrier and voice settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="card-simple p-6 space-y-5">
        {/* Telephony Provider Block */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
          <div>
            <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider">
              Telephony Carrier
            </h2>
            <p className="text-[11px] text-[#8b949e] mt-0.5">
              Handles outbound SMS delivery and phone network dialing.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-[#e6edf3] font-medium">Enable Carrier</span>
            <input
              type="checkbox"
              checked={Boolean(config.enabled)}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-4 h-4 rounded bg-[#0d1117] border-[#30363d] text-[#1f6feb]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
              Telephony Provider
            </label>
            <Dropdown
              value={config.provider || "twilio"}
              onChange={(val) => setConfig({ ...config, provider: val })}
              options={PROVIDER_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
              Account SID / Client ID
            </label>
            <input
              type="text"
              placeholder="e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={config.account_sid || ""}
              onChange={(e) => setConfig({ ...config, account_sid: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
              Auth Token / Secret
            </label>
            <input
              type="password"
              placeholder={config.auth_token_configured ? "•••••••••••• (Leave blank to keep existing)" : "Enter carrier auth token"}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
              Webhook Public Base URL
            </label>
            <input
              type="text"
              placeholder="e.g. https://your-server.com or ngrok URL"
              value={config.webhook_url || ""}
              onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </div>

        {/* Realtime Voice Engine Block */}
        <div className="pt-4 border-t border-[#30363d] space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Realtime AI Voice Bridge</span>
            </h2>
            <p className="text-[11px] text-[#8b949e] mt-0.5">
              Direct bi-directional audio WebSocket connection for speech synthesis and conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
                OpenAI API Key
              </label>
              <input
                type="password"
                placeholder={config.openai_api_key_configured ? "•••••••••••• (Configured)" : "sk-..."}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
                Voice Model
              </label>
              <Dropdown
                value={config.voice_model || "gpt-4o-realtime-preview"}
                onChange={(val) => setConfig({ ...config, voice_model: val })}
                options={MODEL_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
                Voice Character
              </label>
              <Dropdown
                value={config.voice_name || "alloy"}
                onChange={(val) => setConfig({ ...config, voice_name: val })}
                options={VOICE_OPTIONS}
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-[#e6edf3] mb-1.5">
                Voice Agent System Instructions
              </label>
              <textarea
                rows={3}
                value={config.realtime_prompt || ""}
                onChange={(e) => setConfig({ ...config, realtime_prompt: e.target.value })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#30363d] flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold rounded-md transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
