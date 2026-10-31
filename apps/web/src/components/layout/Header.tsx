import React from 'react';
import {
  Sparkles,
  Server,
  Cpu,
  RefreshCw,
  Box,
} from 'lucide-react';
import { NavItem } from './Sidebar';

interface HeaderProps {
  currentTab: NavItem;
  backendConnected: boolean;
  dockerAvailable?: boolean;
  aiProvider: string;
  onRefresh: () => void;
  onNavigateAssistant: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  backendConnected,
  dockerAvailable = false,
  aiProvider,
  onRefresh,
  onNavigateAssistant,
  isRefreshing,
}) => {
  const getTabTitle = (tab: NavItem) => {
    switch (tab) {
      case 'overview': return 'Overview Dashboard';
      case 'assistant': return 'Command Assistant';
      case 'history': return 'Execution History';
      case 'monitor': return 'System Monitor';
      case 'settings': return 'Configuration & Settings';
      case 'about': return 'About CommandForge';
      default: return 'CommandForge';
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          {getTabTitle(currentTab)}
        </h1>
        <span className="hidden sm:inline-block h-4 w-px bg-slate-800" />
        <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
          v1.0.0 (C++20 Engine)
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Status Badge */}
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              backendConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400 animate-pulse'
            }`}
          />
          <span className="font-mono text-slate-300">
            {backendConnected ? 'Engine Online' : 'Backend Disconnected'}
          </span>
        </div>

        {/* Sandbox Docker Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
          <Box className={`h-3.5 w-3.5 ${dockerAvailable ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="font-mono text-slate-400 text-[10px]">SANDBOX:</span>
          <span className={`font-medium ${dockerAvailable ? 'text-cyan-300' : 'text-slate-400'}`}>
            {dockerAvailable ? 'Docker Ready' : 'Process Sandbox'}
          </span>
        </div>

        {/* AI Provider Info */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
          <Cpu className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-mono text-slate-400 uppercase text-[10px]">AI:</span>
          <span className="font-medium text-slate-200">{aiProvider}</span>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
          title="Refresh dashboard metrics"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden lg:inline">Refresh</span>
        </button>

        {/* Quick Launch Assistant */}
        {currentTab !== 'assistant' && (
          <button
            onClick={onNavigateAssistant}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Command</span>
          </button>
        )}
      </div>
    </header>
  );
};
