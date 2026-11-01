import React from 'react';
import {
  Terminal,
  ShieldCheck,
  Cpu,
  Code2,
  Heart,
  ExternalLink,
  X,
  Lock,
  Layers,
  Database,
  Sparkles,
} from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-32 radial-glow pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/25">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">CommandForge</h3>
                <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300 font-semibold">
                  v1.0.0 C++20
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI-Powered Linux Terminal Assistant & Sandboxed Execution Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mission Statement */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          <strong>CommandForge</strong> bridges natural language intent with verifiable, safe POSIX shell execution. Engineered with robust C++20 systems architecture, it evaluates command risk via AST static inspection and executes approved instructions in hermetic, unprivileged Docker containers.
        </p>

        {/* Bento Architectural Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Code2 className="h-4 w-4" />
              <span>C++20 Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Non-blocking asynchronous REST API, Drogon framework, sub-millisecond AST parser.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>Hermetic Sandbox</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Docker Engine API adapter, non-root UID 1000, network disabled, read-only rootfs.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Database className="h-4 w-4" />
              <span>Audited Ledger</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Persistent SQLite WAL repository logging every prompt, AST decision, stdout, and stderr.
            </p>
          </div>
        </div>

        {/* Security Contract */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 space-y-2">
          <span className="label-micro text-indigo-300 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Immutable Security Guarantees
          </span>
          <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc list-inside">
            <li>Never executes raw LLM output automatically without explicit approval.</li>
            <li>Zero API keys or secrets stored in browser localStorage or cookies.</li>
            <li>High-risk operations trigger mandatory confirmation dialogs.</li>
            <li>Free and offline AI providers (Ollama, Gemini, Groq, OpenRouter) supported.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400 font-mono">
          <span>MIT License © 2026 CommandForge</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};