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

type View = "chat" | "copilot" | "timemachine" | "standup" | "macros";

const API = "http://localhost:8000";

function generateTitle(firstMessage: string): string {
  if (!firstMessage || firstMessage.trim().length === 0) return "New conversation";
  const cleaned = firstMessage.trim().slice(0, 60);
  return cleaned.length < firstMessage.trim().length ? `${cleaned}...` : cleaned;
}

export default function App() {
  const { messages, loading, error, sessionId, sendMessage, clearChat } = useChat();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<View>("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Select session — load messages for that session (placeholder, needs backend support)
  const handleSelectSession = useCallback(async (sid: string) => {
    setCurrentView("chat");
    setMobileMenuOpen(false);
    try {
      const res = await fetch(`${API}/api/chat/sessions/${sid}/messages`);
      if (res.ok) {
        // Load session messages — requires useChat to expose a loadSession method
        await res.json();
      }
    } catch {
      // silent
    }
  }, []);

  // Navigate to feature view
  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  }, []);

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

        {/* View Router */}
        {currentView === "chat" && (
          <>
            <ChatWindow messages={messages} loading={loading} />
            {error && (
              <div className="mx-4 mb-2 px-4 py-2 rounded-lg bg-dark-surface border border-dark-border text-dark-muted text-xs">
                {error}
              </div>
            )}
            <InputBar onSend={sendMessage} disabled={loading} />
          </>
        )}

        {currentView === "copilot" && <ScreenCopilotView />}
        {currentView === "timemachine" && <TimeMachineView />}
        {currentView === "standup" && <StandupView />}
        {currentView === "macros" && <MacrosView />}
      </div>
    </div>
  );
}
