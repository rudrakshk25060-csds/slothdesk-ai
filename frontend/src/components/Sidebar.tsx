import React from 'react';
import {
  LayoutDashboard,
  FolderSync,
  FileText,
  CheckSquare,
  SunMedium,
  History,
  SlidersHorizontal,
  ShieldCheck,
  TreePine
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingTasksCount
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'organizer', label: 'File Organizer', icon: FolderSync },
    { id: 'summaries', label: 'Document Summaries', icon: FileText },
    { id: 'tasks', label: 'Tasks & Deadlines', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : null },
    { id: 'briefing', label: 'Morning Briefing', icon: SunMedium },
    { id: 'activity', label: 'Activity History', icon: History },
    { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-warm-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-screen select-none transition-colors">
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sloth-100 dark:bg-sloth-900/60 flex items-center justify-center text-sloth-700 dark:text-sloth-300 shadow-sm border border-sloth-200 dark:border-sloth-800">
          <TreePine className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-neutral-900 dark:text-white tracking-tight flex items-center gap-1.5 text-base">
            SlothDesk <span className="text-xs px-1.5 py-0.5 rounded bg-sloth-100 dark:bg-sloth-900 text-sloth-800 dark:text-sloth-200 font-medium border border-sloth-200 dark:border-sloth-800">AI</span>
          </h1>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">Slow & steady productivity</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sloth-50 dark:bg-sloth-950/80 text-sloth-800 dark:text-sloth-200 border border-sloth-200 dark:border-sloth-800 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sloth-700 dark:text-sloth-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? 'bg-sloth-200 dark:bg-sloth-800 text-sloth-900 dark:text-sloth-100'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Local Privacy Pledge Badge */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sloth-600 dark:text-sloth-400" />
            <span>100% Local & Private</span>
          </div>
          <p className="leading-relaxed text-[11px] text-neutral-500 dark:text-neutral-500">
            All document text, files, and tasks stay on this computer. Zero telemetry.
          </p>
        </div>
      </div>
    </aside>
  );
};
