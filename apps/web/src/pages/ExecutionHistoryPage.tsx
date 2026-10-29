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
  const [copied, setCopied] = useState(false);

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

  // If a record is passed from parent (e.g. from Overview), open modal
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search commands, prompts, or explanations..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="timeout">Timeout</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Prompt</th>
                <th className="py-3 px-4">Command</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Exit Code</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    Loading historical records...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{item.created_at}</td>
                    <td className="py-3 px-4 font-sans text-slate-200 max-w-xs truncate">{item.prompt}</td>
                    <td className="py-3 px-4 text-indigo-300 font-semibold max-w-sm truncate">
                      <code>{item.command}</code>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.risk_level === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : item.risk_level === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          item.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.status === 'success' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.exit_code}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{item.duration_ms.toFixed(1)} ms</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setActiveModalRecord(item)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    No execution records match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          <span>
            Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} records total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-3 py-1.5 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded border border-slate-800 bg-slate-900 px-3 py-1.5 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Execution Detail Modal */}
      {activeModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Execution Record Detail</h3>
              </div>
              <button
                onClick={() => {
                  setActiveModalRecord(null);
                  if (onClearSelectedRecord) onClearSelectedRecord();
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 uppercase">Execution ID:</span>
                <p className="text-slate-200 mt-0.5">{activeModalRecord.id}</p>
              </div>

              <div>
                <span className="text-slate-400 uppercase">Natural Language Request:</span>
                <p className="font-sans text-sm text-white mt-0.5">{activeModalRecord.prompt}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 uppercase">Executed Command:</span>
                  <button
                    onClick={() => handleCopy(activeModalRecord.command)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-emerald-300 whitespace-pre-wrap">
                  {activeModalRecord.command}
                </pre>
              </div>

              <div>
                <span className="text-slate-400 uppercase">Explanation:</span>
                <p className="font-sans text-slate-300 mt-0.5 leading-relaxed">{activeModalRecord.explanation}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-slate-800">
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Status:</span>
                  <p className="capitalize font-bold text-slate-200 mt-0.5">{activeModalRecord.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Exit Code:</span>
                  <p className="font-bold text-slate-200 mt-0.5">{activeModalRecord.exit_code}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Duration:</span>
                  <p className="font-bold text-slate-200 mt-0.5">{activeModalRecord.duration_ms.toFixed(1)} ms</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Timestamp:</span>
                  <p className="font-bold text-slate-200 mt-0.5">{activeModalRecord.created_at}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 uppercase">Standard Output (stdout):</span>
                <pre className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-300 min-h-16 max-h-48 overflow-y-auto whitespace-pre-wrap mt-1">
                  {activeModalRecord.stdout_output || '<no stdout>'}
                </pre>
              </div>

              {activeModalRecord.stderr_output && (
                <div>
                  <span className="text-rose-400 uppercase">Standard Error / Policy Message (stderr):</span>
                  <pre className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-rose-300 min-h-16 max-h-48 overflow-y-auto whitespace-pre-wrap mt-1">
                    {activeModalRecord.stderr_output}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setActiveModalRecord(null);
                  if (onClearSelectedRecord) onClearSelectedRecord();
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
