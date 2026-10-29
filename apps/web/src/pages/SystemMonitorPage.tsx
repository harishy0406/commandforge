import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Server,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SystemMetrics } from '../types/api';
import { ApiService } from '../services/api';

export const SystemMonitorPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [chartHistory, setChartHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const m = await ApiService.getSystemMetrics();
      setMetrics(m);

      const timeLabel = m.timestamp.split(' ')[1] || m.timestamp;
      setChartHistory((prev) => {
        const next = [...prev, { time: timeLabel, cpu: m.cpu_usage_pct, mem: m.memory_usage_pct }];
        return next.slice(-20); // keep last 20 points
      });
    } catch (err: any) {
      setError(err.message || 'Metrics unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Execution Environment Telemetry</h2>
            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-400 border border-indigo-500/20">
              {metrics?.metrics_source || 'procfs'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time operating system metrics sampled directly via C++ monitoring adapter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
            />
            <span>Auto-refresh (3s)</span>
          </label>
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Notice: {error}. Check if backend server is running and accessible.</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Utilization</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics ? `${metrics.cpu_usage_pct.toFixed(1)}%` : '...'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, metrics?.cpu_usage_pct || 0)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Real-time aggregate load</span>
        </div>

        {/* Memory */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>RAM Allocation</span>
            <Database className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {metrics ? `${metrics.memory_usage_pct.toFixed(1)}%` : '...'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${Math.min(100, metrics?.memory_usage_pct || 0)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {metrics ? `${(metrics.memory_used_mb / 1024).toFixed(1)} GB / ${(metrics.memory_total_mb / 1024).toFixed(1)} GB` : ''}
          </span>
        </div>

        {/* Disk */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Storage Volume</span>
            <HardDrive className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {metrics ? `${metrics.disk_usage_pct.toFixed(1)}%` : '...'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, metrics?.disk_usage_pct || 0)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {metrics ? `${metrics.disk_used_gb.toFixed(1)} GB of ${metrics.disk_total_gb.toFixed(1)} GB used` : ''}
          </span>
        </div>

        {/* Active Processes */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Processes</span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {metrics ? metrics.active_processes : '...'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-500 w-1/3" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">POSIX task count</span>
        </div>
      </div>

      {/* Historical Telemetry Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Live Telemetry Timeline</h3>
            <p className="text-xs text-slate-400">Last 20 polling cycles</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-indigo-400">● CPU %</span>
            <span className="text-cyan-400">● Memory %</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartHistory}>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="mem" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
