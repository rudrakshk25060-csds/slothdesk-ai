import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Cpu,
  ShieldCheck,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { SettingsData, AIStatusData } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ConfirmModal';

interface SettingsViewProps {
  settingsData: SettingsData | null;
  aiStatus: AIStatusData | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settingsData,
  aiStatus,
  theme,
  onToggleTheme,
  onRefreshAll,
}) => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slothdesk_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAllData = async () => {
    try {
      await api.clearData();
      setIsClearModalOpen(false);
      onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const setupCommands = [
    { label: '1. Install Ollama', cmd: 'curl -fsSL https://ollama.com/install.sh | sh' },
    { label: '2. Pull Google Gemma 3 4B', cmd: 'ollama pull gemma3:4b' },
    { label: '3. Verify Local Server', cmd: 'ollama serve' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Settings & Local Configuration
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Manage local model inference, inspect filesystem storage, and export application state.
        </p>
      </div>

      {/* AI Model & Inference Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sloth-600" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              AI Provider & Local Inference
            </h3>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
            aiStatus?.available
              ? 'bg-sloth-50 dark:bg-sloth-950/60 text-sloth-800 dark:text-sloth-200 border-sloth-200 dark:border-sloth-800'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
          }`}>
            {aiStatus?.available ? 'Model Active' : 'Unavailable (Rule Engine Fallback)'}
          </span>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {aiStatus?.details || 'Inference runs locally through Ollama using Google Gemma 3 4B Instruct. No data is sent to external cloud APIs.'}
        </p>

        {/* Setup Guide */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <Terminal className="w-4 h-4 text-neutral-500" />
            <span>Local Setup Instructions (Terminal)</span>
          </div>

          <div className="space-y-2">
            {setupCommands.map((sc, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 text-neutral-200 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-[11px] select-none">{sc.label}:</span>
                  <span className="text-sloth-300">{sc.cmd}</span>
                </div>
                <button
                  onClick={() => copyCommand(sc.cmd)}
                  className="p-1 hover:text-white transition-colors"
                  title="Copy command"
                >
                  {copiedCmd === sc.cmd ? <Check className="w-3.5 h-3.5 text-sloth-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Local Storage & Privacy */}
      <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sloth-600" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Privacy & Storage Guarantee
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1">
            <span className="text-neutral-400 font-medium">Data Storage Path</span>
            <p className="font-mono text-neutral-800 dark:text-neutral-200 truncate">
              {settingsData?.data_storage_path || './data/storage'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/80 dark:border-neutral-800 space-y-1">
            <span className="text-neutral-400 font-medium">Privacy Architecture</span>
            <p className="font-medium text-sloth-700 dark:text-sloth-400">
              100% Local (Zero Telemetry, SQLite)
            </p>
          </div>
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Appearance & Theme
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              Current Theme: <span className="capitalize font-bold">{theme}</span>
            </p>
            <p className="text-[11px] text-neutral-400">
              Switch between calm light and warm dark workspace themes.
            </p>
          </div>
          <button
            onClick={onToggleTheme}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
          >
            Toggle to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>

      {/* Data Management & Export */}
      <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Data Management
        </h3>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Application Data (JSON)'}</span>
          </button>

          <button
            onClick={() => setIsClearModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-900 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Application Data</span>
          </button>
        </div>
      </div>

      {/* App Metadata */}
      <div className="flex items-center justify-between text-xs text-neutral-400 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <span>SlothDesk AI v{settingsData?.app_version || '1.0.0'}</span>
        <span>Built for Hacktoberfest 2026 — Week 3</span>
      </div>

      {/* Confirm Data Clear Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Wipe All Application Data"
        message="This will permanently delete all tasks, documents, summaries, and activity records from your local SQLite database and clear workspace storage. Are you sure you want to proceed?"
        confirmLabel="Wipe Everything"
        isDangerous={true}
        onConfirm={handleClearAllData}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
