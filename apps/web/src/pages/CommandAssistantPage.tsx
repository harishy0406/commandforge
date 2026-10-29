import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Copy,
  Check,
  Edit2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Terminal,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
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

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showHighRiskModal, setShowHighRiskModal] = useState(false);
  const [highRiskConfirmed, setHighRiskConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examplePrompts = [
    { title: 'Largest Files', query: 'Find the 10 largest files in the current directory' },
    { title: 'Listening Ports', query: 'Show all listening network ports and owning process' },
    { title: 'Memory Inspection', query: 'Inspect memory usage and available swap' },
    { title: 'Clean Old Logs', query: 'Remove all temporary log files older than 7 days' },
    { title: 'Dangerous Root Wipe (Blocked)', query: 'Recursively force delete system root directory' },
  ];

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

  const handleClear = () => {
    setPrompt('');
    setGenerated(null);
    setEditedCommand('');
    setIsEditing(false);
    setExecutionResult(null);
    setError(null);
    setHighRiskConfirmed(false);
  };

  const executeApproved = async () => {
    const cmdToRun = isEditing ? editedCommand : generated?.command;
    if (!cmdToRun || !generated) return;

    try {
      setIsExecuting(true);
      setError(null);

      const result = await ApiService.executeCommand({
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
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/40">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            HIGH RISK
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/40">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            MEDIUM RISK
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/40">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            LOW RISK
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Input Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-1.5">
            Describe the terminal task you want to execute
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Find all files larger than 100MB modified in the last 24 hours..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 p-4 text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
          </div>
        </div>

        {/* Example prompts */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-400">Quick Try Examples:</span>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setPrompt(ex.query);
                  handleGenerate(ex.query);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-indigo-950/20 hover:text-white transition-all text-left"
              >
                <span className="text-indigo-400 mr-1.5 font-mono">#</span>
                {ex.title}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="kbd bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">Ctrl+Enter</span>
            <span>to synthesize</span>
          </div>
          <div className="flex items-center gap-2">
            {(prompt || generated) && (
              <button
                onClick={handleClear}
                className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:brightness-110 disabled:opacity-50 transition-all"
            >
              <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing...' : 'Generate Command'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300">
          <XCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Notice / Error</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Generated Command Card */}
      {generated && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Audited Command Spec
              </span>
              {getRiskBadge(generated.risk_level)}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isEditing
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                    : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{isEditing ? 'Finish Editing' : 'Edit Command'}</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Code Box */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm shadow-inner">
            {isEditing ? (
              <textarea
                value={editedCommand}
                onChange={(e) => setEditedCommand(e.target.value)}
                rows={2}
                className="w-full bg-transparent text-emerald-300 font-mono text-sm focus:outline-none resize-none"
              />
            ) : (
              <div className="flex items-start gap-3">
                <span className="select-none text-slate-600 font-bold">$</span>
                <span className="text-emerald-400 font-semibold tracking-wide break-all">
                  {editedCommand}
                </span>
              </div>
            )}
          </div>

          {/* Explanation Box */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
              Plain-English Breakdown & Security Assessment
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {generated.explanation}
            </p>
            {generated.risk_reason && (
              <p className="text-xs text-amber-300/90 pt-1 border-t border-slate-800/60">
                <strong className="text-amber-400">Risk Assessment:</strong> {generated.risk_reason}
              </p>
            )}
          </div>

          {/* Suggested Alternatives */}
          {generated.suggested_alternatives && generated.suggested_alternatives.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-400">Alternative Options:</span>
              <div className="space-y-1">
                {generated.suggested_alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    onClick={() => setEditedCommand(alt)}
                    className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-xs font-mono text-slate-300 hover:border-slate-700 hover:bg-slate-900 cursor-pointer transition-colors"
                    title="Click to use this alternative"
                  >
                    <span>{alt}</span>
                    <span className="text-[10px] text-indigo-400 font-sans">Use alternative</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Target Environment: Docker Sandbox (Non-root, Network Disabled)</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleExecuteClick}
                disabled={isExecuting}
                className={`flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all ${
                  generated.risk_level === 'high'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                } disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]`}
              >
                <Play className={`h-4 w-4 fill-white ${isExecuting ? 'animate-spin' : ''}`} />
                <span>{isExecuting ? 'Executing in Container...' : 'Explicitly Approve & Execute'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Output Panel */}
      {executionResult && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-3 w-3 rounded-full bg-rose-500/80" />
              <div className="flex h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="flex h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs text-slate-400">Sandbox Terminal Telemetry</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span
                className={`flex items-center gap-1 font-semibold ${
                  executionResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {executionResult.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span className="uppercase">{executionResult.status}</span>
              </span>
              <span className="text-slate-400">Exit Code: {executionResult.exit_code}</span>
              <span className="text-cyan-400">{executionResult.duration_ms.toFixed(1)} ms</span>
            </div>
          </div>

          <div className="min-h-36 max-h-96 overflow-y-auto text-xs space-y-2 py-2">
            {executionResult.stdout && (
              <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                {executionResult.stdout}
              </pre>
            )}
            {executionResult.stderr && (
              <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">
                {executionResult.stderr}
              </pre>
            )}
            {!executionResult.stdout && !executionResult.stderr && (
              <span className="text-slate-500 italic">[Command produced no standard output or errors]</span>
            )}
          </div>
        </div>
      )}

      {/* High-Risk Confirmation Modal */}
      {showHighRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/50 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="rounded-xl bg-rose-500/20 p-2 border border-rose-500/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">High-Risk Operation Warning</h3>
            </div>

            <p className="text-sm text-slate-300">
              The command you requested performs potentially irreversible or high-impact actions:
            </p>

            <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-rose-300 border border-slate-800 break-all">
              {editedCommand}
            </div>

            <p className="text-xs text-slate-400">
              Execution is restricted to the containerized sandbox, but explicit manual consent is required before dispatching high-impact operations.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
                className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all"
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
