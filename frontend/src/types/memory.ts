export interface TimelineItem {
  id: string;
  timestamp: string;
  text: string;
  window_title: string;
  process_name: string;
  diff_percent: number;
  word_count: number;
  screenshot_filename: string;
  screenshot_url: string;
  metadata?: Record<string, any>;
}

export interface MemoryStatus {
  running: boolean;
  paused: boolean;
  interval_seconds: number;
  total_indexed: number;
  total_captures: number;
  total_diff_skips: number;
  total_privacy_skips: number;
  last_capture_time: string | null;
  last_active_app: string | null;
  ocr_available: boolean;
  memory_dir: string;
}
