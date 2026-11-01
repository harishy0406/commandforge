import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { CommandRecord } from '../types/api';
import { ApiService } from '../services/api';

interface ExecutionHistoryPageProps {
  selectedRecordId?: string | null;
  onClearSelectedRecord?: () => void;
}

export const ExecutionHistoryPage: React.FC<ExecutionHistoryPageProps> = ({
  selectedRecordId,
  onClearSelectedRecord,
}) => {
  const [records, setRecords] = useState<CommandRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeModalRecord, setActiveModalRecord] = useState<CommandRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedModalCmd, setCopiedModalCmd] = useState(false);
  const [copiedModalOut, setCopiedModalOut] = useState(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getHistory(page, 15, statusFilter, searchTerm);
      setRecords(res.records || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, statusFilter]);

  // If a record is selected externally (e.g. from Overview), open modal
  useEffect(() => {
    if (selectedRecordId) {
      ApiService.getHistoryById(selectedRecordId)
        .then((rec) => setActiveModalRecord(rec))
        .catch(console.error);
    }
  }, [selectedRecordId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadHistory();
  };

  const handleCopyCmd = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  // Compute summary stats from loaded records
  const successCount = records.filter((r) => r.status === 'success').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected' || r.status === 'blocked').length;
  const failedCount = records.filter((r) => r.status === 'failed' || r.status === 'timeout').length;
  const avgDuration = records.length > 0
    ? (records.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / records.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Top Bento Header & Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search & Filter Deck (8 cols) */}
        <div className="bento-card md:col-span-8 p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="label-micro text-slate-400">Persistent SQLite Ledger</span>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Execution Audit Trail & History
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg p-1">
              {['all', 'success', 'failed', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by prompt keyword, shell command, or flags..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-24 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                  setTimeout(loadHistory, 0);
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600/30 border border-indigo-500/40 px-2.5 py-1 text-[11px] font-mono font-semibold text-indigo-300 hover:bg-indigo-600/50"
            >
              Search
            </button>
          </form>
        </div>

        {/* Telemetry Quick Summary (4 cols) */}
        <div className="bento-card md:col-span-4 p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="label-micro text-slate-400">Audit Volume</span>
            <span className="text-xs font-mono text-indigo-400 font-semibold">{total} Total</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-2">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Clean</span>
              <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                {records.length > 0 ? `${Math.round((successCount / records.length) * 100)}%` : '--'}
              </span>
            </div>
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-2">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Blocked</span>
              <span className="text-sm font-bold font-mono text-amber-400 tabular-nums">
                {rejectedCount}
              </span>
            </div>
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-2">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Avg Latency</span>
              <span className="text-sm font-bold font-mono text-cyan-300 tabular-nums">
                {avgDuration}ms
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Retained: 30 days SQLite WAL</span>
            <button
              onClick={loadHistory}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bento History Table Deck */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Natural Language Intent</th>
                <th className="py-3 px-4">Synthesized Shell Command</th>
                <th className="py-3 px-4 text-center">Risk</th>
                <th className="py-3 px-4">Sandbox Status</th>
                <th className="py-3 px-4 text-center">Exit Code</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      <span className="text-xs text-slate-400">Loading audit records from SQLite...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-indigo-950/20 transition-colors group cursor-pointer"
                    onClick={() => setActiveModalRecord(item)}
                  >
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {item.created_at}
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-200 max-w-xs truncate text-xs">
                      {item.prompt}
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="flex items-center gap-2">
                        <code className="text-indigo-300 font-semibold truncate block">
                          {item.command}
                        </code>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCmd(item.command, item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5 rounded"
                          title="Copy command"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          item.risk_level === 'high'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : item.risk_level === 'medium'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {item.risk_level}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${
                          item.status === 'success'
                            ? 'text-emerald-400 font-medium'
                            : item.status === 'rejected'
                            ? 'text-amber-400 font-medium'
                            : 'text-rose-400 font-medium'
                        }`}
                      >
                        {item.status === 'success' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : item.status === 'rejected' ? (
                          <ShieldAlert className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          item.exit_code === 0
                            ? 'bg-slate-900 text-slate-300 border border-slate-800'
                            : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.exit_code !== undefined ? item.exit_code : '--'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right text-slate-300 font-mono tabular-nums whitespace-nowrap">
                      {item.duration_ms.toFixed(1)} ms
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalRecord(item);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="View execution forensic details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Terminal className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">No matching audit records</p>
                      <p className="text-xs text-slate-500">
                        Try modifying your search query or reset the filter status.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bento Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 bg-slate-950/70 px-4 py-3 text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-2 font-mono">
            <span>
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>{total} Total Captured Events</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* High-Fidelity Forensic Inspection Modal */}
      {activeModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Execution Forensic Record
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {activeModalRecord.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveModalRecord(null);
                  if (onClearSelectedRecord) onClearSelectedRecord();
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Asymmetric Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
                <span className="label-micro text-slate-500 block">Status</span>
                <span
                  className={`mt-1 font-bold capitalize flex items-center gap-1 ${
                    activeModalRecord.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ● {activeModalRecord.status}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
                <span className="label-micro text-slate-500 block">Risk Rating</span>
                <span className="mt-1 font-bold uppercase text-indigo-300">
                  {activeModalRecord.risk_level}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
                <span className="label-micro text-slate-500 block">Exit Code</span>
                <span className="mt-1 font-bold text-slate-200">
                  {activeModalRecord.exit_code !== undefined ? activeModalRecord.exit_code : '--'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
                <span className="label-micro text-slate-500 block">Duration</span>
                <span className="mt-1 font-bold text-cyan-300 tabular-nums">
                  {activeModalRecord.duration_ms.toFixed(1)} ms
                </span>
              </div>
            </div>

            {/* Natural Language Request */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1">
              <span className="label-micro text-slate-400">Natural Language Intent</span>
              <p className="font-sans text-sm text-white leading-relaxed">
                {activeModalRecord.prompt}
              </p>
            </div>

            {/* Executed Shell Command */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="label-micro text-slate-400">Executed Shell Command</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeModalRecord.command);
                    setCopiedModalCmd(true);
                    setTimeout(() => setCopiedModalCmd(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                >
                  {copiedModalCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedModalCmd ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/90 p-3.5 font-mono text-xs text-emerald-300 whitespace-pre-wrap shadow-inner border-l-4 border-l-indigo-500">
                {activeModalRecord.command}
              </div>
            </div>

            {/* Plain English Explanation */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 space-y-1">
              <span className="label-micro text-slate-400">Policy Rationale & Explanation</span>
              <p className="font-sans text-xs text-slate-300 leading-relaxed">
                {activeModalRecord.explanation || 'No detailed rationale recorded.'}
              </p>
            </div>

            {/* Standard Output (stdout) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="label-micro text-slate-400">Standard Output (stdout)</span>
                {activeModalRecord.stdout_output && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeModalRecord.stdout_output);
                      setCopiedModalOut(true);
                      setTimeout(() => setCopiedModalOut(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-mono"
                  >
                    {copiedModalOut ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedModalOut ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-slate-300 min-h-16 max-h-56 overflow-y-auto whitespace-pre-wrap">
                {activeModalRecord.stdout_output || '<no stdout produced>'}
              </pre>
            </div>

            {/* Standard Error (stderr) if any */}
            {activeModalRecord.stderr_output && (
              <div className="space-y-1.5">
                <span className="label-micro text-rose-400">Standard Error (stderr) / Interception</span>
                <pre className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 font-mono text-xs text-rose-300 min-h-16 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {activeModalRecord.stderr_output}
                </pre>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-500">
                Logged at: {activeModalRecord.created_at}
              </span>
              <button
                onClick={() => {
                  setActiveModalRecord(null);
                  if (onClearSelectedRecord) onClearSelectedRecord();
                }}
                className="rounded-xl bg-slate-900 border border-slate-800 px-5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};