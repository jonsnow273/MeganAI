import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  GitCommit,
  Brain,
  Monitor,
  Copy,
  Check,
  Download,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { StandupModal } from "../Standup/StandupModal";
import type { StandupResponse, StandupTodayPreview } from "../../types/standup";

const API = "http://localhost:8000";

export function StandupView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<StandupTodayPreview | null>(null);
  const [report, setReport] = useState<StandupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/standup/today/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleQuickGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/standup/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          include_git: true,
          include_focus: true,
          include_memory: true,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data: StandupResponse = await res.json();
      setReport(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate standup report");
    } finally {
      setLoading(false);
    }
  };

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

  const handleDownload = () => {
    if (!report?.markdown) return;
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `standup_${report.metadata?.report_date || "today"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Daily Standup Reports</h1>
            <p className="text-xs text-slate-500 font-medium">Automatic engineering telemetry synthesis</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 max-w-2xl leading-relaxed">
          Automatically synthesize your engineering activities into clean Markdown and plain-text standups. Aggregates Git commit logs, Focus Coach telemetry, and Digital Memory screen topics.
        </p>

        {/* How to Use Guide */}
        <div className="mb-6 p-5 rounded-2xl bg-white/80 border border-sky-150 text-xs text-slate-600 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>How Standup Reports work:</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600">
            <li><strong>Git Commits:</strong> Extracts your local git log for today (branch, commit hashes, changed lines, and messages).</li>
            <li><strong>Focus Coach:</strong> Summarizes active productive intervals and top IDE/tool application usage.</li>
            <li><strong>Digital Memory:</strong> Correlates screen topics to mention files or tasks you explored even if not yet committed.</li>
            <li><strong>Format Options:</strong> Copy as formatted Markdown for Slack, Jira, and GitHub, or Plain Text for email.</li>
          </ul>
        </div>

        {/* Today Preview Telemetry Bar */}
        {preview && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-white border border-sky-150 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex-shrink-0">
                <GitCommit className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium">Today Git Commits</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {preview.git.commit_count} commits ({preview.git.branch})
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-sky-150 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex-shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium">Productive Focus</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {preview.focus.formatted?.productive || "0m logged"}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-sky-150 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex-shrink-0">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium">Screen Memory</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {preview.memory.snapshot_count} frames recorded
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={handleQuickGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-sm shadow-emerald-600/20 active:scale-[0.99]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Synthesizing Data..." : "Quick Generate Today Standup"}</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-sky-200 text-slate-700 hover:text-slate-900 hover:bg-sky-50 text-xs font-medium transition-colors"
          >
            <span>Open Standup Studio (Blockers & History)</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
            {error}
          </div>
        )}

        {/* Generated Report Card */}
        {report && (
          <div className="rounded-2xl bg-white border border-sky-150 shadow-sm overflow-hidden animate-fade-in mb-6">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-sky-150 bg-sky-50/50">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-900">Standup Report: {report.metadata?.report_date}</span>
                {report.metadata?.branch && (
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-sky-100 text-sky-800 border border-sky-200 font-medium">
                    {report.metadata.branch}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(report.markdown, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-sky-50 text-slate-700 border border-sky-200 transition"
                >
                  {copiedMd ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied MD</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => copyToClipboard(report.plain_text, true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-sky-50 text-slate-700 border border-sky-200 transition"
                >
                  {copiedPlain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied Plain</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Plain Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-sky-50 border border-sky-200 transition"
                  title="Download Markdown file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700">
              <ReactMarkdown>{report.markdown}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Full Modal */}
        <StandupModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
}
