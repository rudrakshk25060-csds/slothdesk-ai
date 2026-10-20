import React, { useState } from 'react';
import {
  History,
  Trash2,
  FolderSync,
  FileText,
  CheckSquare,
  Sparkles,
  Undo2,
  Calendar,
  FlaskConical
} from 'lucide-react';
import { ActivityItem } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ConfirmModal';

interface ActivityViewProps {
  activities: ActivityItem[];
  onRefreshActivities: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  activities,
  onRefreshActivities,
}) => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const handleClearHistory = async () => {
    try {
      await api.clearActivities();
      setIsClearModalOpen(false);
      onRefreshActivities();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = activities.filter((act) => {
    if (filterType === 'all') return true;
    if (filterType === 'organize') return act.action_type.startsWith('organize');
    if (filterType === 'summarize') return act.action_type === 'summarize';
    if (filterType === 'tasks') return act.action_type.startsWith('task');
    return true;
  });

  const getIcon = (type: string) => {
    if (type.startsWith('organize_undo')) return <Undo2 className="w-4 h-4 text-amber-600" />;
    if (type.startsWith('organize')) return <FolderSync className="w-4 h-4 text-sloth-600" />;
    if (type === 'summarize') return <FileText className="w-4 h-4 text-blue-600" />;
    if (type.startsWith('task')) return <CheckSquare className="w-4 h-4 text-sloth-600" />;
    if (type === 'briefing_generate') return <Sparkles className="w-4 h-4 text-purple-600" />;
    if (type === 'deadline_extract') return <Calendar className="w-4 h-4 text-teal-600" />;
    if (type === 'demo_load') return <FlaskConical className="w-4 h-4 text-indigo-600" />;
    return <History className="w-4 h-4 text-neutral-500" />;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Activity & Audit History
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Immutable log of filesystem operations and task modifications. Document text is never logged.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1 text-xs">
            {['all', 'organize', 'summarize', 'tasks'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  filterType === f
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsClearModalOpen(true)}
            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
            title="Clear activity log"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 bg-white dark:bg-warm-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <History className="w-10 h-10 mx-auto mb-2 stroke-1" />
          <p className="text-sm font-medium">No activity recorded yet</p>
          <p className="text-xs mt-1">Actions taken across the app will appear here with exact timestamps.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-warm-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden shadow-xs">
          {filtered.map((act) => (
            <div key={act.id} className="p-4 flex items-start gap-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0 mt-0.5">
                {getIcon(act.action_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                    {act.title}
                  </h4>
                  <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {act.details && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    {act.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear Activity Log"
        message="Are you sure you want to delete all audit logs? This action cannot be undone."
        confirmLabel="Clear Log"
        isDangerous={true}
        onConfirm={handleClearHistory}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
