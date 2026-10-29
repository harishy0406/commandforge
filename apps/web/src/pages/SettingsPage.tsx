import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Clock,
  Server,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ServerSettings, BackendHealth } from '../types/api';
import { ApiService } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [timeoutSec, setTimeoutSec] = useState(10);
  const [maxOutputKb, setMaxOutputKb] = useState(64);
  const [historyDays, setHistoryDays] = useState(30);
  const [savedNotice, setSavedNotice] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ApiService.getSettings().catch(() => null),
      ApiService.getHealth().catch(() => null),
    ]).then(([s, h]) => {
      if (s) {
        setSettings(s);
        setTimeoutSec(s.execution_timeout_seconds || 10);
        setMaxOutputKb(Math.round((s.max_output_bytes || 65536) / 1024));
        setHistoryDays(s.history_retention_days || 30);
      }
      if (h) setHealth(h);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await ApiService.updateSettings({
        execution_timeout_seconds: timeoutSec,
        max_output_bytes: maxOutputKb * 1024,
        history_retention_days: historyDays,
      });
      setSettings(updated);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Backend Health Callout */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">C++ Execution Engine Status</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
              health?.status === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            ● {health?.status || 'Disconnected'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Engine Version</span>
            <span className="text-slate-200 font-bold">{health?.version || '1.0.0'}</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Active AI Provider</span>
            <span className="text-slate-200 font-bold uppercase">{health?.ai_provider || 'Mock / Offline'}</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Isolation Layer</span>
            <span className="text-slate-200 font-bold">{health?.execution_adapter || 'Docker Sandbox'}</span>
          </div>
        </div>
      </div>

      {/* Sensitive Credentials & API Note */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-5 space-y-2 text-xs text-amber-300/90">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <Key className="h-4 w-4" />
          <span>Security Notice: Zero-Credential Exposure Principle</span>
        </div>
        <p className="leading-relaxed">
          CommandForge strictly enforces that AI provider keys (e.g. OpenAI/Anthropic API keys) are configured solely on the backend via environment variables (such as <code>COMMANDFORGE_AI_API_KEY</code>) or secrets managers. API credentials are never transmitted to or stored inside the browser client.
        </p>
      </div>

      {/* Mutable Configuration Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Execution Safety & Retention Policy</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Command Execution Timeout (Seconds)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Number(e.target.value))}
              className="w-full sm:w-48 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Containers exceeding this timeout are automatically terminated with SIGKILL.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Maximum Standard Output Capture (Kilobytes)
            </label>
            <input
              type="number"
              min={4}
              max={1024}
              value={maxOutputKb}
              onChange={(e) => setMaxOutputKb(Number(e.target.value))}
              className="w-full sm:w-48 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Prevents memory exhaustion and log flooding from runaway terminal programs.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              History Retention Period (Days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={historyDays}
              onChange={(e) => setHistoryDays(Number(e.target.value))}
              className="w-full sm:w-48 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Number of days execution audit records are preserved in the SQLite repository.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {savedNotice ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              Settings updated successfully!
            </span>
          ) : <div />}

          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
