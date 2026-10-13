import { useState, useRef, useEffect } from "react";
import {
  X,
  FlaskConical,
  Send,
  Loader2,
  TrendingDown,
  TrendingUp,
  Minus,
  Clock,
  Hash,
  Zap,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import type { CompareResult } from "../../types/steering";

const API = "http://localhost:8000";

const PRESETS = ["cautious", "concise", "detailed", "creative"] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultPreset?: string;
  defaultAlpha?: number;
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "amber" | "sky" | "red" | "neutral";
}) {
  const colors: Record<string, string> = {
    green:   "text-emerald-400",
    amber:   "text-amber-400",
    sky:     "text-sky-400",
    red:     "text-red-400",
    neutral: "text-zinc-400",
  };
  return (
    <div className="flex flex-col items-center gap-1 bg-surface-800/60 border border-surface-600/40 rounded-xl p-3 min-w-[80px]">
      <span className="text-zinc-600">{icon}</span>
      <span className="text-[10px] text-zinc-600 text-center">{label}</span>
      <span className={`text-sm font-bold font-mono tabular-nums ${colors[accent ?? "neutral"]}`}>{value}</span>
      {sub && <span className="text-[10px] text-zinc-700">{sub}</span>}
    </div>
  );
}

function ResponsePane({
  label,
  accentClass,
  badgeClass,
  text,
  loading,
}: {
  label: string;
  accentClass: string;
  badgeClass: string;
  text: string;
  loading: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-surface-600 bg-surface-800/50 overflow-hidden">
      {/* Pane header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-surface-600/60 ${badgeClass}`}>
        <span className={`w-2 h-2 rounded-full ${accentClass}`} />
        <span className="text-xs font-semibold text-zinc-200">{label}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating…</span>
          </div>
        ) : text ? (
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{text}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">Response will appear here.</p>
        )}
      </div>
    </div>
  );
}

export function SteeringComparisonView({
  isOpen,
  onClose,
  defaultPreset = "concise",
  defaultAlpha = 1.5,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<string>(defaultPreset);
  const [alpha, setAlpha] = useState(defaultAlpha);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreset(defaultPreset);
      setAlpha(defaultAlpha);
      setResult(null);
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, defaultPreset, defaultAlpha]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleRun = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API}/api/steering/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt.trim(), preset, alpha }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CompareResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Comparison failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  if (!isOpen) return null;

  /* ── Token delta helpers ── */
  const delta = result?.metrics.token_delta_percentage ?? null;
  const deltaSign = delta != null ? (delta > 2 ? "up" : delta < -2 ? "down" : "neutral") : null;
  const deltaColor = deltaSign === "up" ? "amber" : deltaSign === "down" ? "green" : "neutral";
  const deltaIcon =
    deltaSign === "up" ? <TrendingUp className="w-3.5 h-3.5" /> :
    deltaSign === "down" ? <TrendingDown className="w-3.5 h-3.5" /> :
    <Minus className="w-3.5 h-3.5" />;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-enter"
      role="dialog"
      aria-modal="true"
      aria-label="Steering Comparison Lab"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col bg-surface-900 border border-surface-600 rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border border-megan-700/40 bg-megan-900/40">
              <FlaskConical className="w-5 h-5 text-megan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Steering Comparison Lab
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-megan-950 border border-megan-800/50 text-megan-400">
                  Research
                </span>
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Run the same prompt through baseline and steered paths — observe behavioral shift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison view"
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Config Row ── */}
        <div className="flex items-end gap-4 px-6 py-4 border-b border-surface-700/60 flex-shrink-0 flex-wrap">
          {/* Preset picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest">
              Preset
            </label>
            <div className="relative">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="appearance-none bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-sm text-zinc-200 pr-8 focus:border-megan-500/60 transition-colors cursor-pointer"
              >
                {PRESETS.map((p) => (
                  <option key={p} value={p} className="bg-surface-900">
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Alpha slider */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest flex items-center justify-between">
              <span>Strength (α)</span>
              <span className={`font-mono ${alpha > 2.5 ? "text-amber-400" : "text-megan-300"}`}>
                {alpha.toFixed(2)}
              </span>
            </label>
            <div className="relative">
              <div className="w-full h-1.5 rounded-full bg-surface-600">
                <div
                  className="h-full rounded-full megan-gradient transition-all duration-150"
                  style={{ width: `${(alpha / 2.8) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={2.8}
                step={0.05}
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
                aria-label="Alpha strength"
              />
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={loading || !prompt.trim()}
            className="
              ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl
              font-semibold text-sm text-white
              bg-gradient-megan hover:shadow-glow
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
              transition-all duration-200
            "
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
            ) : (
              <><Send className="w-4 h-4" /> Run Comparison</>
            )}
          </button>
        </div>

        {/* ── Prompt Input ── */}
        <div className="px-6 py-3 border-b border-surface-700/60 flex-shrink-0">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Enter a prompt to compare… e.g. "Explain TCP vs UDP" · Ctrl+Enter to run'
            rows={2}
            className="
              w-full bg-surface-800 border border-surface-600 rounded-xl
              px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600
              focus:border-megan-500/60 transition-colors resize-none
            "
            style={{ maxHeight: "100px" }}
          />
        </div>

        {/* ── Metrics Row ── */}
        {result && (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-700/60 overflow-x-auto flex-shrink-0">
            <MetricCard
              icon={<Hash className="w-3.5 h-3.5" />}
              label="Unsteered tokens"
              value={String(result.metrics.unsteered_tokens)}
              accent="neutral"
            />
            <MetricCard
              icon={<Hash className="w-3.5 h-3.5" />}
              label="Steered tokens"
              value={String(result.metrics.steered_tokens)}
              accent="sky"
            />
            <MetricCard
              icon={deltaIcon}
              label="Token delta"
              value={`${delta! > 0 ? "+" : ""}${delta!.toFixed(1)}%`}
              sub={delta! < 0 ? "more concise" : delta! > 0 ? "more verbose" : "same length"}
              accent={deltaColor as any}
            />
            <MetricCard
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Baseline latency"
              value={`${result.metrics.unsteered_latency_ms}ms`}
              accent="neutral"
            />
            <MetricCard
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Steered latency"
              value={`${result.metrics.steered_latency_ms}ms`}
              accent="sky"
            />
            <MetricCard
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Active preset"
              value={preset}
              sub={`α = ${alpha.toFixed(2)}`}
              accent="green"
            />
          </div>
        )}

        {/* ── Side-by-Side Panes ── */}
        <div className="flex-1 flex gap-4 p-6 overflow-hidden min-h-0">
          {error && (
            <div className="w-full flex items-center justify-center">
              <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Comparison failed</p>
                  <p className="text-xs text-red-400 mt-0.5">{error} — Is the backend running?</p>
                </div>
              </div>
            </div>
          )}

          {!error && (
            <>
              <ResponsePane
                label="Unsteered Baseline (α = 0)"
                accentClass="bg-zinc-400"
                badgeClass="bg-surface-800/80"
                text={result?.unsteered ?? ""}
                loading={loading}
              />

              {/* Divider */}
              <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                <div className="w-px flex-1 bg-gradient-to-b from-transparent via-megan-700/50 to-transparent" />
                <span className="text-[10px] text-megan-600 font-bold rotate-0 px-1 py-2 rounded bg-megan-950/60 border border-megan-800/40">
                  VS
                </span>
                <div className="w-px flex-1 bg-gradient-to-b from-transparent via-megan-700/50 to-transparent" />
              </div>

              <ResponsePane
                label={`Steered: ${preset.charAt(0).toUpperCase() + preset.slice(1)} (α = ${alpha.toFixed(2)})`}
                accentClass="bg-megan-400"
                badgeClass="bg-megan-950/30"
                text={result?.steered ?? ""}
                loading={loading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
