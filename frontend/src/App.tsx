import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useChat } from "./hooks/useChat";
import { Header } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import { ChatWindow } from "./components/Chat/ChatWindow";
import { InputBar } from "./components/Chat/InputBar";
import { ScreenCopilotView } from "./components/Features/ScreenCopilotView";
import { TimeMachineView } from "./components/Features/TimeMachineView";
import { StandupView } from "./components/Features/StandupView";
import { MacrosView } from "./components/Features/MacrosView";
import { AuthModal } from "./components/Auth/AuthModal";

type View = "chat" | "copilot" | "timemachine" | "standup" | "macros";

const API = "http://localhost:8000";

function generateTitle(firstMessage: string): string {
  if (!firstMessage || firstMessage.trim().length === 0) return "New conversation";
  const cleaned = firstMessage.trim().slice(0, 60);
  return cleaned.length < firstMessage.trim().length ? `${cleaned}...` : cleaned;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("megan_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export default function App() {
  const { messages, loading, error, sessionId, sendMessage, clearChat, loadSession } = useChat();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<View>("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; display_name?: string } | null>(() => {
    try {
      const saved = localStorage.getItem("megan_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Derive conversation title from first user message
  const conversationTitle = messages.length > 0 && messages[0].role === "user"
    ? generateTitle(messages[0].content)
    : undefined;

  // New Chat handler — creates fresh session and returns to chat view
  const handleNewChat = useCallback(() => {
    clearChat();
    setCurrentView("chat");
    setMobileMenuOpen(false);
  }, [clearChat]);

  // Select session — loads message history into active chat view
  const handleSelectSession = useCallback(async (sid: string) => {
    setCurrentView("chat");
    setMobileMenuOpen(false);
    try {
      const res = await fetch(`${API}/api/chat/history/${sid}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          loadSession(sid, data.messages);
        }
      }
    } catch (err) {
      console.warn("Failed to load session:", err);
    }
  }, [loadSession]);

  // Navigate to feature view
  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("megan_token");
    localStorage.removeItem("megan_user");
    setCurrentUser(null);
    clearChat();
  }, [clearChat]);

  // Close mobile menu when clicking overlay
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg text-dark-text">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          currentSessionId={sessionId}
          currentView={currentView}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-dark-surface z-50 md:hidden">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              currentSessionId={sessionId}
              currentView={currentView}
              onNewChat={handleNewChat}
              onSelectSession={handleSelectSession}
              onNavigate={handleNavigate}
              currentUser={currentUser}
              onOpenAuth={() => setAuthModalOpen(true)}
              onLogout={handleLogout}
            />
          </div>
        </>
      )}

      {/* Main Column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => {
            if (window.innerWidth < 768) {
              setMobileMenuOpen((v) => !v);
            } else {
              setSidebarCollapsed((v) => !v);
            }
          }}
          title={currentView === "chat" ? conversationTitle : undefined}
        />

        {/* Persistent Chat View: preserved when switching tabs */}
        <div className={currentView === "chat" ? "flex flex-col flex-1 min-h-0 overflow-hidden" : "hidden"}>
          <ChatWindow messages={messages} loading={loading} />
          {error && (
            <div className="mx-4 mb-2 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-red-400 text-xs">
              {error}
            </div>
          )}
          <InputBar onSend={sendMessage} disabled={loading} />
        </div>

        {/* Feature Views */}
        {currentView === "copilot" && <ScreenCopilotView />}
        {currentView === "timemachine" && <TimeMachineView />}
        {currentView === "standup" && <StandupView />}
        {currentView === "macros" && <MacrosView />}
      </div>

      {/* User Account / Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          handleNewChat();
        }}
      />
    </div>
  );
}
