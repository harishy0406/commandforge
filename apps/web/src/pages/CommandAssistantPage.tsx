import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Copy,
  Check,
  Edit2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  StopCircle,
  Cpu,
  Layers,
  Lock,
  Zap,
  RotateCcw,
  Shield,
  Activity,
  HardDrive,
  FileCode,
  CornerDownLeft,
} from 'lucide-react';
import { GeneratedCommand, ExecutionResult, RiskLevel } from '../types/api';
import { ApiService } from '../services/api';

export const CommandAssistantPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCommand | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCommand, setEditedCommand] = useState('');
  const [copied, setCopied] = useState(false);
  const [outputCopied, setOutputCopied] = useState(false);

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showHighRiskModal, setShowHighRiskModal] = useState(false);
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active AI Engine Info
  const [activeProvider, setActiveProvider] = useState<string>('');
  const [activeModel, setActiveModel] = useState<string>('');
  const [isDockerReady, setIsDockerReady] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ApiService.getHealth()
      .then((h) => {
        setActiveProvider(h.ai_provider || 'Mock');
        setActiveModel(h.ai_model || 'rules-v1');
        setIsDockerReady(Boolean(h.docker_available));
      })
      .catch(() => {});
  }, []);

  const examplePrompts = [
    { tag: 'DISK', title: 'Top 10 Largest Files', query: 'Find the 10 largest files in the current directory' },
    { tag: 'NET', title: 'Listening Ports & Process', query: 'Show all listening network ports and owning process' },
    { tag: 'MEM', title: 'Top RAM Consuming Tasks', query: 'Inspect memory usage and list top memory consuming processes' },
    { tag: 'CLEAN', title: 'Prune Logs > 7 Days', query: 'Remove all temporary log files older than 7 days' },
    { tag: 'TEST', title: 'Blocked Root Wipe', query: 'Recursively force delete system root directory' },
  ];

  // Re-assess risk whenever editedCommand changes
  useEffect(() => {
    if (!generated || !isEditing) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!editedCommand.trim()) return;
      try {
        const val = await ApiService.validateCommand(editedCommand);
        setGenerated((prev) => {
          if (!prev) return null;
          const blocked = val.blocked_reasons && val.blocked_reasons.length > 0;
          return {
            ...prev,
            command: editedCommand,
            risk_level: val.risk_level,
            risk_reason: blocked
              ? val.blocked_reasons[0]
              : val.warnings.length > 0
              ? val.warnings[0]
              : 'Safe command verified by AST policy engine.',
            requires_confirmation: val.risk_level === 'high',
            potentially_destructive: blocked || val.risk_level === 'high' || val.warnings.length > 0,
          };
        });
      } catch {
        // Ignore live validation errors
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editedCommand, isEditing]);

  const handleGenerate = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q.trim()) return;

    try {
      setIsGenerating(true);
      setError(null);
      setExecutionResult(null);
      setHighRiskConfirmed(false);

      const res = await ApiService.generateCommand(q);
      setGenerated(res);
      setEditedCommand(res.command);
      setIsEditing(false);
      if (res.provider) setActiveProvider(res.provider);
      if (res.model) setActiveModel(res.model);
    } catch (err: any) {
      setError(err.message || 'Failed to generate command');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const cmd = isEditing ? editedCommand : generated?.command;
    if (cmd) {
      navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyOutput = () => {
    if (!executionResult) return;
    const output = [executionResult.stdout, executionResult.stderr].filter(Boolean).join('\n');
    if (output) {
      navigator.clipboard.writeText(output);
      setOutputCopied(true);
      setTimeout(() => setOutputCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setPrompt('');
    setGenerated(null);
    setEditedCommand('');
    setIsEditing(false);
    setExecutionResult(null);
    setError(null);
    setHighRiskConfirmed(false);
    setActiveExecutionId(null);
  };

  const handleCancelExecution = async () => {
    if (!activeExecutionId) return;
    try {
      setIsCancelling(true);
      await ApiService.cancelExecution(activeExecutionId);
    } catch (err: any) {
      console.warn('Cancel failed:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const executeApproved = async () => {
    const cmdToRun = isEditing ? editedCommand : generated?.command;
    if (!cmdToRun || !generated) return;

    const execId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    setActiveExecutionId(execId);

    try {
      setIsExecuting(true);
      setError(null);

      const result = await ApiService.executeCommand({
        id: execId,
        command: cmdToRun,
        prompt: prompt || 'Direct execution',
        risk_level: generated.risk_level,
        user_approved: true,
      });

      setExecutionResult(result);
      setShowHighRiskModal(false);
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setIsExecuting(false);
      setActiveExecutionId(null);
    }
  };

  const handleExecuteClick = () => {
    if (!generated) return;
    if (generated.risk_level === 'high' && !highRiskConfirmed) {
      setShowHighRiskModal(true);
    } else {
      executeApproved();
    }
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-mono font-bold text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
            CRITICAL / HIGH RISK
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-mono font-bold text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            MODIFIES FILES / MEDIUM
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.12)]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            SAFE / READ-ONLY
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* TOP BENTO ROW: Natural Language Synthesizer (8 cols) + Sandbox Telemetry (4 cols) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BENTO TILE 1: Primary Command Synthesis Deck */}
        <div className="bento-card lg:col-span-8 p-6 flex flex-col justify-between">
          <div>
            {/* Top Bar inside card */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">Command Synthesis Terminal</h2>
                  <span className="label-micro text-slate-400 block">Natural Language to POSIX Pipeline</span>
                </div>
              </div>

              {/* Active Provider Tag */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1 border border-white/[0.08] text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                  <span className="label-micro text-indigo-300 uppercase">{activeProvider || 'Mock'}</span>
                  {activeModel && <span className="font-mono text-[11px] text-slate-400">({activeModel})</span>}
                </div>
                {(prompt || generated) && (
                  <button
                    onClick={handleClear}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                    title="Clear prompt and results"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Input Form */}
            <div className="mt-4 relative">
              <div className="relative rounded-xl border border-white/[0.08] bg-slate-950/90 p-3.5 shadow-inner focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
                <div className="flex items-start gap-2.5">
                  <span className="text-indigo-400 font-mono text-sm select-none font-bold pt-0.5">$</span>
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your intent (e.g. 'Find all files larger than 100MB modified in the last 24 hours')..."
                    className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-sans leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleGenerate();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Try Prompt Pills */}
            <div className="mt-4 space-y-1.5">
              <span className="label-micro text-slate-400 block">Quick Inspection Presets:</span>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(ex.query);
                      handleGenerate(ex.query);
                    }}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-950/30 hover:text-white transition-all text-left"
                  >
                    <span className="rounded bg-indigo-500/15 px-1 py-0.5 font-mono text-[9px] font-bold text-indigo-400 border border-indigo-500/20">
                      {ex.tag}
                    </span>
                    <span>{ex.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="kbd bg-slate-950 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-800 text-slate-300">
                Ctrl + Enter
              </span>
              <span>to synthesize</span>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
            >
              <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing...' : 'Synthesize Command'}</span>
              <CornerDownLeft className="h-3.5 w-3.5 opacity-60 ml-0.5" />
            </button>
          </div>
        </div>

        {/* BENTO TILE 2: Sandbox Isolation & Engine Deck */}
        <div className="bento-card lg:col-span-4 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Sandbox Isolation Deck</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                  isDockerReady
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                ● {isDockerReady ? 'Docker Guard' : 'Subprocess Guard'}
              </span>
            </div>

            {/* Sandbox Security Feature Matrix */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Lock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Execution Privilege</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-400 font-semibold">Non-Root (UID 1000)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Network Egress</span>
                </div>
                <span className="font-mono text-[11px] text-rose-400 font-semibold">Drop / Isolated</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Hard Termination</span>
                </div>
                <span className="font-mono text-[11px] text-amber-300 font-semibold tabular-nums">10s (SIGKILL)</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap className="h-3.5 w-3.5 text-purple-400" />
                  <span>Safety AST Policy</span>
                </div>
                <span className="font-mono text-[11px] text-purple-300 font-semibold">14 Strict Rules</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-[11px] text-slate-400 leading-snug">
              Every synthesized command is parsed through deterministic risk rules and executed within ephemeral restricted containers.
            </p>
          </div>
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 backdrop-blur-md">
          <XCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-rose-200 block">Notice / Diagnostic Information</span>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MIDDLE BENTO ROW: Audited Command Terminal (8 cols) + Safety Gauge (4 cols) */}
      {/* ========================================================================= */}
      {generated && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-300">
          
          {/* BENTO TILE 3: Audited Command Terminal */}
          <div className="bento-card lg:col-span-8 p-6 space-y-5">
            {/* Window Chrome Titlebar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="label-micro text-slate-300 pl-2">Audited Command Spec</span>
                {getRiskBadge(generated.risk_level)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-all ${
                    isEditing
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                      : 'border-white/[0.08] bg-slate-950/80 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{isEditing ? 'Save Edit' : 'Edit Command'}</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-slate-950/80 px-3 py-1.5 text-xs font-mono font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-all"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Code Panel */}
            <div className="relative rounded-xl border border-white/[0.08] bg-slate-950 p-4 font-mono text-sm shadow-2xl">
              {isEditing ? (
                <textarea
                  value={editedCommand}
                  onChange={(e) => setEditedCommand(e.target.value)}
                  rows={2}
                  className="w-full bg-transparent text-emerald-300 font-mono text-sm focus:outline-none resize-none leading-relaxed"
                />
              ) : (
                <div className="flex items-start gap-3">
                  <span className="select-none text-slate-600 font-bold">$</span>
                  <span className="text-emerald-400 font-semibold tracking-wide break-all leading-relaxed font-mono">
                    {editedCommand}
                  </span>
                </div>
              )}
            </div>

            {/* Execution Dock */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Explicit user approval required prior to container execution.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {isExecuting && (
                  <button
                    onClick={handleCancelExecution}
                    disabled={isCancelling}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900 transition-all"
                  >
                    <StopCircle className="h-4 w-4" />
                    <span>{isCancelling ? 'Aborting...' : 'Abort Run'}</span>
                  </button>
                )}
                <button
                  onClick={handleExecuteClick}
                  disabled={isExecuting}
                  className={`flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-xl transition-all ${
                    generated.risk_level === 'high'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  } disabled:opacity-40 active:scale-[0.98]`}
                >
                  <Play className={`h-3.5 w-3.5 fill-white ${isExecuting ? 'animate-spin' : ''}`} />
                  <span>{isExecuting ? 'Executing in Container...' : 'Approve & Execute Command'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* BENTO TILE 4: Security Breakdown & Alternatives */}
          <div className="bento-card lg:col-span-4 p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Security Assessment</h3>
                </div>
                <span className="label-micro text-indigo-300">Deterministic</span>
              </div>

              {/* Plain-English Breakdown */}
              <div className="space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {generated.explanation}
                </p>
                {generated.risk_reason && (
                  <div className="rounded-lg bg-slate-950/80 p-3 border border-white/[0.06]">
                    <span className="label-micro text-amber-400 block mb-1">Safety Rationale:</span>
                    <p className="text-xs text-amber-200/90 leading-snug">
                      {generated.risk_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Alternative Suggestions */}
              {generated.suggested_alternatives && generated.suggested_alternatives.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <span className="label-micro text-slate-400 block">Alternative Options:</span>
                  <div className="space-y-1.5">
                    {generated.suggested_alternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setEditedCommand(alt);
                          setIsEditing(false);
                        }}
                        className="group flex items-center justify-between rounded-lg border border-white/[0.06] bg-slate-950/60 px-3 py-2 text-xs font-mono text-slate-300 hover:border-indigo-500/40 hover:bg-slate-900 cursor-pointer transition-colors"
                        title="Click to use this alternative command"
                      >
                        <span className="truncate">{alt}</span>
                        <span className="text-[10px] text-indigo-400 font-sans group-hover:underline shrink-0 ml-2">Use</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.06] text-[10px] text-slate-400 font-mono">
              Engine Tag: <span className="text-slate-300">{generated.provider || activeProvider}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM BENTO ROW: Terminal Telemetry & Console Log (Full Width 12 cols) */}
      {/* ========================================================================= */}
      {executionResult && (
        <div className="bento-card p-6 space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="label-micro text-slate-300 pl-2">Sandbox Terminal Telemetry</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 rounded-md bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white border border-white/[0.08] transition-colors"
                title="Copy terminal output"
              >
                {outputCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{outputCopied ? 'Copied' : 'Copy Output'}</span>
              </button>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                  executionResult.status === 'success'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {executionResult.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span className="uppercase">{executionResult.status}</span>
              </span>

              <span className="text-slate-400 tabular-nums">Exit Code: {executionResult.exit_code}</span>
              <span className="text-cyan-400 font-bold tabular-nums">{executionResult.duration_ms.toFixed(1)} ms</span>
            </div>
          </div>

          <div className="min-h-36 max-h-96 overflow-y-auto text-xs space-y-2 py-2">
            {executionResult.stdout && (
              <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                {executionResult.stdout}
              </pre>
            )}
            {executionResult.stderr && (
              <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed font-mono">
                {executionResult.stderr}
              </pre>
            )}
            {!executionResult.stdout && !executionResult.stderr && (
              <span className="text-slate-500 italic">[Command finished with no stdout/stderr output]</span>
            )}
          </div>
        </div>
      )}

      {/* High-Risk Confirmation Modal */}
      {showHighRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="rounded-xl bg-rose-500/20 p-2.5 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">High-Risk Operation Warning</h3>
            </div>

            <p className="text-sm text-slate-300">
              The command you requested performs potentially irreversible or high-impact actions:
            </p>

            <div className="rounded-xl bg-slate-950 p-3.5 font-mono text-xs text-rose-300 border border-white/[0.08] break-all">
              {editedCommand}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Execution is restricted to the containerized sandbox, but explicit manual consent is required before dispatching high-impact operations.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button
                onClick={() => setShowHighRiskModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setHighRiskConfirmed(true);
                  executeApproved();
                }}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all"
              >
                I Understand, Execute Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
