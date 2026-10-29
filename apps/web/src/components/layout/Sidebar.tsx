import React from 'react';
import {
  Terminal,
  LayoutDashboard,
  Sparkles,
  History,
  Activity,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type NavItem = 'overview' | 'assistant' | 'history' | 'monitor' | 'settings' | 'about';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  backendConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  backendConnected,
}) => {
  const navItems = [
    { id: 'overview' as NavItem, label: 'Overview', icon: LayoutDashboard },
    { id: 'assistant' as NavItem, label: 'Command Assistant', icon: Sparkles, badge: 'AI' },
    { id: 'history' as NavItem, label: 'Execution History', icon: History },
    { id: 'monitor' as NavItem, label: 'System Monitor', icon: Activity },
    { id: 'settings' as NavItem, label: 'Settings', icon: Settings },
    { id: 'about' as NavItem, label: 'About CommandForge', icon: Info },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-800/80 bg-slate-950 transition-all duration-300 z-20 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/20">
            <Terminal className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CommandForge
              </span>
              <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-medium">
                Terminal AI Agent
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-900/20'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Security Isolation Status Footer */}
      <div className="p-3 border-t border-slate-800/80">
        <div
          className={`flex items-center gap-2.5 rounded-lg border p-2.5 ${
            backendConnected
              ? 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300'
              : 'border-amber-500/20 bg-amber-950/20 text-amber-300'
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col text-xs leading-tight truncate">
              <span className="font-semibold truncate">
                {backendConnected ? 'Sandbox Active' : 'Offline / Standby'}
              </span>
              <span className="text-[10px] opacity-75 truncate">
                {backendConnected ? 'Docker Container Guard' : 'Connecting to API...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
