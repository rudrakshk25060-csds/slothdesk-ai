import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { OrganizerView } from './components/OrganizerView';
import { SummariesView } from './components/SummariesView';
import { TasksView } from './components/TasksView';
import { BriefingView } from './components/BriefingView';
import { ActivityView } from './components/ActivityView';
import { SettingsView } from './components/SettingsView';

import {
  DocumentItem,
  TaskItem,
  BriefingData,
  ActivityItem,
  StatsData,
  AIStatusData,
  SettingsData
} from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return (window.localStorage.getItem('slothdesk_theme') as 'light' | 'dark') || 'light';
      }
    } catch {
      // fallback
    }
    return 'light';
  });

  const [stats, setStats] = useState<StatsData | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatusData | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);

  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('slothdesk_theme', theme);
      }
    } catch {
      // fallback
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fetch all live data
  const refreshAllData = async () => {
    try {
      const [
        fetchedStats,
        fetchedAIStatus,
        fetchedDocs,
        fetchedTasks,
        fetchedActivities,
        fetchedSettings,
      ] = await Promise.all([
        api.getStats().catch(() => null),
        api.getAIStatus().catch(() => null),
        api.getDocuments().catch(() => []),
        api.getTasks().catch(() => []),
        api.getActivities().catch(() => []),
        api.getSettings().catch(() => null),
      ]);

      if (fetchedStats) setStats(fetchedStats);
      if (fetchedAIStatus) setAIStatus(fetchedAIStatus);
      setDocuments(fetchedDocs);
      setTasks(fetchedTasks);
      setActivities(fetchedActivities);
      if (fetchedSettings) setSettingsData(fetchedSettings);

      // Attempt to load latest briefing
      api.getLatestBriefing().then(setBriefing).catch(() => setBriefing(null));
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Demo Workspace loader
  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
      await api.loadDemo();
      await refreshAllData();
    } catch (err) {
      console.error('Failed to load demo workspace:', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  // "Let SlothDesk handle it" trigger
  const handleLetSlothHandle = async () => {
    setCurrentTab('organizer');
  };

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="flex h-screen overflow-hidden bg-warm-50 dark:bg-warm-900 text-neutral-800 dark:text-neutral-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          currentTab={currentTab}
          aiStatus={aiStatus}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLoadDemo={handleLoadDemo}
          isDemoLoading={isDemoLoading}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewView
              stats={stats}
              activities={activities}
              upcomingTasks={tasks.filter((t) => !t.completed)}
              aiStatus={aiStatus}
              onNavigate={setCurrentTab}
              onLetSlothHandle={handleLetSlothHandle}
            />
          )}

          {currentTab === 'organizer' && (
            <OrganizerView
              documents={documents}
              onRefreshDocs={() => api.getDocuments().then(setDocuments)}
              onRefreshStats={() => api.getStats().then(setStats)}
            />
          )}

          {currentTab === 'summaries' && (
            <SummariesView
              documents={documents}
              onRefreshDocs={() => api.getDocuments().then(setDocuments)}
              onRefreshStats={() => api.getStats().then(setStats)}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onRefreshTasks={() => api.getTasks().then(setTasks)}
              onRefreshStats={() => api.getStats().then(setStats)}
            />
          )}

          {currentTab === 'briefing' && (
            <BriefingView
              briefing={briefing}
              onRefreshBriefing={() => api.getLatestBriefing().then(setBriefing).catch(() => {})}
              onRefreshStats={() => api.getStats().then(setStats)}
            />
          )}

          {currentTab === 'activity' && (
            <ActivityView
              activities={activities}
              onRefreshActivities={() => api.getActivities().then(setActivities)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settingsData={settingsData}
              aiStatus={aiStatus}
              theme={theme}
              onToggleTheme={toggleTheme}
              onRefreshAll={refreshAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
