export interface MacroStep {
  step_id?: string;
  action_type: string;
  params: Record<string, any>;
  delay_before: number;
  description: string;
}

export interface Macro {
  id: string;
  name: string;
  description: string;
  created_at: string;
  last_run: string | null;
  run_count: number;
  safe_mode: boolean;
  steps: MacroStep[];
}

export interface MacroStepResult {
  step_id: string;
  action_type: string;
  success: boolean;
  message?: string;
  simulated?: boolean;
}

export interface MacroRunResult {
  success: boolean;
  macro_id: string;
  macro_name: string;
  steps_total: number;
  steps_executed: number;
  duration_seconds: number;
  dry_run: boolean;
  step_results: MacroStepResult[];
}
