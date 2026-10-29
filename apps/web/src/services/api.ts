import {
  BackendHealth,
  CommandRecord,
  DashboardSummary,
  ExecutionRequest,
  ExecutionResult,
  GeneratedCommand,
  HistoryResponse,
  ServerSettings,
  SystemMetrics,
  ValidationResult
} from '../types/api';

const API_BASE = '/api';

export class ApiService {
  static async getHealth(): Promise<BackendHealth> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  static async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error(`Failed to load summary: ${res.statusText}`);
    return res.json();
  }

  static async generateCommand(prompt: string, context?: string): Promise<GeneratedCommand> {
    const res = await fetch(`${API_BASE}/commands/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Generation failed: ${res.statusText}`);
    }
    return res.json();
  }

  static async validateCommand(command: string): Promise<ValidationResult> {
    const res = await fetch(`${API_BASE}/commands/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!res.ok) throw new Error(`Validation failed: ${res.statusText}`);
    return res.json();
  }

  static async executeCommand(req: ExecutionRequest): Promise<ExecutionResult> {
    const res = await fetch(`${API_BASE}/commands/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Execution failed: ${res.statusText}`);
    }
    return res.json();
  }

  static async getHistory(page = 1, limit = 20, status?: string, search?: string): Promise<HistoryResponse> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/commands/history?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to load history: ${res.statusText}`);
    return res.json();
  }

  static async getHistoryById(id: string): Promise<CommandRecord> {
    const res = await fetch(`${API_BASE}/commands/history/${id}`);
    if (!res.ok) throw new Error(`Record not found`);
    return res.json();
  }

  static async cancelExecution(id: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/commands/execute/${id}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to cancel execution`);
    return res.json();
  }

  static async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await fetch(`${API_BASE}/system/metrics`);
    if (!res.ok) throw new Error(`Failed to load metrics`);
    return res.json();
  }

  static async getSettings(): Promise<ServerSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error(`Failed to load settings`);
    return res.json();
  }

  static async updateSettings(settings: Partial<ServerSettings>): Promise<ServerSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error(`Failed to update settings`);
    return res.json();
  }
}
