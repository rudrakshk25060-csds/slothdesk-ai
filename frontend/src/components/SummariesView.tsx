import React, { useState } from 'react';
import {
  Copy,
  Download,
  Sparkles,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Check,
  Search,
  BookOpen
} from 'lucide-react';
import { DocumentItem } from '../types';
import { api } from '../services/api';

interface SummariesViewProps {
  documents: DocumentItem[];
  onRefreshDocs: () => void;
  onRefreshStats: () => void;
}

export const SummariesView: React.FC<SummariesViewProps> = ({
  documents,
  onRefreshDocs,
  onRefreshStats,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    documents.length > 0 ? documents[0].id : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active document
  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0] || null;

  // Filtered documents
  const filteredDocs = documents.filter((d) =>
    d.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.suggested_title && d.suggested_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Trigger Summarization
  const handleSummarize = async () => {
    if (!activeDoc) return;
    setIsSummarizing(true);
    try {
      await api.summarizeDocument(activeDoc.id);
      onRefreshDocs();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = () => {
    if (!activeDoc) return;
    const md = `# ${activeDoc.suggested_title || activeDoc.filename}

**Category:** ${activeDoc.category} | **File:** \`${activeDoc.filename}\`

## Executive Summary
${activeDoc.summary || 'No summary available.'}

## Action Items
${activeDoc.action_items && activeDoc.action_items.length > 0
  ? activeDoc.action_items.map((it) => `- [ ] ${it}`).join('\n')
  : 'None detected.'}

## Deadlines & Key Dates
${activeDoc.deadlines && activeDoc.deadlines.length > 0
  ? activeDoc.deadlines.map((d) => `- **${d.title}**: ${d.due_date || 'No date'} (${d.priority} Priority)`).join('\n')
  : 'None detected.'}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    if (!activeDoc) return;
    const md = `# ${activeDoc.suggested_title || activeDoc.filename}\n\n${activeDoc.summary || ''}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.filename.replace(/\.[^/.]+$/, '')}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Document Summaries & Deadlines
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Read PDFs, extract action items, and detect upcoming milestones with Gemma 3 4B.
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-warm-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-sloth-500"
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 bg-white dark:bg-warm-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <BookOpen className="w-10 h-10 mx-auto mb-2 stroke-1" />
          <p className="text-sm font-medium">No documents uploaded yet</p>
          <p className="text-xs mt-1">Upload files in the File Organizer or load sample files to preview.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Documents List */}
          <div className="lg:col-span-4 space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {filteredDocs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-warm-900 border-sloth-600 dark:border-sloth-500 shadow-sm ring-1 ring-sloth-600/20'
                      : 'bg-white/60 dark:bg-warm-900/60 border-neutral-200/80 dark:border-neutral-800 hover:bg-white dark:hover:bg-warm-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-neutral-900 dark:text-white truncate pr-2">
                      {doc.suggested_title || doc.filename}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                    {doc.filename}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>{Math.round(doc.file_size / 1024)} KB</span>
                    {doc.is_scanned && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Scanned PDF
                      </span>
                    )}
                    {doc.is_ai_processed && !doc.is_scanned && (
                      <span className="text-sloth-600 dark:text-sloth-400 font-medium">
                        Summarized
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Document Detail Pane */}
          {activeDoc && (
            <div className="lg:col-span-8 bg-white dark:bg-warm-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {activeDoc.suggested_title || activeDoc.filename}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    File: {activeDoc.filename} ({activeDoc.char_count} chars, {Math.round(activeDoc.file_size / 1024)} KB)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-sloth-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy MD'}</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing || activeDoc.is_scanned}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sloth-700 hover:bg-sloth-800 text-white flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sloth-200" />
                    <span>{isSummarizing ? 'Summarizing...' : 'Summarize with Gemma'}</span>
                  </button>
                </div>
              </div>

              {/* Scanned PDF Honest Notification */}
              {activeDoc.is_scanned && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Optical Character Recognition (OCR) Required</span>
                  </div>
                  <p className="leading-relaxed text-neutral-600 dark:text-neutral-400">
                    This document consists of scanned physical pages or rasterized images without an embedded text layer. SlothDesk AI does not invent or hallucinate text for scanned documents. To extract content, run an OCR pipeline or convert the scanned image to searchable text.
                  </p>
                </div>
              )}

              {/* View Tabs */}
              <div className="flex items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 text-xs">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-2.5 font-medium border-b-2 transition-colors ${
                    activeTab === 'summary'
                      ? 'border-sloth-600 text-sloth-800 dark:text-sloth-200'
                      : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  AI Executive Summary & Actions
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`pb-2.5 font-medium border-b-2 transition-colors ${
                    activeTab === 'raw'
                      ? 'border-sloth-600 text-sloth-800 dark:text-sloth-200'
                      : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  Extracted Document Text
                </button>
              </div>

              {/* Tab 1: AI Summary & Actions */}
              {activeTab === 'summary' && (
                <div className="space-y-6 text-sm">
                  {/* Executive Summary Card */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Executive Summary
                    </h4>
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 leading-relaxed text-xs sm:text-sm">
                      {activeDoc.summary ? (
                        activeDoc.summary
                      ) : (
                        <span className="text-neutral-400 italic">
                          No summary generated yet. Click "Summarize with Gemma" above.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Items List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-sloth-600" />
                      <span>Extracted Action Items ({activeDoc.action_items?.length || 0})</span>
                    </h4>
                    {!activeDoc.action_items || activeDoc.action_items.length === 0 ? (
                      <p className="text-xs text-neutral-400 py-2 italic">
                        No actionable steps detected in this document.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeDoc.action_items.map((item, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-neutral-50/60 dark:bg-neutral-950/40 border border-neutral-200/80 dark:border-neutral-800 text-xs flex items-center gap-2.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sloth-600 shrink-0" />
                            <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deadlines & Key Dates */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sloth-600" />
                      <span>Extracted Deadlines ({activeDoc.deadlines?.length || 0})</span>
                    </h4>
                    {!activeDoc.deadlines || activeDoc.deadlines.length === 0 ? (
                      <p className="text-xs text-neutral-400 py-2 italic">
                        No upcoming dates or deadlines detected.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeDoc.deadlines.map((dl, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/30 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                                {dl.title}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                dl.priority === 'High'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {dl.priority}
                              </span>
                            </div>
                            <p className="text-xs text-sloth-700 dark:text-sloth-400 font-mono font-medium">
                              Due: {dl.due_date || 'No Date'} {dl.due_time ? `@ ${dl.due_time}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Raw Document Text */}
              {activeTab === 'raw' && (
                <div className="space-y-2">
                  <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 font-mono text-xs text-neutral-700 dark:text-neutral-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-neutral-200 dark:border-neutral-800 select-text">
                    {/* Render text or notice */}
                    {activeDoc.char_count === 0
                      ? 'No readable text content extracted from this document.'
                      : (activeDoc as any).extracted_text || 'Text content stored locally.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
