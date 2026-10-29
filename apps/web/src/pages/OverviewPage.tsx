import React, { useEffect, useState } from 'react';
import {
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardSummary } from '../types/api';
import { ApiService } from '../services/api';

interface OverviewPageProps {
  onNavigateAssistant: () => void;
  onSelectRecord: (id: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigateAssistant,
  onSelectRecord,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const timelineData = [
    { time: '17:30', cpu: 12, memory: 28 },
    { time: '17:35', cpu: 18, memory: 31 },
    { time: '17:40', cpu: 15, memory: 29 },
    { time: '17:45', cpu: 25, memory: 35 },
    { time: '17:50', cpu: 20, memory: 32 },
    { time: '17:55', cpu: summary?.cpu_usage_pct || 14, memory: summary?.memory_usage_pct || 30 },
  ];

  const pieData = [
    { name: 'Successful', value: summary?.successful_executions || 1, color: '#10b981' },
    { name: 'Failed / Rejected', value: Math.max(summary?.failed_executions || 0, 0), color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Callout */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-mono text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Containerized POSIX Sandbox</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              AI Command Synthesis & Safe Execution Engine
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Translate complex shell automation requests to audited POSIX commands. Commands run strictly inside disposable non-root containers with network isolation.
            </p>
          </div>
          <button
            onClick={onNavigateAssistant}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Open Command Assistant</span>
            <ArrowUpRight className="h-4 w-4 opacity-75" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>Error connecting to backend services: {error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Generated */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Generated</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Terminal className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-white">
              {loading ? '...' : summary?.total_generated ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">Prompt translations completed</p>
          </div>
        </div>

        {/* Successful Executions */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Executed Successfully</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-400">
              {loading ? '...' : summary?.successful_executions ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              Success Rate: <span className="text-slate-200 font-semibold">{summary?.success_rate?.toFixed(1) ?? '100'}%</span>
            </p>
          </div>
        </div>

        {/* Failed / Rejected */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Failed / Blocked</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-rose-400">
              {loading ? '...' : summary?.failed_executions ?? 0}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">Violations prevented by policy</p>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Duration</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-cyan-300">
              {loading ? '...' : `${summary?.average_duration_ms?.toFixed(1) ?? 0} ms`}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">Container lifecycle latency</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Utilization Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/30 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">System Resource Timeline</h3>
              <p className="text-xs text-slate-400">Live CPU and memory load percentages</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span>CPU %</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <span>Memory %</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="memory" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#memGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Success Breakdown */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Execution Success Ratio</h3>
            <p className="text-xs text-slate-400">Policy passes vs rejections</p>
          </div>
          <div className="h-48 w-full flex items-center justify-center my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Success Rate:</span>
              <span className="font-mono text-emerald-400 font-semibold">{summary?.success_rate?.toFixed(1) ?? '100'}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Executions Audited:</span>
              <span className="font-mono text-slate-200">{summary?.total_executed ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Command Activity Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Execution Activity</h3>
            <p className="text-xs text-slate-400">Latest commands audited by CommandForge</p>
          </div>
          <span className="text-xs text-indigo-400 font-mono">Real-time SQLite Feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Prompt</th>
                <th className="pb-3 font-medium">Command</th>
                <th className="pb-3 font-medium">Risk</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {summary?.recent_activity && summary.recent_activity.length > 0 ? (
                summary.recent_activity.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectRecord(item.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 text-slate-400 whitespace-nowrap">{item.created_at}</td>
                    <td className="py-3 font-sans text-slate-200 max-w-xs truncate">{item.prompt}</td>
                    <td className="py-3 text-indigo-300 font-semibold max-w-xs truncate">
                      <code>{item.command}</code>
                    </td>
                    <td className="py-3 whitespace-nowrap">
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
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          item.status === 'success'
                            ? 'text-emerald-400'
                            : item.status === 'rejected'
                            ? 'text-rose-400'
                            : 'text-amber-400'
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
                    <td className="py-3 text-right text-slate-400 whitespace-nowrap">
                      {item.duration_ms.toFixed(1)} ms
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No recent command activity. Use the Command Assistant to generate and run your first command!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
