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
  Cpu,
  Globe,
  HardDrive,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Lock,
  Zap,
  Terminal,
} from 'lucide-react';
import { ServerSettings, BackendHealth, AIProviderPreset } from '../types/api';
import { ApiService } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [presets, setPresets] = useState<AIProviderPreset[]>([]);

  // AI Configuration state
  const [selectedProvider, setSelectedProvider] = useState('mock');
  const [apiUrl, setApiUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Safety & Retention settings
  const [timeoutSec, setTimeoutSec] = useState(10);
  const [maxOutputKb, setMaxOutputKb] = useState(64);
  const [historyDays, setHistoryDays] = useState(30);

  const [savedNotice, setSavedNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ApiService.getSettings().catch(() => null),
      ApiService.getHealth().catch(() => null),
      ApiService.getAIProviders().catch(() => null),
    ]).then(([s, h, p]) => {
      if (s) {
        setSettings(s);
        setSelectedProvider(s.ai_provider || 'mock');
        setModel(s.ai_model || 'gpt-4o-mini');
        setApiUrl(s.ai_api_url || '');
        setTimeoutSec(s.execution_timeout_seconds || 10);
        setMaxOutputKb(Math.round((s.max_output_bytes || 65536) / 1024));
        setHistoryDays(s.history_retention_days || 30);
      }
      if (h) setHealth(h);
      if (p && p.providers) {
        setPresets(p.providers);
      }
      setLoading(false);
    });
  }, []);

  const handleProviderSelect = (preset: AIProviderPreset) => {
    setSelectedProvider(preset.id);
    setModel(preset.default_model);
    setApiUrl(preset.default_url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updatePayload: Partial<ServerSettings> = {
        ai_provider: selectedProvider,
        ai_model: model,
        ai_api_url: apiUrl,
        execution_timeout_seconds: timeoutSec,
        max_output_bytes: maxOutputKb * 1024,
        history_retention_days: historyDays,
      };

      if (apiKey.trim()) {
        updatePayload.ai_api_key = apiKey.trim();
      }

      const updated = await ApiService.updateSettings(updatePayload);
      setSettings(updated);
      setApiKey(''); // Clear entered secret from UI state after saving
      setSavedNotice(true);

      const h = await ApiService.getHealth().catch(() => null);
      if (h) setHealth(h);

      setTimeout(() => setSavedNotice(false), 3500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPreset = presets.find((p) => p.id === selectedProvider) || presets.find((p) => p.id === 'mock');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Deck: System & Security Status (12 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Backend Health Matrix (8 cols) */}
        <div className="bento-card md:col-span-8 p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="label-micro text-white">Execution Engine Health</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
                health?.status === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              ● {health?.status === 'healthy' ? 'Engine Fully Operational' : 'Offline / Degraded'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <span className="label-micro text-slate-500 block">Version</span>
              <span className="text-slate-200 font-bold mt-1 block">{health?.version || '1.0.0'}</span>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <span className="label-micro text-slate-500 block">Active Engine</span>
              <span className="text-indigo-400 font-bold uppercase mt-1 block truncate">
                {health?.ai_provider || 'Mock / Offline'}
              </span>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <span className="label-micro text-slate-500 block">Model Target</span>
              <span className="text-cyan-300 font-bold truncate mt-1 block">{health?.ai_model || 'Standard'}</span>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <span className="label-micro text-slate-500 block">Sandbox Adapter</span>
              <span className="text-emerald-300 font-bold mt-1 block truncate">
                {health?.execution_adapter || 'Docker Sandbox'}
              </span>
            </div>
          </div>
        </div>

        {/* Zero-Credential Guarantee Deck (4 cols) */}
        <div className="bento-card md:col-span-4 p-5 flex flex-col justify-between space-y-3 bg-gradient-to-br from-indigo-950/20 to-slate-950/80">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <Shield className="h-4 w-4" />
              <span className="label-micro text-indigo-300">Vault Security</span>
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">Zero-Credential Exposure</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              API credentials reside exclusively in server volatile memory or environment variables. No secrets are ever stored in client localStorage.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 p-2.5 text-[11px] text-indigo-300 font-mono">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>Encrypted In-Flight Payload</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bento Provider Gallery (12 cols) */}
        <div className="bento-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <span className="label-micro text-slate-400">Model Routing Matrix</span>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                AI Provider & Free Tier Engines
              </h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Free & Local Providers Supported
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presets.map((preset) => {
              const isSelected = selectedProvider === preset.id;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleProviderSelect(preset)}
                  className={`flex flex-col justify-between text-left rounded-xl p-4 border transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 text-white'
                      : 'border-slate-800/80 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                  )}

                  <div>
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="font-bold text-xs text-slate-100 flex items-center gap-2">
                        {preset.id === 'ollama' ? (
                          <HardDrive className="h-4 w-4 text-cyan-400" />
                        ) : preset.id === 'mock' ? (
                          <Terminal className="h-4 w-4 text-amber-400" />
                        ) : (
                          <Globe className="h-4 w-4 text-indigo-400" />
                        )}
                        {preset.name}
                      </span>
                      {isSelected ? (
                        <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-800" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">
                      {preset.requires_api_key ? 'API Key Required' : 'Zero Key / Offline'}
                    </span>
                    <span className="text-indigo-400 font-semibold uppercase">
                      {preset.id === 'mock' ? 'Offline' : 'Ready'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Asymmetric 2-Column Tuning Deck */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Model & Key Configuration (7 cols) */}
          <div className="bento-card md:col-span-7 p-6 space-y-5">
            <div className="border-b border-slate-800/80 pb-3">
              <span className="label-micro text-slate-400">Endpoint & Model Parameters</span>
              <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                {currentPreset?.name} Configuration
              </h3>
            </div>

            {/* Target Model Name */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Target Model Identifier
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-2.0-flash, llama3.2, deepseek-r1..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none shadow-inner"
                required
              />

              {currentPreset?.recommended_models && currentPreset.recommended_models.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="label-micro text-slate-500 block">Recommended Free Models:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentPreset.recommended_models.map((rec) => (
                      <button
                        type="button"
                        key={rec}
                        onClick={() => setModel(rec)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-all ${
                          model === rec
                            ? 'border-indigo-500 bg-indigo-900/40 text-indigo-200 font-semibold shadow-sm'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Endpoint URL Input */}
            {selectedProvider !== 'mock' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  HTTP Endpoint URL (OpenAI-compatible)
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://... or http://localhost:11434/v1/chat/completions"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none shadow-inner"
                />
              </div>
            )}

            {/* API Key Input */}
            {selectedProvider !== 'mock' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    API Secret Key {currentPreset?.requires_api_key ? '(Required)' : '(Optional for local)'}
                  </label>
                  {settings?.has_ai_api_key && (
                    <span className="text-[11px] font-mono text-emerald-400">
                      Active: {settings.ai_api_key_masked || 'Configured in backend'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      settings?.has_ai_api_key
                        ? 'Enter new secret to replace existing, or leave blank to preserve'
                        : currentPreset?.requires_api_key
                        ? 'Paste API key here...'
                        : 'Not required for local Ollama'
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {currentPreset?.key_hint}
                </p>
              </div>
            )}
          </div>

          {/* Right: Sandbox Quotas & Retention Policy (5 cols) */}
          <div className="bento-card md:col-span-5 p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="border-b border-slate-800/80 pb-3">
                <span className="label-micro text-slate-400">Containment & Retention</span>
                <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                  Sandbox Quotas & Audit Policy
                </h3>
              </div>

              <div className="space-y-4 mt-4">
                {/* Execution Timeout */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Execution Timeout
                    </label>
                    <span className="text-xs font-mono text-indigo-400 font-bold">
                      {timeoutSec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={timeoutSec}
                    onChange={(e) => setTimeoutSec(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Hard SIGKILL after timeout expiration
                  </p>
                </div>

                {/* Max Output Buffer */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Stdout Capture Limit
                    </label>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      {maxOutputKb} KB
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[16, 64, 128, 512].map((kb) => (
                      <button
                        type="button"
                        key={kb}
                        onClick={() => setMaxOutputKb(kb)}
                        className={`rounded-lg py-1 text-xs font-mono border transition-all ${
                          maxOutputKb === kb
                            ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-semibold'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {kb}KB
                      </button>
                    ))}
                  </div>
                </div>

                {/* History Retention Days */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Audit Ledger Retention
                    </label>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {historyDays} Days
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[7, 30, 90].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setHistoryDays(d)}
                        className={`rounded-lg py-1 text-xs font-mono border transition-all ${
                          historyDays === d
                            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 font-mono space-y-1">
              <span className="text-slate-300 font-semibold block">Enforcement Mode:</span>
              <span>• Drop cap: ALL</span>
              <br />
              <span>• Net bridge: DISABLED</span>
            </div>
          </div>
        </div>

        {/* Bottom Bento Action Deck */}
        <div className="bento-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {savedNotice ? (
              <span className="flex items-center gap-2 text-xs text-emerald-400 font-semibold animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" />
                Settings saved successfully! C++ engine and provider router updated.
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-mono">
                Changes take effect immediately on next command synthesis.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-400 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? 'Applying Settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};