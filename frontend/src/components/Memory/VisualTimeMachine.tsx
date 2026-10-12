import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Search,
  Camera,
  X,
  RefreshCw,
  FileText,
  Monitor,
  ExternalLink,
} from "lucide-react";
import type { TimelineItem, MemoryStatus } from "../../types/memory";

const API_BASE = "http://localhost:8000";

interface VisualTimeMachineProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisualTimeMachine: React.FC<VisualTimeMachineProps> = ({
  isOpen,
  onClose,
}) => {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [appFilter, setAppFilter] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1500); // ms per frame
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [showOcrPanel, setShowOcrPanel] = useState<boolean>(true);
  const [capturingNow, setCapturingNow] = useState<boolean>(false);

  const playTimerRef = useRef<number | null>(null);

  // Fetch timeline from backend
  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "150", order: "asc" });
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (appFilter.trim()) params.append("app", appFilter.trim());

      const res = await fetch(`${API_BASE}/api/memory/timeline?${params.toString()}`);
      if (res.ok) {
        const data: TimelineItem[] = await res.json();
        setTimeline(data);
        if (data.length > 0) {
          // Default to latest frame (end of timeline)
          setCurrentIndex(data.length - 1);
        } else {
          setCurrentIndex(0);
        }
      }
    } catch (err) {
      console.error("Error fetching memory timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, appFilter]);

  // Fetch telemetry status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/memory/status`);
      if (res.ok) {
        const data: MemoryStatus = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Error fetching memory status:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTimeline();
      fetchStatus();
    } else {
      setIsPlaying(false);
    }
  }, [isOpen, fetchTimeline, fetchStatus]);

  // Autoplay loop
  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, timeline.length, playSpeed]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(timeline.length - 1, prev + 1));
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, timeline.length, onClose]);

  // Copy OCR Text
  const handleCopyText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Immediate manual capture trigger
  const handleSnapNow = async () => {
    setCapturingNow(true);
    try {
      const res = await fetch(`${API_BASE}/api/memory/capture-now`, { method: "POST" });
      if (res.ok) {
        await fetchTimeline();
        await fetchStatus();
      }
    } catch (err) {
      console.error("Failed to capture now:", err);
    } finally {
      setCapturingNow(false);
    }
  };

  if (!isOpen) return null;

  const currentItem = timeline[currentIndex] || null;

  const formatTimestamp = (ts: string) => {
    if (!ts) return "Unknown";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
        " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return ts;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-7xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Visual Time Machine
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/40">
                  Digital Memory Scrubber
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Rewind and inspect past workspace frames, OCR text streams, and active apps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Snap now button */}
            <button
              onClick={handleSnapNow}
              disabled={capturingNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
              title="Force immediate screen capture"
            >
              <Camera className={`w-3.5 h-3.5 ${capturingNow ? "animate-spin" : "text-purple-400"}`} />
              <span>{capturingNow ? "Snapping..." : "Snap Frame"}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => { fetchTimeline(); fetchStatus(); }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Refresh timeline"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
            </button>

            {/* Toggle OCR panel */}
            <button
              onClick={() => setShowOcrPanel(!showOcrPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                showOcrPanel
                  ? "bg-purple-950/60 border-purple-700/60 text-purple-200"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
              }`}
              title="Toggle OCR Text Inspector"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>OCR Inspector</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-zinc-800/80 bg-zinc-900/30 gap-4 text-xs">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search text in screen history (e.g. error, git, function)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Filter app (e.g. code, chrome)..."
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="w-48 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            {status && (
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status.running ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                <span>{status.running ? "Daemon Live" : "Daemon Idle"}</span>
                <span className="text-zinc-600">·</span>
                <span>{status.total_captures} Frames Stored</span>
              </span>
            )}
            <span className="text-zinc-500 font-mono">
              {timeline.length > 0 ? `${currentIndex + 1} / ${timeline.length}` : "0 frames"}
            </span>
          </div>
        </div>

        {/* Main Content: Split Screenshot Viewer & OCR Inspector */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Main Visual Display */}
          <div className="flex-1 flex flex-col bg-zinc-950 items-center justify-center p-4 overflow-hidden relative">
            {timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                <div className="p-4 rounded-2xl bg-zinc-900 text-purple-400 mb-4 border border-zinc-800">
                  <Monitor className="w-10 h-10" />
                </div>
                <h3 className="text-base font-medium text-white mb-1">No Frame Snapshots Found</h3>
                <p className="text-xs text-zinc-400 mb-6">
                  Digital memory captures your screen automatically when content changes. Or click below to snap your first frame right now.
                </p>
                <button
                  onClick={handleSnapNow}
                  disabled={capturingNow}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-900/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Current Screen</span>
                </button>
              </div>
            ) : currentItem ? (
              <div className="flex flex-col w-full h-full justify-between items-center">
                {/* Frame Metadata Pill Header */}
                <div className="w-full flex items-center justify-between px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl mb-3 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="px-2 py-0.5 rounded-md font-mono bg-purple-950/80 text-purple-300 border border-purple-800/50">
                      {currentItem.process_name || "desktop"}
                    </span>
                    <span className="font-medium text-zinc-200 truncate max-w-lg" title={currentItem.window_title}>
                      {currentItem.window_title || "Desktop"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400 flex-shrink-0">
                    <span className="font-mono text-zinc-300">
                      {formatTimestamp(currentItem.timestamp)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px]">
                      Δ {currentItem.diff_percent?.toFixed(1)}% change
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[11px]">
                      {currentItem.word_count || 0} words
                    </span>
                  </div>
                </div>

                {/* Screenshot Image Container */}
                <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 relative group">
                  <img
                    src={`${API_BASE}${currentItem.screenshot_url}`}
                    alt={currentItem.window_title || "Memory snapshot"}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition duration-150"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'><rect fill='%2318181b' width='400' height='200'/><text fill='%2371717a' x='50%25' y='50%25' text-anchor='middle'>Snapshot image unavailable</text></svg>";
                    }}
                  />
                  <a
                    href={`${API_BASE}${currentItem.screenshot_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"
                    title="Open full resolution"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* Collapsible Right OCR Inspector Panel */}
          {showOcrPanel && (
            <div className="w-96 border-l border-zinc-800 bg-zinc-900/40 flex flex-col h-full animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/70">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white">OCR Extracted Text</span>
                </div>
                {currentItem?.text && (
                  <button
                    onClick={() => handleCopyText(currentItem.text)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* OCR Text Box */}
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-text selection:bg-purple-600 selection:text-white">
                {currentItem?.text ? (
                  currentItem.text
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                    <p>No OCR text extracted for this frame.</p>
                    <p className="text-[11px] mt-1 text-zinc-600">
                      (Tesseract OCR may be in metadata mode or frame was visual-only)
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Meta Footer */}
              <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/60 text-[11px] text-zinc-400 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Memory ID:</span>
                  <span className="font-mono text-zinc-300 truncate max-w-[180px]">{currentItem?.id || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Capture Path:</span>
                  <span className="font-mono text-zinc-300 truncate max-w-[180px]">{currentItem?.screenshot_filename || "—"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Time Machine Scrubber Bar */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/70 flex flex-col gap-3">
          
          {/* Main Slider Track */}
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-zinc-500 w-20 text-left">
              {timeline.length > 0 ? formatTimestamp(timeline[0]?.timestamp).split("·")[0] : "Past"}
            </span>

            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min={0}
                max={Math.max(0, timeline.length - 1)}
                value={currentIndex}
                onChange={(e) => {
                  setCurrentIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                disabled={timeline.length <= 1}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
              />
            </div>

            <span className="text-[11px] font-mono text-zinc-500 w-20 text-right">
              {timeline.length > 0 ? formatTimestamp(timeline[timeline.length - 1]?.timestamp).split("·")[0] : "Present"}
            </span>
          </div>

          {/* Playback Controls & Frame Stepper */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* Jump to first frame */}
              <button
                onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}
                disabled={currentIndex === 0 || timeline.length === 0}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Jump to oldest frame"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Step backward 1 frame */}
              <button
                onClick={() => { setCurrentIndex((prev) => Math.max(0, prev - 1)); setIsPlaying(false); }}
                disabled={currentIndex === 0 || timeline.length === 0}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Step backward (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Play / Pause Autoplay Reel */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={timeline.length <= 1}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isPlaying
                    ? "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30"
                }`}
                title="Auto-scrub slideshow (Spacebar)"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Reel</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Replay Reel</span>
                  </>
                )}
              </button>

              {/* Step forward 1 frame */}
              <button
                onClick={() => { setCurrentIndex((prev) => Math.min(timeline.length - 1, prev + 1)); setIsPlaying(false); }}
                disabled={currentIndex >= timeline.length - 1 || timeline.length === 0}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Step forward (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Jump to latest frame */}
              <button
                onClick={() => { setCurrentIndex(timeline.length - 1); setIsPlaying(false); }}
                disabled={currentIndex >= timeline.length - 1 || timeline.length === 0}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
                title="Jump to latest present frame"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Playback speed selector */}
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Speed:</span>
              {[2500, 1500, 800].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaySpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                    playSpeed === speed
                      ? "bg-zinc-700 text-white font-semibold"
                      : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {speed === 2500 ? "0.5x" : speed === 1500 ? "1.0x" : "2.0x"}
                </button>
              ))}
              <span className="text-zinc-600 ml-2">|</span>
              <span className="text-[11px] text-zinc-500 ml-2">
                Use ◀ / ▶ keys or Drag Slider
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
