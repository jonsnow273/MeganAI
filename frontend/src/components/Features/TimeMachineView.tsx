import { useState, useEffect, useCallback } from "react";
import { Clock, Camera, Play, HelpCircle, Check, ArrowRight } from "lucide-react";
import { VisualTimeMachine } from "../Memory/VisualTimeMachine";

const API = "http://localhost:8000";

export function TimeMachineView() {
  const [isOpen, setIsOpen] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [snapMsg, setSnapMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/memory/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSnapNow = async () => {
    setSnapping(true);
    setSnapMsg(null);
    try {
      const res = await fetch(`${API}/api/memory/capture-now`, { method: "POST" });
      if (res.ok) {
        setSnapMsg("Captured snapshot successfully.");
        fetchStatus();
      } else {
        setSnapMsg("Capture completed (or skipped if screen unchanged).");
      }
    } catch (e: any) {
      setSnapMsg(e.message || "Failed to capture snapshot.");
    } finally {
      setSnapping(false);
      setTimeout(() => setSnapMsg(null), 4000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visual Time Machine</h1>
            <p className="text-xs text-slate-500 font-medium">Temporal screen memory and searchable work history</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 max-w-2xl leading-relaxed">
          A temporal visual memory engine that periodically snapshots what is visible on your screen, indexes text with local OCR, and lets you rewind and search past work sessions minute by minute.
        </p>

        {/* How to Use Guide */}
        <div className="mb-6 p-5 rounded-2xl bg-white/80 border border-sky-150 text-xs text-slate-600 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>How to use Time Machine:</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600">
            <li><strong>Snap Frame:</strong> Captures your current screen immediately and saves it into your visual history timeline.</li>
            <li><strong>Visual Scrubber:</strong> Click &ldquo;Open Interactive Scrubber&rdquo; to drag through past desktop states with frame-by-frame inspection.</li>
            <li><strong>OCR Search:</strong> Search any word, terminal command, or code snippet seen on screen in the past week to jump to that exact frame.</li>
            <li><strong>Privacy Filtering:</strong> Sensitive windows like password managers and banking tabs are blocked in RAM before saving.</li>
          </ul>
        </div>

        {/* Status Telemetry */}
        {status && (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-sky-150 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${status.running ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              <span className="text-slate-800 font-semibold">
                Engine Status: {status.running ? "Active (Recording frames)" : "Idle / Paused"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-500 font-medium">
              <span>Saved Snapshots: {status.total_snapshots ?? 0}</span>
              <span>Indexed Words: {status.indexed_words ?? 0}</span>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-6 rounded-2xl bg-white border border-sky-150 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                <span>Interactive Time Machine</span>
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Launch the temporal player to scrub through historical desktop frames and copy past OCR text.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.99]"
            >
              <span>Open Interactive Scrubber</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-sky-150 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" />
                <span>Manual Snapshot</span>
              </h2>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Take an immediate high-resolution frame of your current workspace and save it to the memory timeline.
              </p>
            </div>
            <button
              onClick={handleSnapNow}
              disabled={snapping}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-50 hover:bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Camera className={`w-4 h-4 ${snapping ? "animate-spin" : ""}`} />
              <span>{snapping ? "Snapping Screen..." : "Snap Screen Frame Now"}</span>
            </button>
          </div>
        </div>

        {snapMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{snapMsg}</span>
          </div>
        )}

        {/* Modal Player */}
        <VisualTimeMachine isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
