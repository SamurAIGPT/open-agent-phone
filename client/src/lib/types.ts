export interface PhoneNumber {
  id: string;
  phone_number: string;
  agent_name: string;
  country: string;
  capabilities: string;
  status: "active" | "released";
  carrier: string;
  created_at: string;
}

export interface SmsMessage {
  id: string;
  phone_number_id?: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  body: string;
  status: "received" | "sent" | "delivered" | "failed";
  verification_code?: string;
  created_at: string;
}

export interface LatestCode {
  found: boolean;
  code?: string;
  from_number?: string;
  body?: string;
  received_at?: string;
}

export interface OperatorQuery {
  id: string;
  call_id: string;
  question: string;
  call_context?: string;
  urgency: "normal" | "high";
  status: "pending" | "answered";
  answer?: string;
  asked_at: string;
  answered_at?: string;
  answered_via?: string;
}

export interface VoiceCall {
  id: string;
  call_sid?: string;
  phone_number_id?: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  task?: string;
  policy_max_duration?: number;
  policy_max_cost?: number;
  record_call?: boolean;
  status: "draft" | "dialing" | "connected" | "conversing" | "needs_operator" | "completed" | "failed" | "ringing" | "in_progress";
  duration_seconds: number;
  recording_url?: string;
  transcript?: string;
  summary?: string;
  created_at: string;
  ended_at?: string;
  operator_queries?: OperatorQuery[];
}

export interface CarrierConfig {
  id: string;
  provider: string;
  account_sid: string;
  auth_token_configured: boolean;
  api_key_configured: boolean;
  webhook_url: string;
  elks_configured?: boolean;
  telnyx_configured?: boolean;
  openai_api_key_configured: boolean;
  voice_name: string;
  voice_model: string;
  realtime_prompt: string;
  enabled: boolean;
  updated_at?: string;
}

export interface Stats {
  total_phone_numbers: number;
  total_calls: number;
  active_calls: number;
  total_sms: number;
  codes_extracted: number;
  active_websockets: number;
}
