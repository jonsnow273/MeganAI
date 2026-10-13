import { useState } from "react";
import {
  Zap,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Activity,
  Layers,
  Hash,
  RotateCcw,
} from "lucide-react";
import { useSteering } from "../../hooks/useSteering";
import { SteeringComparisonView } from "./SteeringComparisonView";

/* ── Preset definitions ── */
const PRESETS = [
  {
    name: "neutral",
    label: "Neutral",
    description: "Baseline — no steering applied",
    color: "text-zinc-300",
    activeBg: "bg-zinc-700/60 border-zinc-500",
    dot: "bg-zinc-400",
  },
  {
    name: "cautious",
    label: "Cautious",
    description: "Safety-first, careful answers",
    color: "text-amber-300",
    activeBg: "bg-amber-950/60 border-amber-600/60",
    dot: "bg-amber-400",
  },
  {
    name: "concise",
    label: "Concise",
    description: "Shorter, direct responses",
    color: "text-sky-300",
    activeBg: "bg-sky-950/60 border-sky-600/60",
    dot: "bg-sky-400",
  },
  {
    name: "detailed",
    label: "Detailed",
    description: "Thorough, expanded explanations",
    color: "text-emerald-300",
    activeBg: "bg-emerald-950/60 border-emerald-600/60",
    dot: "bg-emerald-400",
  },
  {
    name: "creative",
    label: "Creative",
    description: "More imaginative, associative",
    color: "text-fuchsia-300",
    activeBg: "bg-fuchsia-950/60 border-fuchsia-600/60",
    dot: "bg-fuchsia-400",
  },
] as const;

const MAX_ALPHA = 2.8;

export function SteeringPanel() {
  const { status, loading, setPreset, reset } = useSteering();
  const [alpha, setAlpha] = useState(1.5);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handlePresetClick = (name: string) => {
    if (name === "neutral") {
      reset();
    } else {
      setPreset(name, alpha);
    }
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAlpha(val);
    // Re-apply if a preset is already active
    if (status.active && status.preset && status.preset !== "neutral") {
      setPreset(status.preset, val);
    }
  };

  const alphaPercent = (alpha / MAX_ALPHA) * 100;

  return (
    <>
      <div className="rounded-2xl border border-surface-600 bg-surface-800/60 overflow-hidden">
        {/* ── Header ── */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-700/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-megan-900/60 border border-megan-700/40">
              <Zap className="w-3.5 h-3.5 text-megan-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">Activation Steering</span>
            {status.active && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-megan-900/80 border border-megan-600/50 text-[11px] text-megan-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-megan-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-surface-700/60">

            {/* ── Preset Grid ── */}
            <div className="pt-3">
              <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">
                Behavior Preset
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESETS.map((p) => {
                  const isActive =
                    p.name === "neutral"
                      ? !status.active
                      : status.active && status.preset === p.name;
                  return (
                    <button
                      key={p.name}
                      onClick={() => handlePresetClick(p.name)}
                      disabled={loading}
                      className={`
                        relative group flex items-center gap-3 px-3 py-2.5 rounded-xl
                        border text-left transition-all duration-200 overflow-hidden
                        ${isActive
                          ? `${p.activeBg} ${p.color} shadow-glow-sm`
                          : "bg-surface-700/30 border-surface-600/50 text-zinc-500 hover:text-zinc-300 hover:bg-surface-700/60 hover:border-surface-500"
                        }
                        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      {/* active gradient shimmer */}
                      {isActive && (
                        <span className="absolute inset-0 opacity-10 megan-gradient rounded-xl" />
                      )}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? p.dot : "bg-zinc-700"}`} />
                      <div className="flex-1 min-w-0 relative z-10">
                        <span className="text-xs font-semibold">{p.label}</span>
                        <p className="text-[11px] opacity-60 truncate">{p.description}</p>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-medium opacity-70 relative z-10">α={alpha.toFixed(1)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Alpha Strength Slider ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest">
                  Strength (α)
                </p>
                <div className="flex items-center gap-2">
                  {alpha > 2.5 && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      ⚠ High — may degrade quality
                    </span>
                  )}
                  <span className={`
                    text-sm font-bold font-mono tabular-nums
                    ${alpha > 2.5 ? "text-amber-400" : alpha > 1.5 ? "text-megan-300" : "text-zinc-400"}
                  `}>
                    {alpha.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Slider track with gradient fill */}
              <div className="relative">
                <div className="w-full h-1.5 rounded-full bg-surface-600 overflow-hidden">
                  <div
                    className="h-full rounded-full megan-gradient transition-all duration-150"
                    style={{ width: `${alphaPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={MAX_ALPHA}
                  step={0.05}
                  value={alpha}
                  onChange={handleAlphaChange}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
                  aria-label="Steering strength alpha"
                />
              </div>

              <div className="flex justify-between text-[10px] text-zinc-700 mt-1">
                <span>0.0 (off)</span>
                <span>1.4 (med)</span>
                <span>2.8 (max)</span>
              </div>
            </div>

            {/* ── Telemetry Badge ── */}
            {status.active && (
              <div className="rounded-xl border border-megan-800/50 bg-megan-950/40 p-3 space-y-2">
                <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-megan-500" />
                  Live Telemetry
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Preset */}
                  <div className="flex flex-col items-center bg-surface-800/60 rounded-lg p-2 border border-surface-600/40">
                    <Hash className="w-3 h-3 text-zinc-600 mb-1" />
                    <span className="text-[10px] text-zinc-600">Preset</span>
                    <span className="text-xs font-semibold text-megan-300 capitalize mt-0.5">
                      {status.preset ?? "—"}
                    </span>
                  </div>
                  {/* Layer */}
                  <div className="flex flex-col items-center bg-surface-800/60 rounded-lg p-2 border border-surface-600/40">
                    <Layers className="w-3 h-3 text-zinc-600 mb-1" />
                    <span className="text-[10px] text-zinc-600">Layer</span>
                    <span className="text-xs font-semibold text-accent-400 mt-0.5">
                      {status.layer ?? "—"}
                    </span>
                  </div>
                  {/* Vector norm */}
                  <div className="flex flex-col items-center bg-surface-800/60 rounded-lg p-2 border border-surface-600/40">
                    <Zap className="w-3 h-3 text-zinc-600 mb-1" />
                    <span className="text-[10px] text-zinc-600">‖v‖</span>
                    <span className="text-xs font-semibold text-emerald-400 mt-0.5">
                      {status.vector_norm != null
                        ? status.vector_norm.toFixed(2)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Action row ── */}
            <div className="flex items-center gap-2 pt-1">
              {/* Compare button */}
              <button
                onClick={() => setCompareOpen(true)}
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-3 py-2 rounded-xl text-xs font-semibold
                  bg-gradient-megan text-white
                  hover:shadow-glow transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Compare Outputs
              </button>

              {/* Reset */}
              {status.active && (
                <button
                  onClick={reset}
                  disabled={loading}
                  aria-label="Reset steering to neutral"
                  title="Reset to neutral"
                  className="p-2 rounded-xl border border-surface-600 bg-surface-700/60 hover:bg-surface-700 text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comparison modal */}
      <SteeringComparisonView
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        defaultPreset={status.preset ?? "concise"}
        defaultAlpha={alpha}
      />
    </>
  );
}
