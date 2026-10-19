import { useState } from "react";
import { Camera, RefreshCw, CheckCircle, AlertTriangle, Monitor } from "lucide-react";

const API = "http://localhost:8000";

export function ScreenCopilotPanel() {
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    diagnosis: string;
    query: string;
    dimensions: string;
    preview_thumbnail: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInspectScreen = async (customPrompt?: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const promptToSend = customPrompt !== undefined ? customPrompt : query;
      const res = await fetch(`${API}/api/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: promptToSend || "Analyze my current screen. What is happening, identify any errors or issues, and provide the exact fix."
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to analyze screen");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-700/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-megan-500/10 border border-megan-500/20 text-megan-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
              Screen Copilot
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-megan-500/20 text-megan-300 font-mono font-normal">
                Vision AI
              </span>
            </h3>
            <p className="text-xs text-zinc-500">Multimodal real-time screen diagnosis</p>
          </div>
        </div>
      </div>

      {/* Main Action Button */}
      <button
        onClick={() => handleInspectScreen()}
        disabled={analyzing}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm
          bg-megan-600 hover:bg-megan-500 disabled:opacity-50 disabled:cursor-not-allowed
          text-white shadow-lg shadow-megan-900/30 transition-all duration-200"
      >
        {analyzing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analyzing Screen...</span>
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            <span>Inspect Active Screen Now</span>
          </>
        )}
      </button>

      {/* Quick Prompt Chips */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Quick Actions
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { label: "Diagnose Terminal Error", prompt: "Look at the terminal or error dialog on my screen. Why did it fail and give me the exact command to fix it." },
            { label: "Review Code on Screen", prompt: "Review the code currently visible in my editor. Spot any bugs, syntax issues, or potential optimizations." },
            { label: "Explain What I am Looking At", prompt: "Summarize what application or webpage is active and explain key details." },
          ].map((action, idx) => (
            <button
              key={idx}
              disabled={analyzing}
              onClick={() => {
                setQuery(action.prompt);
                handleInspectScreen(action.prompt);
              }}
              className="text-left px-3 py-2 rounded-lg text-xs bg-surface-800/60 hover:bg-surface-700/80
                border border-surface-700/60 hover:border-megan-700/50 text-zinc-300 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Question Input */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          Ask specific question about screen
        </label>
        <div className="relative">
          <textarea
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. How do I fix the red underline on line 42?"
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface-800/80 border border-surface-700
              focus:border-megan-500 focus:outline-none text-zinc-200 placeholder-zinc-500 resize-none"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Results Box */}
      {result && (
        <div className="rounded-xl border border-surface-700/80 bg-surface-800/40 p-3 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Analysis Complete
            </span>
            <span className="font-mono text-[10px] text-zinc-500">{result.dimensions}</span>
          </div>

          {/* Screenshot Preview */}
          {result.preview_thumbnail && (
            <div className="relative rounded-lg overflow-hidden border border-surface-700/60 bg-black/40">
              <img
                src={result.preview_thumbnail}
                alt="Captured Screen"
                className="w-full h-auto object-contain max-h-36"
              />
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-zinc-400 font-mono">
                Live Capture
              </div>
            </div>
          )}

          {/* Diagnosis Text */}
          <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 max-h-72 overflow-y-auto">
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
              {result.diagnosis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
