import {
  PhoneNumber,
  SmsMessage,
  LatestCode,
  VoiceCall,
  CarrierConfig,
  OperatorQuery,
  Stats
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Stats
  getStats: () => request<Stats>("/v1/stats"),

  // Phone Numbers
  getPhoneNumbers: () => request<PhoneNumber[]>("/v1/numbers"),
  createPhoneNumber: (data: { phone_number: string; agent_name: string; country?: string; carrier?: string }) =>
    request<PhoneNumber>("/v1/numbers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deletePhoneNumber: (id: string) =>
    request<void>(`/v1/numbers/${id}`, {
      method: "DELETE",
    }),

  // SMS & 2FA Codes
  getSmsMessages: (filters?: { phone_number_id?: string; direction?: string; has_code?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.phone_number_id) params.append("phone_number_id", filters.phone_number_id);
    if (filters?.direction) params.append("direction", filters.direction);
    if (filters?.has_code !== undefined) params.append("has_code", String(filters.has_code));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<SmsMessage[]>(`/v1/sms${qs}`);
  },
  sendSms: (data: { to_number: string; body: string; phone_number_id?: string }) =>
    request<SmsMessage>("/v1/sms/send", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getLatestCode: () => request<LatestCode>("/v1/sms/latest-code"),
  simulateInboundSms: (data: { from_number: string; to_number: string; body: string }) =>
    request<SmsMessage>("/v1/sms/inbound", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Voice Calls & Missions
  getCalls: (filters?: { status?: string; direction?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.direction) params.append("direction", filters.direction);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<VoiceCall[]>(`/v1/calls${qs}`);
  },
  getCall: (id: string) => request<VoiceCall>(`/v1/calls/${id}`),
  initiateCall: (data: {
    to_number: string;
    task?: string;
    initial_greeting?: string;
    voice_name?: string;
    phone_number_id?: string;
    policy_max_duration?: number;
    policy_max_cost?: number;
    record_call?: boolean;
  }) =>
    request<VoiceCall>("/v1/calls/initiate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  completeCall: (id: string) =>
    request<VoiceCall>(`/v1/calls/${id}/complete`, {
      method: "POST",
    }),
  simulateVoiceTurn: (id: string, data?: { user_speech?: string; agent_speech?: string }) =>
    request<VoiceCall>(`/v1/calls/${id}/simulate-turn?user_speech=${encodeURIComponent(data?.user_speech || "Hello, checking in")}&agent_speech=${encodeURIComponent(data?.agent_speech || "I am on it right away.")}`, {
      method: "POST",
    }),

  // Human-in-the-Loop (Operator Queries)
  getPendingQueries: () => request<OperatorQuery[]>("/v1/calls/queries/pending"),
  createOperatorQuery: (callId: string, data: { question: string; call_context?: string; urgency?: string }) =>
    request<OperatorQuery>(`/v1/calls/${callId}/operator-queries`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  answerOperatorQuery: (queryId: string, data: { answer: string; answered_via?: string }) =>
    request<OperatorQuery>(`/v1/calls/queries/${queryId}/answer`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Carrier Config
  getCarrierConfig: () => request<CarrierConfig>("/v1/carrier"),
  updateCarrierConfig: (data: Partial<CarrierConfig> & Record<string, unknown>) =>
    request<CarrierConfig>("/v1/carrier", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // MCP Info
  getMcpInfo: () => request<Record<string, unknown>>("/mcp/info"),
};
