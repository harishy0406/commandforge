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
  SystemDiagnostics,
  ValidationResult,
  BatchValidationResponse,
  AIProvidersResponse
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

  static async getAIProviders(): Promise<AIProvidersResponse> {
    const res = await fetch(`${API_BASE}/ai/providers`);
    if (!res.ok) throw new Error(`Failed to load AI providers`);
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

  static async validateBatchCommands(commands: string[]): Promise<BatchValidationResponse> {
    const res = await fetch(`${API_BASE}/commands/validate/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
    if (!res.ok) throw new Error(`Batch validation failed: ${res.statusText}`);
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

  static async getExecutionStatus(id: string): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/commands/execute/${id}`);
    if (!res.ok) throw new Error(`Failed to get execution status: ${res.statusText}`);
    return res.json();
  }

  static async getSystemMetrics(): Promise<SystemMetrics> {
    const res = await fetch(`${API_BASE}/system/metrics`);
    if (!res.ok) throw new Error(`Failed to load metrics`);
    return res.json();
  }

  static async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    const res = await fetch(`${API_BASE}/system/diagnostics`);
    if (!res.ok) throw new Error(`Failed to load system diagnostics`);
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

  static async purgeHistory(olderThanDays = 0): Promise<{ status: string; purged_count: number; older_than_days: number }> {
    const res = await fetch(`${API_BASE}/commands/history/purge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ older_than_days: olderThanDays }),
    });
    if (!res.ok) throw new Error(`Failed to purge history: ${res.statusText}`);
    return res.json();
  }

  static getExportUrl(format: 'csv' | 'json' = 'csv', status?: string, search?: string): string {
    const params = new URLSearchParams({ format });
    if (status && status !== 'all') params.append('status', status);
    if (search && search.trim()) params.append('search', search.trim());
    return `${API_BASE}/commands/history/export?${params.toString()}`;
  }

  static async downloadAuditLog(format: 'csv' | 'json' = 'csv', status?: string, search?: string): Promise<void> {
    const res = await fetch(this.getExportUrl(format, status, search));
    if (!res.ok) throw new Error('Failed to export audit log from server');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const isFiltered = (status && status !== 'all') || Boolean(search && search.trim());
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = `commandforge-audit-log${isFiltered ? '-filtered' : ''}-${dateStamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}
