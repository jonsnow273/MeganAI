import { useEffect, useState, useCallback } from "react";
import {
  PlusCircle,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react";

const API = "http://localhost:8000";

interface Session {
  session_id: string;
  created_at: string;
  message_count: number;
  preview: string;
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function Sidebar({
  collapsed,
  onToggle,
  currentSessionId,
  onNewChat,
  onSelectSession,
}: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      // backend unavailable — show empty state gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, currentSessionId]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await fetch(`${API}/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside
      className={`
        relative flex flex-col h-full
        bg-surface-900 border-r border-surface-700
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? "w-14" : "w-64"}
      `}
    >
      {/* ── Top: Logo + Toggle ── */}
      <div className={`flex items-center border-b border-surface-700 h-14 px-3 gap-2 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg megan-gradient flex items-center justify-center flex-shrink-0 shadow-glow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm megan-gradient-text tracking-tight truncate">
              Megan
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg megan-gradient flex items-center justify-center shadow-glow-sm">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-700 transition-colors ${collapsed ? "absolute -right-3 top-4 z-10 bg-surface-800 border border-surface-600 shadow-md" : ""}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── New Chat Button ── */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`
            group relative w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5
            bg-surface-800 hover:bg-surface-700 border border-surface-600
            hover:border-megan-400/50 text-zinc-300 hover:text-white
            transition-all duration-200 overflow-hidden
            ${collapsed ? "justify-center px-2" : ""}
          `}
          aria-label="New Chat"
        >
          {/* subtle gradient shimmer on hover */}
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-megan-subtle rounded-xl" />
          <PlusCircle className="w-4 h-4 text-megan-400 flex-shrink-0 relative z-10" />
          {!collapsed && (
            <span className="text-sm font-medium relative z-10">New Chat</span>
          )}
        </button>
      </div>

      {/* ── Sessions List ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {!collapsed && (
          <p className="text-[11px] text-zinc-600 font-semibold uppercase tracking-widest px-2 pb-2 pt-1">
            Recent
          </p>
        )}

        {loading && (
          <div className={`flex ${collapsed ? "justify-center" : "items-center gap-2"} px-2 py-3 text-zinc-600`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            {!collapsed && <span className="text-xs">Loading…</span>}
          </div>
        )}

        {!loading && sessions.length === 0 && !collapsed && (
          <div className="px-2 py-6 text-center">
            <Clock className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">No conversations yet.</p>
            <p className="text-xs text-zinc-700 mt-0.5">Start chatting to save history.</p>
          </div>
        )}

        {sessions.map((session) => {
          const isActive = session.session_id === currentSessionId;
          const isDeleting = deletingId === session.session_id;

          return (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={`
                group relative w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2
                text-left transition-all duration-200
                ${isActive
                  ? "bg-megan-900/60 border border-megan-700/50 text-white shadow-glow-sm"
                  : "hover:bg-surface-700/60 border border-transparent text-zinc-400 hover:text-zinc-200"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              aria-label={session.preview || "Past conversation"}
              title={collapsed ? (session.preview || "Past conversation") : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full megan-gradient" />
              )}

              <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-megan-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-snug">
                    {session.preview || "Conversation"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-zinc-600">{formatRelative(session.created_at)}</span>
                    <span className="text-[10px] text-zinc-700">·</span>
                    <span className="text-[10px] text-zinc-600">{session.message_count} msg</span>
                  </div>
                </div>
              )}

              {/* Delete button — appears on hover */}
              {!collapsed && (
                <button
                  onClick={(e) => handleDelete(e, session.session_id)}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                  aria-label="Delete session"
                >
                  {isDeleting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bottom: version tag ── */}
      {!collapsed && (
        <div className="p-3 border-t border-surface-700">
          <p className="text-[10px] text-zinc-700 text-center">
            Megan v0.1 · Local AI
          </p>
        </div>
      )}
    </aside>
  );
}
