export interface StandupMetadata {
  report_date: string;
  generated_at: string;
  commit_count: number;
  branch: string;
  productivity_score: number | null;
  focus_sessions: number;
  memory_snapshots: number;
  top_apps: string[];
  report_path?: string | null;
}

export interface StandupResponse {
  markdown: string;
  plain_text: string;
  metadata: StandupMetadata;
  report_path?: string | null;
}

export interface StandupReportItem {
  filename: string;
  date: string;
  size_bytes: number;
  modified_at: string;
  path: string;
}

export interface StandupTodayPreview {
  date: string;
  git: {
    commit_count: number;
    branch: string;
    lines_inserted: number;
    lines_deleted: number;
  };
  focus: {
    has_data: boolean;
    sessions_count: number;
    productivity_score: number | null;
    formatted: {
      productive?: string;
      distracted?: string;
      neutral?: string;
      total?: string;
    };
  };
  memory: {
    has_data: boolean;
    snapshot_count: number;
    active_hours: number;
    top_apps: string[];
    top_words: string[];
  };
}
