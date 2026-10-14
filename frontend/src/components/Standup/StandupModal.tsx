import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  GitCommit,
  Brain,
  Monitor,
  Copy,
  Check,
  Download,
  RefreshCw,
  X,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { StandupResponse, StandupReportItem, StandupTodayPreview } from "../../types/standup";

const API_BASE = "http://localhost:8000";

interface StandupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandupModal: React.FC<StandupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [targetDate, setTargetDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [includeGit, setIncludeGit] = useState<boolean>(true);
  const [includeFocus, setIncludeFocus] = useState<boolean>(true);
  const [includeMemory, setIncludeMemory] = useState<boolean>(true);
  const [blockers, setBlockers] = useState<string>("");
  const [tomorrowPlan, setTomorrowPlan] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<StandupResponse | null>(null);
  const [preview, setPreview] = useState<StandupTodayPreview | null>(null);
  const [history, setHistory] = useState<StandupReportItem[]>([]);
  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [copiedPlain, setCopiedPlain] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch quick live preview of today
  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/standup/today/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch past reports
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/standup/reports`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
      fetchHistory();
    }
  }, [isOpen, fetchPreview, fetchHistory]);

  // Generate Report
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/standup/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_date: targetDate,
          include_git: includeGit,
          include_focus: includeFocus,
          include_memory: includeMemory,
          blockers: blockers.trim() || null,
          tomorrow_plan: tomorrowPlan.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data: StandupResponse = await res.json();
      setReport(data);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "Failed to generate standup report");
    } finally {
      setLoading(false);
    }
  };

  // Load a historical report
  const handleLoadHistory = async (reportDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/standup/reports/${reportDate}`);
      if (res.ok) {
        const text = await res.text();
        setReport({
          markdown: text,
          plain_text: text,
          metadata: {
            report_date: reportDate,
            generated_at: new Date().toISOString(),
            commit_count: 0,
            branch: "unknown",
            productivity_score: null,
            focus_sessions: 0,
            memory_snapshots: 0,
            top_apps: [],
          },
        });
        setActiveTab("generate");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Clipboard copy helpers
  const copyToClipboard = (text: string, isPlain: boolean) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isPlain) {
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 2000);
    } else {
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  // Download markdown file
  const handleDownload = () => {
    if (!report?.markdown) return;
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `standup_${report.metadata?.report_date || targetDate}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-surface-950 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-surface-700 bg-surface-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl megan-gradient flex items-center justify-center shadow-glow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Daily Standup Report</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-megan-950 text-megan-300 border border-megan-800/50">
                  Feature #10
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Automated synthesis of Git commits, Focus Coach metrics, and Digital Memory screen context
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-surface-800 p-0.5 rounded-xl border border-surface-600 text-xs">
              <button
                onClick={() => setActiveTab("generate")}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  activeTab === "generate"
                    ? "bg-megan-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Generator
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-megan-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>History</span>
                {history.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-surface-700 text-[10px] flex items-center justify-center text-zinc-300">
                    {history.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {activeTab === "generate" ? (
            <div className="flex flex-1 overflow-hidden divide-x divide-surface-700">
              
              {/* Left Panel: Configuration & Inputs */}
              <div className="w-80 flex flex-col p-4 bg-surface-900/40 overflow-y-auto space-y-4 flex-shrink-0">
                
                {/* Date Picker */}
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Report Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-megan-500"
                    />
                  </div>
                </div>

                {/* Subsystem Data Source Toggles */}
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                    Include Subsystems
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-800/60 border border-surface-600/50 cursor-pointer hover:border-surface-500 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={includeGit}
                        onChange={(e) => setIncludeGit(e.target.checked)}
                        className="rounded accent-purple-600"
                      />
                      <GitCommit className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Git Commits</span>
                        {preview && preview.date === targetDate && (
                          <span className="text-[10px] text-zinc-500 block">
                            {preview.git.commit_count} commits today
                          </span>
                        )}
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-800/60 border border-surface-600/50 cursor-pointer hover:border-surface-500 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={includeFocus}
                        onChange={(e) => setIncludeFocus(e.target.checked)}
                        className="rounded accent-purple-600"
                      />
                      <Brain className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Focus Coach</span>
                        {preview && preview.date === targetDate && preview.focus.has_data && (
                          <span className="text-[10px] text-zinc-500 block">
                            {preview.focus.formatted.productive || "0m"} productive
                          </span>
                        )}
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-800/60 border border-surface-600/50 cursor-pointer hover:border-surface-500 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={includeMemory}
                        onChange={(e) => setIncludeMemory(e.target.checked)}
                        className="rounded accent-purple-600"
                      />
                      <Monitor className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Digital Memory</span>
                        {preview && preview.date === targetDate && preview.memory.has_data && (
                          <span className="text-[10px] text-zinc-500 block">
                            {preview.memory.snapshot_count} screen frames
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Freeform Inputs */}
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Blockers (Optional)
                  </label>
                  <textarea
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    placeholder="e.g. Waiting on API key approval..."
                    rows={2}
                    className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-megan-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Tomorrow's Plan (Optional)
                  </label>
                  <textarea
                    value={tomorrowPlan}
                    onChange={(e) => setTomorrowPlan(e.target.value)}
                    placeholder="e.g. Implement Macro Recorder replay engine..."
                    rows={2}
                    className="w-full bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-megan-500 resize-none"
                  />
                </div>

                {/* Action button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-gradient-megan text-white shadow-glow-sm hover:shadow-glow disabled:opacity-50 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>{loading ? "Synthesizing Data..." : "Generate Standup Report"}</span>
                </button>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Right Panel: Report Output View */}
              <div className="flex-1 flex flex-col bg-surface-950 overflow-hidden">
                {report ? (
                  <>
                    {/* Output action toolbar */}
                    <div className="flex items-center justify-between px-6 py-2.5 border-b border-surface-700 bg-surface-900/40">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Calendar className="w-3.5 h-3.5 text-megan-400" />
                        <span className="font-medium text-zinc-300">
                          {report.metadata?.report_date || targetDate}
                        </span>
                        {report.metadata?.branch && (
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-surface-800 border border-surface-600 text-zinc-400">
                            {report.metadata.branch}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy Markdown */}
                        <button
                          onClick={() => copyToClipboard(report.markdown, false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-zinc-300 border border-surface-600 transition"
                        >
                          {copiedMd ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied MD</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Markdown</span>
                            </>
                          )}
                        </button>

                        {/* Copy Plain Text */}
                        <button
                          onClick={() => copyToClipboard(report.plain_text, true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 hover:bg-surface-700 text-zinc-300 border border-surface-600 transition"
                          title="Copy without markdown formatting for Slack or Teams"
                        >
                          {copiedPlain ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">Copied Text</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Plain Text</span>
                            </>
                          )}
                        </button>

                        {/* Download */}
                        <button
                          onClick={handleDownload}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-800 border border-surface-600 transition"
                          title="Download Markdown report file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Markdown Renderer Area */}
                    <div className="flex-1 p-6 overflow-y-auto prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-table:text-xs">
                      <ReactMarkdown>{report.markdown}</ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-surface-900 border border-surface-700 flex items-center justify-center text-megan-400 mb-4 shadow-glow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">
                      Ready to Synthesize Standup
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                      Click <strong>Generate Standup Report</strong> to synthesize today's Git commits, Focus Coach productivity stats, and Digital Memory screen topics into a clean team report.
                    </p>
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-megan text-white shadow-glow hover:shadow-glow-lg transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate Today's Report</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* History Tab */
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-sm font-semibold text-white mb-3">Saved Standup Reports</h3>
              {history.length === 0 ? (
                <div className="text-center py-12 text-xs text-zinc-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                  <p>No saved reports found yet.</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Generate your first report in the Generator tab.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {history.map((item) => (
                    <div
                      key={item.filename}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-surface-900 border border-surface-700 hover:border-megan-600/50 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-surface-800 text-megan-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-200">
                            Standup: {item.date}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {Math.round(item.size_bytes / 1024 * 10) / 10} KB · {item.filename}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleLoadHistory(item.date)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 group-hover:bg-megan-600 text-zinc-300 group-hover:text-white transition"
                      >
                        View Report
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
