import {
  DocumentItem,
  TaskItem,
  OrganizationPlanResponse,
  BriefingData,
  ActivityItem,
  StatsData,
  AIStatusData,
  SettingsData
} from '../types';

const API_BASE = '/api';

export const api = {
  // Stats & Status
  getStats: async (): Promise<StatsData> => {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  getAIStatus: async (): Promise<AIStatusData> => {
    const res = await fetch(`${API_BASE}/ai/status`);
    if (!res.ok) throw new Error('Failed to fetch AI status');
    return res.json();
  },

  // Documents
  getDocuments: async (category?: string, search?: string): Promise<DocumentItem[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/documents?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  importDocuments: async (files: FileList | File[]): Promise<DocumentItem[]> => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    const res = await fetch(`${API_BASE}/documents/import`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to import documents');
    return res.json();
  },

  summarizeDocument: async (id: string) => {
    const res = await fetch(`${API_BASE}/documents/${id}/summarize`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to summarize document');
    return res.json();
  },

  extractDeadlines: async (id: string) => {
    const res = await fetch(`${API_BASE}/documents/${id}/extract-deadlines`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to extract deadlines');
    return res.json();
  },

  deleteDocument: async (id: string) => {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // Organization
  generateOrganizationPlan: async (documentIds?: string[], folderPath?: string): Promise<OrganizationPlanResponse> => {
    const res = await fetch(`${API_BASE}/organization/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_ids: documentIds, folder_path: folderPath }),
    });
    if (!res.ok) throw new Error('Failed to generate organization plan');
    return res.json();
  },

  executeOrganizationPlan: async (batchId: string, items: Array<{
    document_id: string;
    current_path: string;
    target_relative_path: string;
    approved: boolean;
  }>) => {
    const res = await fetch(`${API_BASE}/organization/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batchId, items }),
    });
    if (!res.ok) throw new Error('Failed to execute organization plan');
    return res.json();
  },

  undoOrganizationBatch: async (batchId: string) => {
    const res = await fetch(`${API_BASE}/organization/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batchId }),
    });
    if (!res.ok) throw new Error('Failed to undo organization batch');
    return res.json();
  },

  // Tasks
  getTasks: async (status?: string, priority?: string, search?: string): Promise<TaskItem[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/tasks?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  createTask: async (task: Partial<TaskItem>): Promise<TaskItem> => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  updateTask: async (id: string, updates: Partial<TaskItem>): Promise<TaskItem> => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  deleteTask: async (id: string) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
  },

  // Briefing
  generateBriefing: async (): Promise<BriefingData> => {
    const res = await fetch(`${API_BASE}/briefing/generate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to generate briefing');
    return res.json();
  },

  getLatestBriefing: async (): Promise<BriefingData> => {
    const res = await fetch(`${API_BASE}/briefing/latest`);
    if (!res.ok) throw new Error('Failed to get latest briefing');
    return res.json();
  },

  // Activities
  getActivities: async (): Promise<ActivityItem[]> => {
    const res = await fetch(`${API_BASE}/activity`);
    if (!res.ok) throw new Error('Failed to fetch activity history');
    return res.json();
  },

  clearActivities: async () => {
    const res = await fetch(`${API_BASE}/activity`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear activities');
    return res.json();
  },

  // Settings & Demo
  getSettings: async (): Promise<SettingsData> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  exportData: async () => {
    const res = await fetch(`${API_BASE}/settings/export`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to export data');
    return res.json();
  },

  clearData: async () => {
    const res = await fetch(`${API_BASE}/settings/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    if (!res.ok) throw new Error('Failed to clear application data');
    return res.json();
  },

  loadDemo: async () => {
    const res = await fetch(`${API_BASE}/demo/load`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to load demo workspace');
    return res.json();
  },
};
