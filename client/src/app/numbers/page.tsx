"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PhoneNumber } from "@/lib/types";
import { Dropdown } from "@/components/Dropdown";
import { Phone, Plus, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";

const CARRIER_OPTIONS = [
  { value: "twilio", label: "Twilio Telephony" },
  { value: "telnyx", label: "Telnyx Carrier" },
  { value: "46elks", label: "46elks (EU / Global)" },
  { value: "simulated", label: "Local Simulated Carrier" },
];

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States (+1)" },
  { value: "GB", label: "United Kingdom (+44)" },
  { value: "CA", label: "Canada (+1)" },
  { value: "DE", label: "Germany (+49)" },
  { value: "IN", label: "India (+91)" },
];

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [agentName, setAgentName] = useState<string>("");
  const [carrier, setCarrier] = useState<string>("twilio");
  const [country, setCountry] = useState<string>("US");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const data = await api.getPhoneNumbers();
      setNumbers(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load phone numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !agentName.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.createPhoneNumber({
        phone_number: phoneNumber.trim(),
        agent_name: agentName.trim(),
        carrier,
        country,
      });
      setPhoneNumber("");
      setAgentName("");
      await fetchNumbers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to provision number");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Release phone number ${num}?`)) return;
    try {
      await api.deletePhoneNumber(id);
      await fetchNumbers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete number");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#30363d] pb-6">
        <h1 className="text-xl font-bold text-[#e6edf3] tracking-tight">Agent Phone Numbers</h1>
        <p className="text-xs text-[#8b949e] mt-1">
          Assign dedicated telephone lines to AI agents for two-way voice conversations and SMS message routing.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-md text-xs text-[#f85149]">
          {error}
        </div>
      )}

      {/* Provision Number Form */}
      <div className="card-simple p-5">
        <h2 className="text-xs font-semibold text-[#e6edf3] uppercase tracking-wider mb-3">
          Provision Agent Phone Line
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-[#8b949e] mb-1">Phone Number (E.164)</label>
            <input
              type="text"
              placeholder="+12025550199"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#8b949e] mb-1">Assigned Agent Name</label>
            <input
              type="text"
              placeholder="e.g. Sales Concierge"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#8b949e] mb-1">Carrier Provider</label>
            <Dropdown
              value={carrier}
              onChange={setCarrier}
              options={CARRIER_OPTIONS}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || !phoneNumber.trim() || !agentName.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold rounded-md transition disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? "Provisioning..." : "Assign Line"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Numbers Table */}
      <div className="card-simple overflow-hidden">
        <div className="p-4 border-b border-[#30363d] text-xs font-semibold text-[#e6edf3]">
          Active Lines
        </div>
        {loading ? (
          <div className="p-12 text-center text-xs text-[#8b949e]">Loading numbers...</div>
        ) : numbers.length === 0 ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <Phone className="w-8 h-8 mx-auto opacity-40 text-[#8b949e]" />
            <div className="text-xs font-semibold text-[#e6edf3]">No phone lines provisioned</div>
            <p className="text-xs max-w-sm mx-auto">
              Add a telephone number above to enable AI agents to receive SMS and participate in live phone calls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#8b949e] border-b border-[#30363d] bg-[#0d1117]/50">
                  <th className="py-2.5 px-4 font-medium">Number</th>
                  <th className="py-2.5 px-4 font-medium">Assigned Agent</th>
                  <th className="py-2.5 px-4 font-medium">Carrier</th>
                  <th className="py-2.5 px-4 font-medium">Capabilities</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/50">
                {numbers.map((num) => (
                  <tr key={num.id} className="hover:bg-[#21262d]/30 transition">
                    <td className="py-3 px-4 font-mono text-[#58a6ff] font-medium">
                      {num.phone_number}
                    </td>
                    <td className="py-3 px-4 text-[#e6edf3] font-medium">{num.agent_name}</td>
                    <td className="py-3 px-4 text-[#8b949e] capitalize">{num.carrier}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#e6edf3] border border-[#30363d]">
                          VOICE
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#e6edf3] border border-[#30363d]">
                          SMS
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-[11px] text-[#3fb950]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(num.id, num.phone_number)}
                        className="p-1 text-[#8b949e] hover:text-[#f85149] rounded transition"
                        title="Release number"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
