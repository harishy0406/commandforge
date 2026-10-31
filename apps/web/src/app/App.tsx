import React, { useState, useEffect } from 'react';
import { Sidebar, NavItem } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { OverviewPage } from '../pages/OverviewPage';
import { CommandAssistantPage } from '../pages/CommandAssistantPage';
import { ExecutionHistoryPage } from '../pages/ExecutionHistoryPage';
import { SystemMonitorPage } from '../pages/SystemMonitorPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AboutModal } from '../pages/AboutModal';
import { ApiService } from '../services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [dockerAvailable, setDockerAvailable] = useState(false);
  const [aiProvider, setAiProvider] = useState('Checking...');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const checkHealth = async () => {
    try {
      setIsRefreshing(true);
      const health = await ApiService.getHealth();
      setBackendConnected(health.status === 'healthy');
      setDockerAvailable(Boolean(health.docker_available));
      setAiProvider(health.ai_provider || 'Mock');
    } catch {
      setBackendConnected(false);
      setDockerAvailable(false);
      setAiProvider('Offline');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRecord = (id: string) => {
    setSelectedRecordId(id);
    setCurrentTab('history');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'about') {
            setCurrentTab('about');
          } else {
            setCurrentTab(tab);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        backendConnected={backendConnected}
        dockerAvailable={dockerAvailable}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentTab={currentTab}
          backendConnected={backendConnected}
          dockerAvailable={dockerAvailable}
          aiProvider={aiProvider}
          onRefresh={checkHealth}
          onNavigateAssistant={() => setCurrentTab('assistant')}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentTab === 'overview' && (
            <OverviewPage
              onNavigateAssistant={() => setCurrentTab('assistant')}
              onSelectRecord={handleSelectRecord}
            />
          )}

          {currentTab === 'assistant' && <CommandAssistantPage />}

          {currentTab === 'history' && (
            <ExecutionHistoryPage
              selectedRecordId={selectedRecordId}
              onClearSelectedRecord={() => setSelectedRecordId(null)}
            />
          )}

          {currentTab === 'monitor' && <SystemMonitorPage />}

          {currentTab === 'settings' && <SettingsPage />}

          {/* About Modal */}
          {currentTab === 'about' && (
            <AboutModal onClose={() => setCurrentTab('overview')} />
          )}
        </main>
      </div>
    </div>
  );
};
