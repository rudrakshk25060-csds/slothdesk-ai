import React, { useState } from 'react';
import {
  SunMedium,
  Sparkles,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Bell,
  HeartHandshake
} from 'lucide-react';
import { BriefingData } from '../types';
import { api } from '../services/api';

interface BriefingViewProps {
  briefing: BriefingData | null;
  onRefreshBriefing: () => void;
  onRefreshStats: () => void;
}

export const BriefingView: React.FC<BriefingViewProps> = ({
  briefing,
  onRefreshBriefing,
  onRefreshStats,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await api.generateBriefing();
      onRefreshBriefing();
      onRefreshStats();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate briefing.');
    } finally {
      setIsGenerating(false);
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-sloth-700 dark:text-sloth-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <SunMedium className="w-4 h-4" />
            <span>Daily Morning Agenda</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {todayFormatted}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Synthesized by Gemma 3 4B from your live documents, tasks, and deadlines.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-sloth-700 hover:bg-sloth-800 text-white flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Generating Briefing...' : 'Generate Today\'s Briefing'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {!briefing ? (
        <div className="py-20 text-center text-neutral-400 bg-white dark:bg-warm-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <SunMedium className="w-10 h-10 mx-auto mb-2 stroke-1 text-sloth-600" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            No Morning Briefing Generated Yet
          </p>
          <p className="text-xs mt-1 text-neutral-500 max-w-sm mx-auto">
            Click "Generate Today's Briefing" above to synthesize your active documents and pending tasks into a calm daily plan.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Today's Top 3 Priorities */}
          <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sloth-600 dark:text-sloth-400" />
              <span>Today's Top 3 Focus Priorities</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {briefing.top_priorities.map((priority, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-sloth-50/70 dark:bg-sloth-950/40 border border-sloth-200/80 dark:border-sloth-800/80 space-y-2"
                >
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sloth-200 dark:bg-sloth-800 text-sloth-900 dark:text-sloth-100">
                    Priority #{index + 1}
                  </span>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                    {priority}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 & 3: Due Today & Upcoming Deadlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Due Today */}
            <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Due Today</span>
              </h3>

              {briefing.tasks_due_today.length === 0 ? (
                <p className="text-xs text-neutral-400 italic py-2">
                  No strict deadlines due today. Steady progress!
                </p>
              ) : (
                <div className="space-y-2">
                  {briefing.tasks_due_today.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                        {task.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-semibold shrink-0">
                        Today
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sloth-600" />
                <span>Upcoming Milestones</span>
              </h3>

              {briefing.upcoming_deadlines.length === 0 ? (
                <p className="text-xs text-neutral-400 italic py-2">
                  No future deadlines detected.
                </p>
              ) : (
                <div className="space-y-2">
                  {briefing.upcoming_deadlines.map((task, idx) => (
                    <div
                      key={task.id || idx}
                      className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 text-xs flex items-center justify-between"
                    >
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate pr-2">
                        {task.title}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                        {task.due_date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Recently Summarized Documents */}
          {briefing.recently_summarized.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-sloth-600" />
                <span>Context from Recent Documents</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {briefing.recently_summarized.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900 dark:text-white truncate">
                        {doc.suggested_title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {doc.category}
                      </span>
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 line-clamp-2 text-[11px] leading-relaxed">
                      {doc.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Suggested Next Actions */}
          <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-sloth-600" />
              <span>Suggested Next Steps</span>
            </h3>

            <div className="space-y-2">
              {briefing.suggested_actions.map((act, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50/50 dark:bg-neutral-950/30 border border-neutral-200/80 dark:border-neutral-800 text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-sloth-100 dark:bg-sloth-900 text-sloth-800 dark:text-sloth-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-neutral-800 dark:text-neutral-200">{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Sloth Philosophy Encouraging Quote */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-sloth-50 to-warm-100 dark:from-sloth-950/60 dark:to-warm-900/60 border border-sloth-200 dark:border-sloth-800 flex items-start gap-4">
            <HeartHandshake className="w-6 h-6 text-sloth-700 dark:text-sloth-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-sloth-900 dark:text-sloth-200 uppercase tracking-wider">
                Words of the Sloth
              </h4>
              <p className="text-sm italic text-neutral-700 dark:text-neutral-300 leading-relaxed font-serif">
                "{briefing.sloth_quote}"
              </p>
            </div>
          </div>

          {/* Local Scheduling Note */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-neutral-400" />
              <span>Local schedule: Run daily at 08:00 AM on your workstation without cloud dependencies.</span>
            </div>
            <span className="text-[11px] text-sloth-600 font-mono">cron: 0 8 * * *</span>
          </div>
        </div>
      )}
    </div>
  );
};
