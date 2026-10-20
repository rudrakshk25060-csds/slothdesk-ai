import React from 'react';
import { Moon, Sun, Cpu, FlaskConical } from 'lucide-react';
import { AIStatusData } from '../types';

interface HeaderProps {
  currentTab: string;
  aiStatus: AIStatusData | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLoadDemo: () => void;
  isDemoLoading: boolean;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview Dashboard',
    subtitle: 'Calm, steady oversight of your digital workspace',
  },
  organizer: {
    title: 'File Organizer',
    subtitle: 'Categorize files and propose clear filenames with explicit approval',
  },
  summaries: {
    title: 'Document Summaries',
    subtitle: 'Read PDFs and text files, extract deadlines, and copy markdown',
  },
  tasks: {
    title: 'Tasks & Deadlines',
    subtitle: 'Manage prioritized action items extracted from your documents',
  },
  briefing: {
    title: 'Morning Briefing',
    subtitle: 'A focused, deliberate daily agenda generated from real tasks',
  },
  activity: {
    title: 'Activity History',
    subtitle: 'Immutable audit log of filesystem actions and summaries',
  },
  settings: {
    title: 'Settings & Privacy',
    subtitle: 'Configure local Gemma 3 4B, manage storage, and export data',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  aiStatus,
  theme,
  onToggleTheme,
  onLoadDemo,
  isDemoLoading,
}) => {
  const meta = TAB_TITLES[currentTab] || {
    title: 'SlothDesk AI',
    subtitle: 'Personal desktop productivity assistant',
  };

  const isModelActive = aiStatus?.available === true;

  return (
    <header className="h-16 px-6 bg-white/80 dark:bg-warm-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white leading-none">
          {meta.title}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {meta.subtitle}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* AI Status Badge */}
        <div
          title={aiStatus?.details || 'AI status'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            isModelActive
              ? 'bg-sloth-50 dark:bg-sloth-950/90 text-sloth-800 dark:text-sloth-200 border-sloth-200 dark:border-sloth-800'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          }`}
        >
          <Cpu className={`w-3.5 h-3.5 ${isModelActive ? 'text-sloth-600 dark:text-sloth-400' : 'text-amber-500'}`} />
          <span>
            {isModelActive ? 'Gemma 3 4B: Active' : 'Ollama: Offline (Rule Engine Fallback)'}
          </span>
        </div>

        {/* Load Demo Workspace Button */}
        <button
          onClick={onLoadDemo}
          disabled={isDemoLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors disabled:opacity-50"
        >
          <FlaskConical className="w-3.5 h-3.5 text-sloth-600 dark:text-sloth-400" />
          <span>{isDemoLoading ? 'Loading Demo...' : 'Load Demo Workspace'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
