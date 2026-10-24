import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Play,
  Plus,
  RefreshCw,
  HelpCircle,
  Check,
  AlertCircle,
  Layers,
} from "lucide-react";
import { MacroRecorderModal } from "../Automation/MacroRecorderModal";
import type { Macro, MacroRunResult } from "../../types/macro";

const API = "http://localhost:8000";

export function MacrosView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<MacroRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMacros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/macros`);
      if (res.ok) {
        const data: Macro[] = await res.json();
        setMacros(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMacros();
  }, [fetchMacros]);

  const handleRun = async (macroId: string) => {
    setRunningId(macroId);
    setRunResult(null);
    setError(null);
    try {
      const res = await fetch(`${API}/api/macros/${macroId}/run?dry_run=false`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data: MacroRunResult = await res.json();
      setRunResult(data);
      fetchMacros();
    } catch (e: any) {
      setError(e.message || "Failed to execute macro");
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-semibold text-dark-text">Workflow Macros</h1>
        </div>

        <p className="text-sm text-dark-muted mb-6 max-w-2xl">
          Automate multi-step desktop workflows. Chain app launches, URL navigations, hotkeys, and shell commands into single-click or natural-language triggers.
        </p>

        {/* How to Use Guide */}
        <div className="mb-6 p-4 rounded-xl bg-dark-surface/60 border border-dark-border text-xs text-dark-muted space-y-2">
          <div className="flex items-center gap-2 font-medium text-dark-text">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>How to use Workflow Macros:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Execute Workflow:</strong> Click &ldquo;Run&rdquo; on any macro below to run its full sequence on your desktop.</li>
            <li><strong>Action Sequences:</strong> Macros can launch applications (VS Code, Chrome, Terminal), open URLs, press hotkeys, and run scripts.</li>
            <li><strong>Safe Execution:</strong> Dangerous commands are prevented in Safe Mode, and you can simulate workflows in Dry Run mode before executing.</li>
            <li><strong>Create & Record:</strong> Click &ldquo;Open Macro Studio&rdquo; to build custom workflows step-by-step or parameterize existing routines.</li>
          </ul>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors shadow-md shadow-amber-600/20"
            >
              <Zap className="w-4 h-4" />
              <span>Open Macro Studio & Recorder</span>
            </button>
            <button
              onClick={fetchMacros}
              disabled={loading}
              className="p-2.5 rounded-xl bg-dark-surface border border-dark-border text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
              title="Refresh macros"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <span className="text-xs text-dark-muted font-medium">
            {macros.length} {macros.length === 1 ? "Macro" : "Macros"} Available
          </span>
        </div>

        {/* Run Banner */}
        {runResult && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
              runResult.success
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/40 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {runResult.success ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span>
                Macro executed: {runResult.steps_executed}/{runResult.steps_total} steps in {runResult.duration_seconds}s
              </span>
            </div>
            <button
              onClick={() => setRunResult(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Macro Cards List */}
        <div className="space-y-3 mb-6">
          {macros.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-dark-border bg-dark-surface/40 text-xs text-dark-muted">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-dark-text mb-1">No macros found yet</p>
              <p className="mb-4">Create your first automated desktop macro in the Macro Studio.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Macro</span>
              </button>
            </div>
          ) : (
            macros.map((m) => {
              const isRunning = runningId === m.id;
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-dark-surface border border-dark-border hover:border-amber-500/40 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <h2 className="text-sm font-semibold text-dark-text truncate">
                        {m.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-bg border border-dark-border text-dark-muted">
                        {m.steps?.length || 0} steps
                      </span>
                    </div>

                    <p className="text-xs text-dark-muted truncate">
                      {m.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-dark-muted mt-2 pt-2 border-t border-dark-border/50">
                      <span>Total Runs: {m.run_count || 0}</span>
                      {m.last_run && (
                        <span>Last Run: {new Date(m.last_run).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRun(m.id)}
                      disabled={isRunning || !m.steps || m.steps.length === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? "animate-spin" : ""}`} />
                      <span>{isRunning ? "Running..." : "Run"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Full Macro Modal */}
        <MacroRecorderModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
}
