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
  Zap,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
    { time: '10m ago', cpu: 12, memory: 28 },
    { time: '8m ago', cpu: 18, memory: 31 },
    { time: '6m ago', cpu: 15, memory: 29 },
    { time: '4m ago', cpu: 25, memory: 35 },
    { time: '2m ago', cpu: 20, memory: 32 },
    { time: 'Now', cpu: summary?.cpu_usage_pct || 14, memory: summary?.memory_usage_pct || 30 },
  ];

  const successRate = summary?.success_rate ?? 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* TOP BENTO ROW: Hero Synthesis Deck (8 cols) + Success Metric Deck (4 cols) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BENTO HERO BANNER (8 cols) */}
        <div className="bento-card lg:col-span-8 p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-mono font-semibold text-indigo-400 border border-indigo-500/25">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Deterministic POSIX Sandbox Isolation</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              AI-Powered Linux Terminal Assistant
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Synthesize natural language into production-grade shell pipelines. Review risk scores, inspect AST rules, and approve execution inside restricted disposable containers.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
            <button
              onClick={onNavigateAssistant}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Launch Command Assistant</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
            </button>

            <span className="text-xs font-mono text-slate-400">
              Ctrl+Enter to prompt from anywhere
            </span>
          </div>
        </div>

        {/* BENTO TILE 2: Safety & Success Metric Deck (4 cols) */}
        <div className="bento-card lg:col-span-4 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="label-micro text-slate-300">Sandbox Reliability Score</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="my-auto py-4 text-center">
            <div className="text-5xl font-extrabold tracking-tight text-emerald-400 tabular-nums">
              {loading ? '...' : `${successRate.toFixed(1)}%`}
            </div>
            <span className="label-micro text-slate-400 mt-2 block">Policy Compliance Rate</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs">
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-white/[0.06]">
              <span className="label-micro text-slate-400 block text-[9px]">Succeeded</span>
              <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                {summary?.successful_executions ?? 0}
              </span>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-2.5 border border-white/[0.06]">
              <span className="label-micro text-slate-400 block text-[9px]">Violations Blocked</span>
              <span className="font-mono text-sm font-bold text-rose-400 tabular-nums">
                {summary?.failed_executions ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 backdrop-blur-md">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Error connecting to backend services: {error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECOND BENTO ROW: 4 Metric Bento Tiles */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Synthesized */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="label-micro">Total Synthesized</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Terminal className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {loading ? '...' : summary?.total_generated ?? 0}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 font-mono">Commands generated by AI</p>
        </div>

        {/* Executed Cleanly */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="label-micro">Executed Cleanly</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 tabular-nums tracking-tight">
            {loading ? '...' : summary?.successful_executions ?? 0}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 font-mono">Sandbox runs (exit 0)</p>
        </div>

        {/* Policy Interceptions */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="label-micro">Interceptions</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-400 tabular-nums tracking-tight">
            {loading ? '...' : summary?.failed_executions ?? 0}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 font-mono">Blocked destructive flags</p>
        </div>

        {/* Avg Duration */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="label-micro">Lifecycle Latency</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-cyan-300 tabular-nums tracking-tight">
            {loading ? '...' : `${summary?.average_duration_ms?.toFixed(1) ?? '0.0'} ms`}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 font-mono">Average execution time</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THIRD BENTO ROW: Resource Timeline (8 cols) + Live Activity Stream (4 cols) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Resource Load Graph Bento (8 cols) */}
        <div className="bento-card lg:col-span-8 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">System Resource Timeline</h3>
              <p className="text-xs text-slate-400">Live container and host CPU/RAM percentage distribution</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                <span>CPU %</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                <span>Memory %</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(13, 18, 30, 0.9)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU Load" />
                <Area type="monotone" dataKey="memory" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" name="Memory Load" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Command Activity Stream (4 cols) */}
        <div className="bento-card lg:col-span-4 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="label-micro text-slate-300">Live Command Audit Stream</span>
              <span className="text-[10px] font-mono text-indigo-400">Recent</span>
            </div>

            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {summary?.recent_activity && summary.recent_activity.length > 0 ? (
                summary.recent_activity.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    onClick={() => onSelectRecord(record.id)}
                    className="group flex flex-col p-2.5 rounded-xl border border-white/[0.06] bg-slate-950/60 hover:border-indigo-500/40 hover:bg-slate-900/80 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-emerald-400 truncate max-w-[200px]">
                        ${record.command}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          record.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 truncate mt-1">
                      {record.prompt || 'Direct shell prompt'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  No execution activity recorded yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onNavigateAssistant}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-slate-950 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:border-indigo-500/40 transition-all"
          >
            <span>Execute New Command</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
