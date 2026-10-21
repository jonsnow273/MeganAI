import { useEffect, useState, useCallback } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Monitor,
  Clock,
  FileText,
  Zap,
  MoreVertical,
  Trash2,
  User,
} from "lucide-react";

const API = "http://localhost:8000";

interface Session {
  session_id: string;
  created_at: string;
  message_count: number;
  preview: string;
}

type View = "chat" | "copilot" | "timemachine" | "standup" | "macros";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  currentSessionId: string | null;
  currentView: View;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onNavigate: (view: View) => void;
  username?: string;
}

const FEATURES: { id: View; label: string; icon: typeof Monitor }[] = [
  { id: "copilot", label: "Screen Copilot", icon: Monitor },
  { id: "timemachine", label: "Time Machine", icon: Clock },
  { id: "standup", label: "Standup", icon: FileText },
  { id: "macros", label: "Macros", icon: Zap },
];

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function generateTitle(preview: string): string {
  if (!preview || preview.trim().length === 0) return "New conversation";
  const cleaned = preview.trim().slice(0, 60);
  return cleaned.length < preview.trim().length ? `${cleaned}...` : cleaned;
}

export function Sidebar({
  collapsed,
  onToggle,
  currentSessionId,
  currentView,
  onNewChat,
  onSelectSession,
  onNavigate,
  username = "User",
}: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collapsed) fetchSessions();
  }, [collapsed, fetchSessions, currentSessionId]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpen(null);
    try {
      await fetch(`${API}/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch {
      // silent
    }
  };

  if (collapsed) {
    return (
      <aside className="w-14 h-full bg-dark-surface border-r border-dark-border flex flex-col items-center py-3 gap-3 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <button
          onClick={onNewChat}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label="New chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-full bg-dark-surface border-r border-dark-border flex flex-col flex-shrink-0">
      {/* Top: Logo + Toggle */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-dark-border flex-shrink-0">
        <span className="text-sm font-medium text-dark-text">Megan</span>
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat */}
      <div className="px-2 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-text hover:bg-dark-hover transition-colors"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>New chat</span>
        </button>
      </div>

      {/* Feature Nav */}
      <div className="px-2 pb-2 flex-shrink-0 border-b border-dark-border">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const isActive = currentView === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onNavigate(f.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-dark-hover text-dark-text"
                  : "text-dark-muted hover:text-dark-text hover:bg-dark-hover"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recents */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="text-xs text-dark-subtle px-3 pb-2 font-medium">Recents</p>
        {loading && (
          <p className="text-xs text-dark-subtle px-3 py-2">Loading...</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="text-xs text-dark-subtle px-3 py-2">No conversations yet</p>
        )}
        {sessions.map((session) => {
          const isActive = session.session_id === currentSessionId && currentView === "chat";
          const title = generateTitle(session.preview);
          const relTime = formatRelative(session.created_at);
          return (
            <div key={session.session_id} className="relative group">
              <button
                onClick={() => onSelectSession(session.session_id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-dark-hover text-dark-text"
                    : "text-dark-muted hover:text-dark-text hover:bg-dark-hover"
                }`}
              >
                <span className="truncate flex-1 text-left">{title}</span>
                <span className="text-xs text-dark-subtle flex-shrink-0">{relTime}</span>
              </button>
              <button
                onClick={() => setMenuOpen(menuOpen === session.session_id ? null : session.session_id)}
                className="absolute right-2 top-2.5 w-6 h-6 rounded flex items-center justify-center text-dark-subtle hover:text-dark-text hover:bg-dark-border opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {menuOpen === session.session_id && (
                <div className="absolute right-2 top-10 bg-dark-surface border border-dark-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={(e) => handleDelete(e, session.session_id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="px-2 py-3 border-t border-dark-border flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-hover transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-dark-border flex items-center justify-center text-dark-muted">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm text-dark-text truncate">{username}</span>
        </div>
      </div>
    </aside>
  );
}
