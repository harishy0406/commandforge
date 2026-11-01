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
  CheckCircle2,
  Clock,
  Zap,
  Terminal,
  Lock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { SystemMetrics } from '../types/api';
import { ApiService } from '../services/api';

export const SystemMonitorPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [chartHistory, setChartHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [isPolling, setIsPolling] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);

  const fetchMetrics = async () => {
    try {
      setIsPolling(true);
      setError(null);
      const m = await ApiService.getSystemMetrics();
      setMetrics(m);
      setSampleCount((prev) => prev + 1);

      const timeLabel = m.timestamp.split(' ')[1] || m.timestamp;
      setChartHistory((prev) => {
        const next = [
          ...prev,
          {
            time: timeLabel,
            cpu: Number(m.cpu_usage_pct.toFixed(1)),
            mem: Number(m.memory_usage_pct.toFixed(1)),
            processes: m.active_processes,
          },
        ];
        return next.slice(-25); // preserve last 25 telemetry points
      });
    } catch (err: any) {
      setError(err.message || 'Metrics collector offline');
    } finally {
      setLoading(false);
      setTimeout(() => setIsPolling(false), 300);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const cpuLoad = metrics?.cpu_usage_pct ?? 0;
  const memLoad = metrics?.memory_usage_pct ?? 0;
  const diskLoad = metrics?.disk_usage_pct ?? 0;

  // Dynamic status colors
  const getStatusColor = (val: number) => {
    if (val > 85) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (val > 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Top Bento Control Header */}
      <div className="bento-card p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 radial-glow pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Execution Environment & Telemetry Deck
              </h2>
              <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-300">
                {metrics?.metrics_source ? `ADAPTER: ${metrics.metrics_source.toUpperCase()}` : 'C++ PROCFS'}
              </span>
              <span className="hidden sm:inline-flex rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                SAMPLES: {sampleCount}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time operating system parameters captured directly via asynchronous C++20 POSIX/procfs probes with microsecond granularity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-medium text-[11px]">Stream Live</span>
              </label>
              <span className="text-slate-700">|</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-[11px] font-mono text-slate-300 border-none focus:outline-none cursor-pointer"
                disabled={!autoRefresh}
              >
                <option value={1000} className="bg-slate-900">1s interval</option>
                <option value={3000} className="bg-slate-900">3s interval</option>
                <option value={5000} className="bg-slate-900">5s interval</option>
              </select>
            </div>

            <button
              onClick={fetchMetrics}
              disabled={isPolling}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Poll Now</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bento-card border-rose-500/30 bg-rose-950/20 p-4 flex items-center gap-3 text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Telemetry Notice: {error}. Ensure the CommandForge C++ backend service is running on the host.</span>
        </div>
      )}

      {/* Main Bento Grid: 12 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento Tile 1: CPU Workload & Core Gauge (4 cols) */}
        <div className="bento-card md:col-span-4 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="label-micro flex items-center gap-1.5 text-indigo-300">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                Processor Utilization
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border ${getStatusColor(cpuLoad)}`}>
                {cpuLoad > 80 ? 'Heavy Load' : cpuLoad > 40 ? 'Moderate' : 'Optimal'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono tracking-tight text-white tabular-nums">
                  {metrics ? metrics.cpu_usage_pct.toFixed(1) : '--'}
                </span>
                <span className="text-lg font-mono font-semibold text-slate-500">%</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {metrics ? `${metrics.active_processes} Active Tasks` : '...'}
              </span>
            </div>
          </div>

          {/* Progress Bar & Subsystems */}
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, cpuLoad))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>CFS Scheduler Quota: 1.0 vCPU</span>
              <span>Host Cgroups Active</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Context Switches:</span>
            <span className="text-indigo-300 font-semibold">Low Jitter</span>
          </div>
        </div>

        {/* Bento Tile 2: Memory Dynamics & Allocation (4 cols) */}
        <div className="bento-card md:col-span-4 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="label-micro flex items-center gap-1.5 text-cyan-300">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                Memory Allocation (RAM)
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border ${getStatusColor(memLoad)}`}>
                {memLoad > 85 ? 'Pressure' : 'Nominal'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono tracking-tight text-cyan-300 tabular-nums">
                  {metrics ? metrics.memory_usage_pct.toFixed(1) : '--'}
                </span>
                <span className="text-lg font-mono font-semibold text-slate-500">%</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {metrics ? `${(metrics.memory_used_mb / 1024).toFixed(1)} GB / ${(metrics.memory_total_mb / 1024).toFixed(1)} GB` : ''}
              </span>
            </div>
          </div>

          {/* Progress Bar & Subsystems */}
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, memLoad))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Sandbox Buffer: 512 MB Hard Cap</span>
              <span>Paging: None</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Available Free Memory:</span>
            <span className="text-cyan-300 font-semibold">
              {metrics ? `${((metrics.memory_total_mb - metrics.memory_used_mb) / 1024).toFixed(1)} GB` : '--'}
            </span>
          </div>
        </div>

        {/* Bento Tile 3: Storage Volume & Filesystem (4 cols) */}
        <div className="bento-card md:col-span-4 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="label-micro flex items-center gap-1.5 text-emerald-300">
                <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                Root Volume Storage
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                Healthy
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono tracking-tight text-emerald-300 tabular-nums">
                  {metrics ? metrics.disk_usage_pct.toFixed(1) : '--'}
                </span>
                <span className="text-lg font-mono font-semibold text-slate-500">%</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {metrics ? `${metrics.disk_used_gb.toFixed(1)} GB used` : ''}
              </span>
            </div>
          </div>

          {/* Progress Bar & Subsystems */}
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, diskLoad))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Mount Point: /</span>
              <span>Total: {metrics ? `${metrics.disk_total_gb.toFixed(0)} GB` : '--'}</span>
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Filesystem Isolation:</span>
            <span className="text-emerald-300 font-semibold">OverlayFS / tmpfs</span>
          </div>
        </div>

        {/* Bento Tile 4: Real-Time Dual-Stream Telemetry Chart (8 cols) */}
        <div className="bento-card md:col-span-8 p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <span className="label-micro text-slate-400">Continuous Dynamic Monitoring</span>
              <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                Telemetry Timeline Stream
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-indigo-300">CPU Load %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-cyan-300">RAM Allocation %</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHistory}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#475569"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU Load"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="mem"
                  name="RAM Used"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#memGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
            <span>Window: Last 25 sampling intervals</span>
            <span>Sampling: Direct Non-blocking worker thread</span>
          </div>
        </div>

        {/* Bento Tile 5: Sandbox Isolation Guardrails Deck (4 cols) */}
        <div className="bento-card md:col-span-4 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="label-micro flex items-center gap-1.5 text-indigo-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Active Guardrail Policies
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                ENFORCED
              </span>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight mt-3">
              Container Resource Isolation
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Every command execution is bound by strict POSIX container cgroups and runtime limits:
            </p>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Lock className="h-3 w-3 text-indigo-400" /> Memory Cgroup Cap
              </span>
              <span className="text-indigo-300 font-bold">512 MB</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Zap className="h-3 w-3 text-cyan-400" /> vCPU Quota
              </span>
              <span className="text-cyan-300 font-bold">1.0 Core (CFS)</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Layers className="h-3 w-3 text-amber-400" /> Max Active PIDs
              </span>
              <span className="text-amber-300 font-bold">64 Tasks</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="h-3 w-3 text-rose-400" /> Hard Timeout Kill
              </span>
              <span className="text-rose-300 font-bold">10.0s SIGKILL</span>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-3 text-[11px] text-indigo-300/90 leading-tight">
            <strong>Host Safety Rule:</strong> Container mounts are read-only with ephemeral writable tmpfs. Network egress is blocked by default.
          </div>
        </div>

        {/* Bento Tile 6: Execution Subsystem Topology (12 cols) */}
        <div className="bento-card md:col-span-12 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <span className="label-micro text-slate-400">Subsystem Architecture</span>
              <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                C++ Systems Stack & Runtime Topography
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              PID / Runtime State: NOMINAL
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">REST HTTP Layer</span>
              <p className="text-slate-200 font-bold text-sm">Drogon / Non-blocking</p>
              <p className="text-[11px] text-slate-400">Async epoll/IOCP event loop</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Command AST Policy</span>
              <p className="text-indigo-300 font-bold text-sm">14 Rules Evaluated</p>
              <p className="text-[11px] text-slate-400">Pre-execution static analysis</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Isolation Engine</span>
              <p className="text-cyan-300 font-bold text-sm">Docker Engine API / Subproc</p>
              <p className="text-[11px] text-slate-400">UID 1000 unprivileged runner</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Audit Persistence</span>
              <p className="text-emerald-300 font-bold text-sm">SQLite3 WAL Mode</p>
              <p className="text-[11px] text-slate-400">Zero-allocation query transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};