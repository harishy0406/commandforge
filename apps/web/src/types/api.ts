export type RiskLevel = 'low' | 'medium' | 'high';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'timeout' | 'rejected' | 'cancelled';

export interface GeneratedCommand {
  command: string;
  explanation: string;
  risk_level: RiskLevel;
  risk_reason: string;
  potentially_destructive: boolean;
  requires_confirmation: boolean;
  suggested_alternatives: string[];
  provider?: string;
  model?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  risk_level: RiskLevel;
  warnings: string[];
  blocked_reasons: string[];
  is_allowed: boolean;
}

export interface ExecutionRequest {
  id?: string;
  command: string;
  prompt: string;
  risk_level: RiskLevel;
  user_approved: boolean;
  timeout_seconds?: number;
}

export interface ExecutionResult {
  id: string;
  status: ExecutionStatus;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  output_truncated: boolean;
  executed_at: string;
  environment: string;
}

export interface CommandRecord {
  id: string;
  prompt: string;
  command: string;
  explanation: string;
  risk_level: string;
  status: string;
  exit_code: number;
  stdout_output: string;
  stderr_output: string;
  duration_ms: number;
  created_at: string;
}

export interface HistoryResponse {
  records: CommandRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SystemMetrics {
  cpu_usage_pct: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_usage_pct: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_usage_pct: number;
  active_processes: number;
  timestamp: string;
  metrics_source: string;
}

export interface DashboardSummary {
  total_generated: number;
  total_executed: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  success_rate: number;
  cpu_usage_pct: number;
  memory_usage_pct: number;
  recent_activity: CommandRecord[];
}

export interface ServerSettings {
  host?: string;
  port?: number;
  ai_provider: string;
  ai_model: string;
  ai_api_url?: string;
  ai_api_key?: string;
  has_ai_api_key?: boolean;
  ai_api_key_masked?: string;
  execution_adapter: string;
  docker_image: string;
  execution_timeout_seconds: number;
  max_output_bytes: number;
  isolation_network_enabled: boolean;
  history_retention_days: number;
  monitoring_interval_ms: number;
}

export interface BackendHealth {
  status: string;
  timestamp: string;
  version: string;
  execution_adapter: string;
  docker_available?: boolean;
  ai_provider: string;
  ai_model?: string;
  has_ai_api_key?: boolean;
}

export interface AIProviderPreset {
  id: string;
  name: string;
  default_url: string;
  default_model: string;
  recommended_models: string[];
  requires_api_key: boolean;
  description: string;
  key_hint: string;
}

export interface AIProvidersResponse {
  active_provider: string;
  active_model: string;
  active_api_url: string;
  has_active_api_key: boolean;
  providers: AIProviderPreset[];
}
