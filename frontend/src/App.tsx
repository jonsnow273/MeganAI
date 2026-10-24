import { useState, useCallback, useEffect } from "react";
import { X, PanelLeftOpen } from "lucide-react";
import { useChat } from "./hooks/useChat";
import { Sidebar } from "./components/Layout/Sidebar";
import { ChatArea } from "./components/Chat/ChatArea";
import { ScreenCopilotView } from "./components/Features/ScreenCopilotView";
import { TimeMachineView } from "./components/Features/TimeMachineView";
import { StandupView } from "./components/Features/StandupView";
import { MacrosView } from "./components/Features/MacrosView";
import { AuthModal } from "./components/Auth/AuthModal";

type View = "chat" | "copilot" | "timemachine" | "standup" | "macros";

const API = "http://localhost:8000";

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

  // New Chat handler
  const handleNewChat = useCallback(() => {
    clearChat();
    setCurrentView("chat");
    setMobileMenuOpen(false);
  }, [clearChat]);

  // Select session
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
    <div className="flex h-screen overflow-hidden bg-[#09090b] text-[#f4f4f6]">
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#0d0d10] z-50 md:hidden shadow-2xl border-r border-[#27272e]">
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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

      {/* Main Canvas Area (No top header bar) */}
      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden bg-[#09090b]">
        {/* Mobile floating toggle */}
        <div className="md:hidden absolute top-3 left-3 z-20">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#141418] border border-[#27272e] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>

        {/* Persistent Chat Area: Preserved when switching tabs */}
        <div className={currentView === "chat" ? "flex flex-col flex-1 min-h-0 overflow-hidden" : "hidden"}>
          <ChatArea
            messages={messages}
            loading={loading}
            error={error}
            onSend={sendMessage}
            currentUser={currentUser}
          />
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
