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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Backend Health Callout */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm space-y-3 shadow-xl">
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Engine Version</span>
            <span className="text-slate-200 font-bold">{health?.version || '1.0.0'}</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Active AI Provider</span>
            <span className="text-indigo-400 font-bold uppercase">{health?.ai_provider || 'Mock / Offline'}</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Model</span>
            <span className="text-slate-200 font-bold truncate block">{health?.ai_model || 'Standard'}</span>
          </div>
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase">Isolation Layer</span>
            <span className="text-slate-200 font-bold">{health?.execution_adapter || 'Docker Sandbox'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Provider & Free Tier Configuration Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">AI Provider & Model Configuration</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Free Providers Supported</span>
          </div>

          {/* Provider Preset Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Select AI Engine / Free Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {presets.map((preset) => {
                const isSelected = selectedProvider === preset.id;
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => handleProviderSelect(preset)}
                    className={`flex flex-col text-left rounded-xl p-3 border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-900/20 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                        {preset.id === 'ollama' ? <HardDrive className="h-3.5 w-3.5 text-cyan-400" /> : <Globe className="h-3.5 w-3.5 text-indigo-400" />}
                        {preset.name}
                      </span>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                      {preset.description}
                    </span>
                    <span className="text-[10px] font-mono mt-2 text-indigo-300/80">
                      {preset.requires_api_key ? 'Key required (free)' : 'No key required'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider Details & Recommended Models */}
          {currentPreset && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                <span className="text-xs font-semibold text-slate-200">
                  {currentPreset.name} Settings
                </span>
                <span className="text-xs text-slate-400 italic font-mono">
                  {currentPreset.key_hint}
                </span>
              </div>

              {/* Model Selection & Recommended Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Target Model Name
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gemini-2.0-flash, llama3.2..."
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                {currentPreset.recommended_models && currentPreset.recommended_models.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">Recommended Free Models:</span>
                    {currentPreset.recommended_models.map((rec) => (
                      <button
                        type="button"
                        key={rec}
                        onClick={() => setModel(rec)}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-mono border transition-all ${
                          model === rec
                            ? 'border-indigo-500 bg-indigo-900/50 text-indigo-200'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Endpoint URL Input */}
              {selectedProvider !== 'mock' && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Endpoint URL (OpenAI-compatible)
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://... or http://localhost:11434/v1/chat/completions"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* API Key Input */}
              {selectedProvider !== 'mock' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-300">
                      API Key {currentPreset.requires_api_key ? '(Required)' : '(Optional for local Ollama)'}
                    </label>
                    {settings?.has_ai_api_key && (
                      <span className="text-[11px] font-mono text-emerald-400">
                        Current: {settings.ai_api_key_masked || 'Configured'}
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
                          ? 'Enter new key to replace existing, or leave blank to keep current'
                          : currentPreset.requires_api_key
                          ? 'Paste API key here...'
                          : 'Not required for local Ollama'
                      }
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 pr-10 text-xs font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Keys are transmitted securely to backend in-memory storage only. Never stored in browser localStorage.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Execution Safety & Retention Policy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5 shadow-xl">
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
                max={300}
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
                className="w-full sm:w-48 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Sandboxes exceeding this timeout are automatically terminated.
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
                Settings saved and active AI engine updated!
              </span>
            ) : <div />}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving Configuration...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
