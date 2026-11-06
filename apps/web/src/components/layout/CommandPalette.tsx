import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Terminal,
  LayoutDashboard,
  Sparkles,
  History,
  Activity,
  Settings,
  Info,
  RefreshCw,
  Shield,
  ArrowRight,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { NavItem } from './Sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavItem) => void;
  onTriggerRefresh: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  description: string;
  category: 'Navigation' | 'Actions';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onTriggerRefresh,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: PaletteItem[] = [
    {
      id: 'nav-overview',
      title: 'Overview Dashboard',
      description: 'System metrics, execution rates, and real-time activity stream',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => onSelectTab('overview'),
    },
    {
      id: 'nav-assistant',
      title: 'Command Assistant',
      description: 'Synthesize verified shell commands using LLM engines',
      category: 'Navigation',
      icon: Sparkles,
      action: () => onSelectTab('assistant'),
      badge: 'AI',
    },
    {
      id: 'nav-history',
      title: 'Execution History',
      description: 'Query persistent SQLite audit records and execution logs',
      category: 'Navigation',
      icon: History,
      action: () => onSelectTab('history'),
    },
    {
      id: 'nav-monitor',
      title: 'System Monitor',
      description: 'Procfs telemetry, CPU/RAM utilization, and cgroups limits',
      category: 'Navigation',
      icon: Activity,
      action: () => onSelectTab('monitor'),
    },
    {
      id: 'nav-settings',
      title: 'Settings & Providers',
      description: 'Configure Gemini, Ollama, OpenRouter, and sandbox quotas',
      category: 'Navigation',
      icon: Settings,
      action: () => onSelectTab('settings'),
    },
    {
      id: 'nav-about',
      title: 'About CommandForge',
      description: 'Architecture specifications and security guarantees',
      category: 'Navigation',
      icon: Info,
      action: () => onSelectTab('about'),
    },
    {
      id: 'act-refresh',
      title: 'Poll Telemetry & Engine Health',
      description: 'Force an immediate telemetry and backend status probe',
      category: 'Actions',
      icon: RefreshCw,
      action: () => onTriggerRefresh(),
      badge: 'Action',
    },
  ];

  const filteredItems = items.filter((item) => {
    const q = query.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3.5 bg-slate-900/60">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page... (or Esc to close)"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="hidden sm:inline-flex rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700/60">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border border-indigo-500/30 text-white shadow-sm'
                      : 'border border-transparent text-slate-300 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-indigo-600/30 text-indigo-300'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300 font-bold uppercase">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-300">
                        <span>Select</span>
                        <CornerDownLeft className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No matching pages or actions found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/80 px-4 py-2 text-[10px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>ESC Dismiss</span>
          </div>
          <span>CommandForge Spotlight</span>
        </div>
      </div>
    </div>
  );
};