export interface DocumentItem {
  id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: string;
  suggested_filename?: string;
  char_count: number;
  is_scanned: boolean;
  ocr_needed_reason?: string;
  summary?: string;
  suggested_title?: string;
  action_items: string[];
  deadlines: Array<{
    title: string;
    due_date?: string;
    due_time?: string;
    priority: string;
    context?: string;
  }>;
  is_ai_processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  due_date?: string;
  due_time?: string;
  priority: 'High' | 'Medium' | 'Low';
  source_document_id?: string;
  source_document_title?: string;
  completed: boolean;
  completed_at?: string;
  content_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationProposalItem {
  document_id: string;
  current_path: string;
  current_filename: string;
  suggested_category: string;
  suggested_filename: string;
  target_relative_path: string;
  reasoning: string;
  selected: boolean;
}

export interface OrganizationPlanResponse {
  batch_id: string;
  source_directory: string;
  items: OrganizationProposalItem[];
  total_files: number;
  is_ai_powered: boolean;
  model_name: string;
}

export interface BriefingData {
  id: string;
  date: string;
  top_priorities: string[];
  tasks_due_today: Array<{
    id: string;
    title: string;
    due_date?: string;
    priority: string;
    source?: string;
  }>;
  upcoming_deadlines: Array<{
    id: string;
    title: string;
    due_date?: string;
    priority: string;
    source?: string;
  }>;
  recently_summarized: Array<{
    id: string;
    filename: string;
    suggested_title: string;
    category: string;
    summary: string;
  }>;
  suggested_actions: string[];
  sloth_quote: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  action_type: string;
  title: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  created_at: string;
}

export interface StatsData {
  files_organized: number;
  documents_summarized: number;
  deadlines_detected: number;
  tasks_completed: number;
  total_tasks: number;
  pending_tasks: number;
  ai_model: string;
  ai_status: string;
}

export interface AIStatusData {
  available: boolean;
  provider: string;
  model: string;
  details: string;
  setup_instructions: string[];
}

export interface SettingsData {
  ai_provider: string;
  ai_model: string;
  ai_available: boolean;
  data_storage_path: string;
  app_version: string;
  theme: string;
  privacy_mode: string;
}
