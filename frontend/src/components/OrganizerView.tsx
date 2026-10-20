import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderSync,
  CheckCircle2,
  AlertCircle,
  Undo2,
  FileText,
  ShieldAlert,
  Sparkles,
  Check
} from 'lucide-react';
import { DocumentItem, OrganizationPlanResponse } from '../types';
import { api } from '../services/api';

interface OrganizerViewProps {
  documents: DocumentItem[];
  onRefreshDocs: () => void;
  onRefreshStats: () => void;
}

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  documents,
  onRefreshDocs,
  onRefreshStats,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const [plan, setPlan] = useState<OrganizationPlanResponse | null>(null);
  const [lastExecutedBatchId, setLastExecutedBatchId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handling
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMsg(null);
    try {
      await api.importDocuments(files);
      onRefreshDocs();
      onRefreshStats();
      setSuccessMsg(`Successfully imported ${files.length} document(s).`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload files.');
    } finally {
      setIsUploading(false);
    }
  };

  // Generate Organization Plan
  const handleGeneratePlan = async () => {
    setIsPlanning(true);
    setErrorMsg(null);
    setExecutionResult(null);
    try {
      const generatedPlan = await api.generateOrganizationPlan();
      setPlan(generatedPlan);
      setSuccessMsg(`Generated organization proposals for ${generatedPlan.items.length} files.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate organization plan.');
    } finally {
      setIsPlanning(false);
    }
  };

  // Toggle selection for item
  const handleToggleSelect = (index: number) => {
    if (!plan) return;
    const updated = [...plan.items];
    updated[index].selected = !updated[index].selected;
    setPlan({ ...plan, items: updated });
  };

  // Update proposed category or filename manually
  const handleUpdateItemField = (index: number, field: 'suggested_category' | 'suggested_filename', value: string) => {
    if (!plan) return;
    const updated = [...plan.items];
    updated[index] = {
      ...updated[index],
      [field]: value,
      target_relative_path: field === 'suggested_category'
        ? `${value}/${updated[index].suggested_filename}`
        : `${updated[index].suggested_category}/${value}`
    };
    setPlan({ ...plan, items: updated });
  };

  // Execute Approved File Operations
  const handleExecuteApproved = async () => {
    if (!plan) return;
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const payload = plan.items.map((it) => ({
        document_id: it.document_id,
        current_path: it.current_path,
        target_relative_path: it.target_relative_path,
        approved: it.selected,
      }));

      const res = await api.executeOrganizationPlan(plan.batch_id, payload);
      setExecutionResult(res);
      setLastExecutedBatchId(plan.batch_id);
      setPlan(null); // Clear active plan once executed
      onRefreshDocs();
      onRefreshStats();
      setSuccessMsg(`Execution finished: ${res.executed_count} moved, ${res.skipped_count} skipped, ${res.failed_count} failed.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute file operations.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Undo Last Batch
  const handleUndo = async () => {
    if (!lastExecutedBatchId) return;
    setIsUndoing(true);
    setErrorMsg(null);
    try {
      const res = await api.undoOrganizationBatch(lastExecutedBatchId);
      setLastExecutedBatchId(null);
      setExecutionResult(null);
      onRefreshDocs();
      onRefreshStats();
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to undo file operations.');
    } finally {
      setIsUndoing(false);
    }
  };

  const selectedCount = plan ? plan.items.filter((it) => it.selected).length : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-sloth-50 dark:bg-sloth-950/60 border border-sloth-200 dark:border-sloth-800 text-sloth-900 dark:text-sloth-200 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-sloth-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top File Upload Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              Import & Select Files
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Drop PDFs, receipts, text notes, or invoices. SlothDesk never modifies files without your explicit approval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Choose Files'}</span>
            </button>

            <button
              onClick={handleGeneratePlan}
              disabled={isPlanning || documents.length === 0}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-sloth-700 hover:bg-sloth-800 text-white flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-sloth-200" />
              <span>{isPlanning ? 'Analyzing with Gemma...' : 'Generate AI Organization Plan'}</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center cursor-pointer hover:border-sloth-500 dark:hover:border-sloth-600 transition-colors bg-neutral-50/50 dark:bg-neutral-950/40"
        >
          <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2 stroke-1" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Drag and drop unorganized files here, or click to browse
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Supports PDF, TXT, MD, CSV (up to 15MB each)
          </p>
        </div>
      </div>

      {/* Interactive Organization Proposal Table */}
      {plan && (
        <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-sloth-300 dark:border-sloth-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sloth-100 dark:bg-sloth-900 text-sloth-800 dark:text-sloth-200 mb-1 border border-sloth-200 dark:border-sloth-800">
                <Sparkles className="w-3 h-3 text-sloth-600" />
                <span>Proposed Plan ({plan.model_name})</span>
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Review Proposed Changes ({selectedCount} of {plan.items.length} selected)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You can manually adjust categories and filenames before approving. Only checked items will be moved.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlan(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteApproved}
                disabled={isExecuting || selectedCount === 0}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-sloth-700 hover:bg-sloth-800 text-white flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isExecuting ? 'Moving files safely...' : `Approve & Execute Selected (${selectedCount})`}</span>
              </button>
            </div>
          </div>

          {/* Proposals List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-10">Select</th>
                  <th className="py-2.5 px-3">Original File</th>
                  <th className="py-2.5 px-3">Target Category</th>
                  <th className="py-2.5 px-3">Suggested Filename</th>
                  <th className="py-2.5 px-3">AI Reasoning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {plan.items.map((item, idx) => (
                  <tr
                    key={item.document_id + idx}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                      item.selected ? '' : 'opacity-50'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleSelect(idx)}
                        className="rounded border-neutral-300 text-sloth-600 focus:ring-sloth-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      {item.current_filename}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={item.suggested_category}
                        onChange={(e) => handleUpdateItemField(idx, 'suggested_category', e.target.value)}
                        className="px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <option value="Documents">Documents</option>
                        <option value="Education">Education</option>
                        <option value="Finance">Finance</option>
                        <option value="Work">Work</option>
                        <option value="Images">Images</option>
                        <option value="Receipts">Receipts</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.suggested_filename}
                        onChange={(e) => handleUpdateItemField(idx, 'suggested_filename', e.target.value)}
                        className="px-2 py-1 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-xs text-neutral-900 dark:text-neutral-100 w-full min-w-[200px]"
                      />
                    </td>
                    <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 max-w-xs truncate" title={item.reasoning}>
                      {item.reasoning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sloth-600" />
              <span>Collision protection active: duplicate names will append unique numbers automatically.</span>
            </span>
          </div>
        </div>
      )}

      {/* Execution Result & Undo Bar */}
      {executionResult && (
        <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-sloth-600" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Batch Organization Completed
              </h3>
            </div>

            {executionResult.can_undo && lastExecutedBatchId && (
              <button
                onClick={handleUndo}
                disabled={isUndoing}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{isUndoing ? 'Undoing...' : 'Undo Last Batch'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            <div className="p-3 rounded-lg bg-sloth-50 dark:bg-sloth-950/40 border border-sloth-200 dark:border-sloth-800 text-sloth-900 dark:text-sloth-200">
              <span className="font-bold text-base block">{executionResult.executed_count}</span>
              <span>Moved successfully</span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
              <span className="font-bold text-base block">{executionResult.skipped_count}</span>
              <span>Skipped by user</span>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
              <span className="font-bold text-base block">{executionResult.failed_count}</span>
              <span>Errors</span>
            </div>
          </div>
        </div>
      )}

      {/* Current Documents Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-warm-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Workspace Files ({documents.length})
          </h3>
          <span className="text-xs text-neutral-400">Stored safely in local workspace</span>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">
            <FolderSync className="w-8 h-8 mx-auto mb-2 stroke-1" />
            <p className="text-sm font-medium">No documents in workspace</p>
            <p className="text-xs mt-1">Click 'Load Demo Workspace' in header to test with sample files.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Filename</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 font-mono">
                      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{doc.filename}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {doc.category || 'Other'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-500 font-mono">
                      {Math.round(doc.file_size / 1024)} KB
                    </td>
                    <td className="py-3 px-3">
                      {doc.is_scanned ? (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          Scanned (OCR Needed)
                        </span>
                      ) : doc.is_ai_processed ? (
                        <span className="text-[11px] text-sloth-600 dark:text-sloth-400 font-medium">
                          Summarized
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
