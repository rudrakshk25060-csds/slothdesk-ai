import React from 'react';
import {
  FolderSync,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Cpu,
  Inbox
} from 'lucide-react';
import { StatsData, ActivityItem, TaskItem, AIStatusData } from '../types';

interface OverviewViewProps {
  stats: StatsData | null;
  activities: ActivityItem[];
  upcomingTasks: TaskItem[];
  aiStatus: AIStatusData | null;
  onNavigate: (tab: string) => void;
  onLetSlothHandle: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  activities,
  upcomingTasks,
  aiStatus,
  onNavigate,
  onLetSlothHandle,
}) => {
  const completionRate = stats && stats.total_tasks > 0
    ? Math.round((stats.tasks_completed / stats.total_tasks) * 100)
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sloth-800 to-sloth-900 text-white p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sloth-700/60 text-sloth-200 text-xs font-medium mb-3 backdrop-blur-xs border border-sloth-600/40">
            <Sparkles className="w-3.5 h-3.5 text-sloth-300" />
            <span>Hacktoberfest 2026 — Slow & Steady Challenge</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
            Do less busywork.<br />
            Get more of your day back.
          </h1>
          <p className="mt-2 text-sloth-200 text-sm leading-relaxed max-w-xl">
            SlothDesk automates tedious file sorting, extracts deadlines from dense PDFs, and compiles your focused morning briefing with local open-weight AI.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onLetSlothHandle}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-white text-sloth-900 hover:bg-sloth-50 shadow-md transition-all active:scale-98"
            >
              <span>Let SlothDesk handle it</span>
              <ArrowRight className="w-4 h-4 text-sloth-700" />
            </button>
            <button
              onClick={() => onNavigate('briefing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-sloth-700/50 hover:bg-sloth-700 text-white border border-sloth-600/50 transition-colors"
            >
              <span>View Today's Briefing</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 bg-sloth-700/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Files Organized</span>
            <FolderSync className="w-4 h-4 text-sloth-600 dark:text-sloth-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats?.files_organized ?? 0}
            </span>
            <span className="text-xs text-neutral-400">verified operations</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Documents Summarized</span>
            <FileText className="w-4 h-4 text-sloth-600 dark:text-sloth-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats?.documents_summarized ?? 0}
            </span>
            <span className="text-xs text-neutral-400">PDFs & text files</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Deadlines Detected</span>
            <Calendar className="w-4 h-4 text-sloth-600 dark:text-sloth-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats?.deadlines_detected ?? 0}
            </span>
            <span className="text-xs text-neutral-400">dates extracted</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium">Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-sloth-600 dark:text-sloth-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats?.tasks_completed ?? 0}
            </span>
            <span className="text-xs text-neutral-400">of {stats?.total_tasks ?? 0} total</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sloth-600 dark:bg-sloth-500 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upcoming Deadlines */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sloth-600 dark:text-sloth-400" />
              <span>Upcoming Deadlines & Actions</span>
            </h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs font-medium text-sloth-700 dark:text-sloth-400 hover:underline"
            >
              Manage Tasks &rarr;
            </button>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 dark:text-neutral-500">
              <Inbox className="w-8 h-8 mx-auto mb-2 stroke-1" />
              <p className="text-sm font-medium">No pending deadlines right now</p>
              <p className="text-xs mt-1">Import a syllabus, invoice, or agreement to detect dates.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {task.title}
                    </p>
                    {task.source_document_title && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Source: {task.source_document_title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      task.priority === 'High'
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
                        : task.priority === 'Medium'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {task.due_date || 'No Date'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Engine Status & Recent Activity */}
        <div className="space-y-6">
          {/* AI Engine Status Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sloth-600" />
              <span>Inference Engine</span>
            </h4>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Active Model</span>
                <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                  {stats?.ai_model || 'gemma3:4b'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Service</span>
                <span className="text-neutral-800 dark:text-neutral-200">
                  {aiStatus?.provider || 'Ollama Local'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Inference Mode</span>
                <span className={`font-semibold ${aiStatus?.available ? 'text-sloth-600 dark:text-sloth-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {aiStatus?.available ? '100% Local Gemma' : 'Deterministic Fallback'}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="w-full py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 rounded-lg transition-colors font-medium"
            >
              View Setup Instructions
            </button>
          </div>

          {/* Recent Activity Mini-Feed */}
          <div className="p-5 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Recent Activity
              </h4>
              <button
                onClick={() => onNavigate('activity')}
                className="text-xs text-sloth-700 dark:text-sloth-400 hover:underline"
              >
                All
              </button>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-neutral-400 py-3 text-center">No recorded activity yet.</p>
            ) : (
              <div className="space-y-2.5">
                {activities.slice(0, 4).map((act) => (
                  <div key={act.id} className="text-xs space-y-0.5">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {act.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
