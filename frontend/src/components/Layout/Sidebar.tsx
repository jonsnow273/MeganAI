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
  LogOut,
  LogIn,
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
  currentUser?: { username: string; display_name?: string } | null;
  onOpenAuth: () => void;
  onLogout: () => void;
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

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("megan_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function Sidebar({
  collapsed,
  onToggle,
  currentSessionId,
  currentView,
  onNewChat,
  onSelectSession,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
}: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat/sessions`, {
        headers: getAuthHeader(),
      });
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
  }, [collapsed, fetchSessions, currentSessionId, currentUser]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/chat/history/${sessionId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (currentSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch {
      // silent
    } finally {
      setMenuOpen(null);
    }
  };

  if (collapsed) {
    return (
      <aside className="w-16 flex flex-col items-center py-3 bg-dark-surface border-r border-dark-border h-full flex-shrink-0 transition-all">
        <button
          onClick={onToggle}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors mb-4"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors mb-6"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-2 flex-1 w-full px-2">
          {FEATURES.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-dark-hover text-dark-text"
                    : "text-dark-muted hover:text-dark-text hover:bg-dark-hover"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenAuth}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors mt-auto"
          title={currentUser ? currentUser.username : "Sign In / Register"}
        >
          <User className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 flex flex-col bg-dark-surface border-r border-dark-border h-full flex-shrink-0 transition-all">
      {/* Top: Logo & Toggle */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-dark-border flex-shrink-0">
        <span className="text-sm font-semibold text-dark-text pl-1">Megan AI</span>
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-2 flex-shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dark-border text-dark-text hover:bg-dark-hover text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New chat</span>
        </button>
      </div>

      {/* Feature Views Navigation */}
      <div className="px-2 py-2 flex flex-col gap-1 border-b border-dark-border flex-shrink-0">
        <div className="px-2 py-1 text-[11px] font-semibold text-dark-subtle uppercase tracking-wider">
          Workspace
        </div>
        {FEATURES.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-dark-hover text-dark-text font-medium"
                  : "text-dark-muted hover:text-dark-text hover:bg-dark-hover"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conversations History */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-dark-subtle uppercase tracking-wider flex items-center justify-between">
          <span>Recent Chats</span>
          {loading && <span className="text-[10px] text-dark-subtle lowercase">loading...</span>}
        </div>

        {sessions.length === 0 && !loading && (
          <div className="px-3 py-4 text-xs text-dark-subtle text-center">
            No past conversations yet
          </div>
        )}

        {sessions.map((session) => {
          const isActive = currentSessionId === session.session_id && currentView === "chat";
          const title = generateTitle(session.preview);
          const relTime = formatRelative(session.created_at);
          return (
            <div key={session.session_id} className="relative group">
              <button
                onClick={() => onSelectSession(session.session_id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                  isActive
                    ? "bg-dark-hover text-dark-text font-medium"
                    : "text-dark-muted hover:text-dark-text hover:bg-dark-hover"
                }`}
              >
                <span className="truncate flex-1 text-left">{title}</span>
                <span className="text-[11px] text-dark-subtle flex-shrink-0">{relTime}</span>
              </button>
              <button
                onClick={() => setMenuOpen(menuOpen === session.session_id ? null : session.session_id)}
                className="absolute right-1 top-1.5 w-6 h-6 rounded flex items-center justify-center text-dark-subtle hover:text-dark-text hover:bg-dark-border opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {menuOpen === session.session_id && (
                <div className="absolute right-2 top-8 bg-dark-surface border border-dark-border rounded-lg shadow-lg py-1 z-20 min-w-[110px]">
                  <button
                    onClick={(e) => handleDelete(e, session.session_id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-dark-hover transition-colors"
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

      {/* User Account / Profile Footer */}
      <div className="p-2 border-t border-dark-border flex-shrink-0">
        {currentUser ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-dark-bg/60 border border-dark-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-dark-text truncate">
                  {currentUser.display_name || currentUser.username}
                </div>
                <div className="text-[10px] text-dark-subtle truncate">
                  @{currentUser.username}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-dark-muted hover:text-red-400 hover:bg-dark-hover transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-dashed border-dark-border text-dark-muted hover:text-dark-text hover:border-dark-subtle hover:bg-dark-hover transition-colors text-xs"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Sign In / Create Account</span>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
