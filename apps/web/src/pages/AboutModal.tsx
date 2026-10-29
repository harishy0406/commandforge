import React from 'react';
import { Terminal, ShieldCheck, Cpu, Code2, Heart, ExternalLink, X } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white shadow-md">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">About CommandForge</h3>
              <p className="text-xs text-slate-400">AI-Powered Linux Terminal Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>CommandForge</strong> is an open-source terminal assistant built with systems engineering principles. It transforms natural language tasks into verified POSIX shell instructions with integrated security policies.
          </p>

          <div className="grid grid-cols-2 gap-2 py-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <Code2 className="h-3.5 w-3.5" />
                <span>C++20 Core Engine</span>
              </div>
              <p className="text-[11px] text-slate-400">
                High-performance asynchronous REST API, AST policy evaluator, and SQLite3 repository.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Docker Sandbox Isolation</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Commands run exclusively inside non-root, read-only containers with dropped capabilities.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 space-y-1 text-slate-400 text-[11px]">
            <p className="text-slate-200 font-semibold">Key Guarantees:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Raw LLM output is never executed automatically on the host.</li>
              <li>Every command requires explicit interactive human approval.</li>
              <li>Zero credentials or API keys exposed to browser runtime.</li>
              <li>Complete offline demo mode available with zero cloud dependencies.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            MIT License © 2026 CommandForge Contributors
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
