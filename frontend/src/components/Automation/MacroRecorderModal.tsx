import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Terminal,
  Globe,
  Keyboard,
  X,
  RefreshCw,
  Folder,
  Command,
  MousePointer,
} from "lucide-react";
import type { Macro, MacroStep, MacroRunResult } from "../../types/macro";

const API_BASE = "http://localhost:8000";

interface MacroRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MacroRecorderModal: React.FC<MacroRecorderModalProps> = ({ isOpen, onClose }) => {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<MacroRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editor state for adding a new step
  const [showAddStep, setShowAddStep] = useState<boolean>(false);
  const [newActionType, setNewActionType] = useState<string>("app_launch");
  const [newParamKey, setNewParamKey] = useState<string>("app_name");
  const [newParamVal, setNewParamVal] = useState<string>("");
  const [newStepDesc, setNewStepDesc] = useState<string>("");
  const [newStepDelay, setNewStepDelay] = useState<number>(0.5);

  // New Macro form state
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newMacroName, setNewMacroName] = useState<string>("");
  const [newMacroDesc, setNewMacroDesc] = useState<string>("");

  const fetchMacros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/macros`);
      if (res.ok) {
        const data: Macro[] = await res.json();
        setMacros(data);
        if (data.length > 0 && !selectedMacro) {
          setSelectedMacro(data[0]);
        } else if (selectedMacro) {
          const updated = data.find((m) => m.id === selectedMacro.id);
          if (updated) setSelectedMacro(updated);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedMacro]);

  useEffect(() => {
    if (isOpen) {
      fetchMacros();
      setRunResult(null);
      setError(null);
    }
  }, [isOpen, fetchMacros]);

  // Run macro
  const handleRunMacro = async (macroId: string) => {
    setRunning(true);
    setRunResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/macros/${macroId}/run?dry_run=${dryRun}`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data: MacroRunResult = await res.json();
      setRunResult(data);
      fetchMacros();
    } catch (err: any) {
      setError(err.message || "Failed to execute macro");
    } finally {
      setRunning(false);
    }
  };

  // Delete macro
  const handleDeleteMacro = async (macroId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/macros/${macroId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const remaining = macros.filter((m) => m.id !== macroId);
        setMacros(remaining);
        setSelectedMacro(remaining.length > 0 ? remaining[0] : null);
      }
    } catch {
      // ignore
    }
  };

  // Create new macro
  const handleSaveNewMacro = async () => {
    if (!newMacroName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/macros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMacroName.trim(),
          description: newMacroDesc.trim(),
          safe_mode: true,
          steps: [],
        }),
      });
      if (res.ok) {
        const created: Macro = await res.json();
        setMacros((prev) => [...prev, created]);
        setSelectedMacro(created);
        setIsCreatingNew(false);
        setNewMacroName("");
        setNewMacroDesc("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create macro");
    }
  };

  // Append step to selected macro
  const handleAddStep = async () => {
    if (!selectedMacro) return;

    let params: Record<string, any> = {};
    if (newActionType === "app_launch") {
      params = { app_name: newParamVal.trim() };
    } else if (newActionType === "open_url") {
      params = { url: newParamVal.trim() };
    } else if (newActionType === "hotkey") {
      params = { combo: newParamVal.trim() };
    } else if (newActionType === "type_text") {
      params = { text: newParamVal };
    } else if (newActionType === "delay") {
      params = { seconds: parseFloat(newParamVal) || 1.0 };
    } else if (newActionType === "shell_command") {
      params = { command: newParamVal.trim() };
    }

    const step: MacroStep = {
      action_type: newActionType,
      params,
      delay_before: newStepDelay,
      description: newStepDesc.trim() || `${newActionType}: ${newParamVal}`,
    };

    const updatedSteps = [...selectedMacro.steps, step];

    try {
      const res = await fetch(`${API_BASE}/api/macros/${selectedMacro.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: updatedSteps }),
      });
      if (res.ok) {
        const updated: Macro = await res.json();
        setSelectedMacro(updated);
        setMacros((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setShowAddStep(false);
        setNewParamVal("");
        setNewStepDesc("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add step");
    }
  };

  // Delete step
  const handleDeleteStep = async (stepIdx: number) => {
    if (!selectedMacro) return;
    const updatedSteps = selectedMacro.steps.filter((_, idx) => idx !== stepIdx);
    try {
      const res = await fetch(`${API_BASE}/api/macros/${selectedMacro.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: updatedSteps }),
      });
      if (res.ok) {
        const updated: Macro = await res.json();
        setSelectedMacro(updated);
        setMacros((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch {
      // ignore
    }
  };

  const getStepIcon = (actionType: string) => {
    switch (actionType) {
      case "app_launch":
        return <Folder className="w-3.5 h-3.5 text-emerald-400" />;
      case "open_url":
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case "hotkey":
        return <Command className="w-3.5 h-3.5 text-purple-400" />;
      case "type_text":
        return <Keyboard className="w-3.5 h-3.5 text-amber-400" />;
      case "click":
        return <MousePointer className="w-3.5 h-3.5 text-pink-400" />;
      case "delay":
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
      case "shell_command":
        return <Terminal className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Command className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-surface-950 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-surface-700 bg-surface-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl megan-gradient flex items-center justify-center shadow-glow-sm">
              <Command className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Autonomous Workflow Macro Recorder</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-megan-950 text-megan-300 border border-megan-800/50">
                  Feature #16
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Record, parameterize, and execute multi-step desktop sequences via safe automation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatingNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-megan-600 hover:bg-megan-500 text-white transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Macro</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Area */}
        <div className="flex flex-1 overflow-hidden divide-x divide-surface-700">
          
          {/* Left Column: Macro Directory */}
          <div className="w-80 flex flex-col bg-surface-900/40 overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b border-surface-700 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Saved Macros ({macros.length})
              </span>
              <button
                onClick={fetchMacros}
                className="text-zinc-500 hover:text-zinc-300 transition"
                title="Refresh macros"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {macros.map((m) => {
                const isSelected = selectedMacro?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMacro(m);
                      setRunResult(null);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-surface-800 border-megan-500/60 shadow-glow-sm text-white"
                        : "bg-surface-800/40 border-surface-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-surface-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs truncate max-w-[170px] text-zinc-200">
                        {m.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-700 text-zinc-400">
                        {m.steps.length} steps
                      </span>
                    </div>

                    {m.description && (
                      <p className="text-[11px] text-zinc-500 line-clamp-1">
                        {m.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-surface-700/40">
                      <span>Runs: {m.run_count}</span>
                      <span>{m.last_run ? m.last_run.slice(0, 10) : "Never run"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Macro Detail, Step Visualizer, and Execution Output */}
          <div className="flex-1 flex flex-col bg-surface-950 overflow-hidden">
            {isCreatingNew ? (
              /* Create New Macro Form */
              <div className="p-6 max-w-lg space-y-4">
                <h3 className="text-sm font-semibold text-white">Create New Workflow Macro</h3>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Macro Name
                  </label>
                  <input
                    type="text"
                    value={newMacroName}
                    onChange={(e) => setNewMacroName(e.target.value)}
                    placeholder="e.g. Full Test Pipeline"
                    className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-megan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Description
                  </label>
                  <textarea
                    value={newMacroDesc}
                    onChange={(e) => setNewMacroDesc(e.target.value)}
                    placeholder="Describe what this sequence of steps does..."
                    rows={3}
                    className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-megan-500 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveNewMacro}
                    disabled={!newMacroName.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-megan text-white disabled:opacity-50 transition"
                  >
                    Save Macro
                  </button>
                  <button
                    onClick={() => setIsCreatingNew(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-surface-800 text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedMacro ? (
              <div className="flex flex-col h-full overflow-hidden">
                
                {/* Macro Detail Header Toolbar */}
                <div className="px-6 py-3 border-b border-surface-700 bg-surface-900/40 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {selectedMacro.name}
                      <span className="text-[10px] font-mono text-zinc-500">[{selectedMacro.id}]</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">{selectedMacro.description || "No description provided."}</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Dry Run Checkbox */}
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="rounded accent-purple-600"
                      />
                      <span>Dry Run (Simulation)</span>
                    </label>

                    {/* Run Macro Button */}
                    <button
                      onClick={() => handleRunMacro(selectedMacro.id)}
                      disabled={running || selectedMacro.steps.length === 0}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-megan text-white shadow-glow-sm hover:shadow-glow disabled:opacity-50 transition"
                    >
                      <Play className={`w-3.5 h-3.5 fill-current ${running ? "animate-spin" : ""}`} />
                      <span>{running ? "Executing..." : dryRun ? "Simulate Sequence" : "Run Macro"}</span>
                    </button>

                    {/* Delete Macro Button */}
                    <button
                      onClick={() => handleDeleteMacro(selectedMacro.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-surface-800 transition"
                      title="Delete macro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Execution Results Banner */}
                {runResult && (
                  <div className={`px-6 py-2.5 border-b text-xs flex items-center justify-between ${
                    runResult.success
                      ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                      : "bg-red-950/40 border-red-800/50 text-red-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      {runResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                      <span>
                        Sequence {runResult.success ? "completed successfully" : "failed"} ({runResult.steps_executed}/{runResult.steps_total} steps in {runResult.duration_seconds}s)
                      </span>
                      {runResult.dry_run && <span className="font-mono text-[10px] opacity-70">[Simulated]</span>}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mx-6 my-2 p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Step Sequence List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Sequence Steps ({selectedMacro.steps.length})
                    </h4>
                    <button
                      onClick={() => setShowAddStep(true)}
                      className="flex items-center gap-1 text-xs font-medium text-megan-400 hover:text-megan-300 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Step</span>
                    </button>
                  </div>

                  {selectedMacro.steps.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-surface-700 rounded-2xl text-xs text-zinc-500">
                      <p>This macro has no steps yet.</p>
                      <button
                        onClick={() => setShowAddStep(true)}
                        className="mt-2 text-megan-400 hover:underline"
                      >
                        Add your first step
                      </button>
                    </div>
                  ) : (
                    selectedMacro.steps.map((step, idx) => (
                      <div
                        key={step.step_id || idx}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-surface-900 border border-surface-700 hover:border-surface-600 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-surface-800 text-[11px] font-mono text-zinc-400 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div className="p-2 rounded-lg bg-surface-800 border border-surface-700">
                            {getStepIcon(step.action_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-zinc-200">
                                {step.action_type}
                              </span>
                              {step.delay_before > 0 && (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  delay: {step.delay_before}s
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate max-w-md">
                              {step.description || JSON.stringify(step.params)}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteStep(idx)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-surface-800 transition"
                          title="Remove step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}

                  {/* Add Step Drawer */}
                  {showAddStep && (
                    <div className="p-4 rounded-xl border border-megan-700/50 bg-surface-900 space-y-3 animate-in fade-in">
                      <h5 className="text-xs font-bold text-white">Add Workflow Step</h5>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">Action Type</label>
                          <select
                            value={newActionType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewActionType(val);
                              if (val === "app_launch") setNewParamKey("app_name");
                              else if (val === "open_url") setNewParamKey("url");
                              else if (val === "hotkey") setNewParamKey("combo");
                              else if (val === "type_text") setNewParamKey("text");
                              else if (val === "delay") setNewParamKey("seconds");
                              else if (val === "shell_command") setNewParamKey("command");
                            }}
                            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                          >
                            <option value="app_launch">Launch Application</option>
                            <option value="open_url">Open URL in Browser</option>
                            <option value="hotkey">Press Key / Hotkey</option>
                            <option value="type_text">Type Text</option>
                            <option value="delay">Wait / Delay Interval</option>
                            <option value="shell_command">Run Whitelisted Command</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">
                            Parameter ({newParamKey})
                          </label>
                          <input
                            type="text"
                            value={newParamVal}
                            onChange={(e) => setNewParamVal(e.target.value)}
                            placeholder={
                              newActionType === "app_launch"
                                ? "e.g. code, notepad, chrome"
                                : newActionType === "open_url"
                                ? "https://..."
                                : newActionType === "hotkey"
                                ? "ctrl+s, enter"
                                : newActionType === "delay"
                                ? "seconds e.g. 1.5"
                                : "parameter value"
                            }
                            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[11px] text-zinc-400 block mb-1">Step Description</label>
                          <input
                            type="text"
                            value={newStepDesc}
                            onChange={(e) => setNewStepDesc(e.target.value)}
                            placeholder="e.g. Launch editor and prepare workspace"
                            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">Pre-step Delay (seconds)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={newStepDelay}
                            onChange={(e) => setNewStepDelay(parseFloat(e.target.value) || 0)}
                            className="w-full bg-surface-800 border border-surface-600 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleAddStep}
                          disabled={!newParamVal.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-megan-600 text-white disabled:opacity-50"
                        >
                          Append Step
                        </button>
                        <button
                          onClick={() => setShowAddStep(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500">
                Select a macro from the left or create a new one.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
