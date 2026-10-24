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
  MessageSquare,
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

const FEATURES: { id: View; label: string; icon: typeof Monitor; badge?: string }[] = [
  { id: "copilot", label: "Screen Copilot", icon: Monitor, badge: "Vision" },
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
  const cleaned = preview.trim().slice(0, 50);
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
      <aside className="w-16 flex flex-col items-center py-4 bg-[#0d0d10] border-r border-[#27272e] h-full flex-shrink-0 transition-all">
        <div className="w-9 h-9 flex items-center justify-center mb-3">
          <img src="/megan-logo.png" alt="Megan" className="w-8 h-8 rounded-lg object-contain" />
        </div>

        <button
          onClick={onToggle}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181c] transition-colors mb-4"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-coral-glow-sm transition-colors mb-6"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-2 flex-1 w-full px-2">
          <button
            onClick={() => onNavigate("chat")}
            className={`w-full h-10 rounded-xl flex items-center justify-center transition-colors ${
              currentView === "chat"
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "text-zinc-400 hover:text-white hover:bg-[#18181c]"
            }`}
            title="Chat Assistant"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {FEATURES.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-[#18181c]"
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
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181c] transition-colors mt-auto"
          title={currentUser ? currentUser.username : "Sign In / Register"}
        >
          <User className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 flex flex-col bg-[#0d0d10] border-r border-[#27272e] h-full flex-shrink-0 transition-all">
      {/* ── TOP SECTION (Matching Sketch: Logo, New Chat, Workspaces, Recent Chats) ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#27272e] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/megan-logo.png" alt="Megan AI" className="w-8 h-8 rounded-lg object-contain shadow-sm" />
            <span className="text-sm font-bold text-zinc-100 tracking-tight">Megan AI</span>
          </div>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#18181c] transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 flex-shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-semibold shadow-coral-glow-sm transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Workspace Feature Views */}
        <div className="px-3 pb-2 flex flex-col gap-1 flex-shrink-0">
          <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Workspace Tools
          </div>

          <button
            onClick={() => onNavigate("chat")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
              currentView === "chat"
                ? "bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c]"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-rose-400" />
            <span>Chat Assistant</span>
          </button>

          {FEATURES.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  isActive
                    ? "bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
            <span>Recent Chats</span>
            {loading && <span className="text-[10px] text-zinc-500 lowercase">syncing...</span>}
          </div>

          {sessions.length === 0 && !loading && (
            <div className="px-3 py-6 text-xs text-zinc-500 text-center">
              No conversations yet
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
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isActive
                      ? "bg-rose-500/15 text-rose-300 font-semibold border border-rose-500/30"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c]"
                  }`}
                >
                  <span className="truncate flex-1 text-left">{title}</span>
                  <span className="text-[10px] text-zinc-500 flex-shrink-0">{relTime}</span>
                </button>

                <button
                  onClick={() => setMenuOpen(menuOpen === session.session_id ? null : session.session_id)}
                  className="absolute right-1.5 top-2 w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Options"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {menuOpen === session.session_id && (
                  <div className="absolute right-2 top-8 bg-[#18181c] border border-[#27272e] rounded-xl shadow-xl py-1 z-20 min-w-[110px] animate-fade-in">
                    <button
                      onClick={(e) => handleDelete(e, session.session_id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
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
      </div>

      {/* ── DISTINCT HORIZONTAL DIVIDER (Exact Match to Sketch) ── */}
      <div className="border-t-2 border-[#27272e] w-full" />

      {/* ── BOTTOM SECTION (User Account, Telemetry, and Logout) ── */}
      <div className="p-3 bg-[#0a0a0c] flex-shrink-0">
        {currentUser ? (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#141418] border border-[#27272e]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0 font-bold text-xs">
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 truncate">
                  {currentUser.display_name || currentUser.username}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  @{currentUser.username}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-[#18181c] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#141418] border border-[#27272e] hover:border-rose-500/50 text-zinc-300 hover:text-rose-400 transition-all text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-rose-400" />
              <span>Sign In / Create Account</span>
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}
