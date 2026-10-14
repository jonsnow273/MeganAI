import { useState, useCallback, useEffect } from "react";
import { useChat } from "./hooks/useChat";
import { Header } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import { ChatWindow } from "./components/Chat/ChatWindow";
import { InputBar } from "./components/Chat/InputBar";
import { SteeringPanel } from "./components/Steering/SteeringPanel";
import { VisualTimeMachine } from "./components/Memory/VisualTimeMachine";
import { StandupModal } from "./components/Standup/StandupModal";

const API = "http://localhost:8000";

export default function App() {
  const { messages, loading, error, sessionId, sendMessage, clearChat } = useChat();

  // Layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTimeMachineOpen, setIsTimeMachineOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Ping backend connectivity
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
        if (!cancelled) setIsConnected(res.ok);
      } catch {
        if (!cancelled) setIsConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Load a past session — fetch its messages and set as current
  const handleSelectSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`${API}/api/chat/sessions/${sid}/messages`);
      if (res.ok) {
        // Session history loading — wired when useChat exposes a loadSession method
        await res.json();
      }
    } catch {
      // graceful — session loading is best-effort
    }
  }, []);

  const handleNewChat = useCallback(() => {
    clearChat();
  }, [clearChat]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950 text-zinc-100">

      {/* ── Left Sidebar ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        currentSessionId={sessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />

      {/* ── Main content column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <Header
          sessionId={sessionId}
          onClear={clearChat}
          onOpenTimeMachine={() => setIsTimeMachineOpen(true)}
          onOpenStandup={() => setIsStandupOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          isConnected={isConnected}
        />

        {/* Body: chat + right panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Chat column */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <ChatWindow messages={messages} loading={loading} />

            {/* API error banner */}
            {error && (
              <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <span className="text-red-600 hidden sm:inline">
                  Is uvicorn running on port 8000?
                </span>
              </div>
            )}

            <InputBar onSend={sendMessage} disabled={loading} />
          </div>

          {/* Right steering panel — hidden on mobile */}
          <aside className="hidden lg:flex flex-col w-80 xl:w-88 border-l border-surface-700 bg-surface-900/40 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              <SteeringPanel />

              {/* Quick guide */}
              <div className="rounded-xl border border-surface-700/60 bg-surface-800/30 p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                  Quick Guide
                </p>
                {[
                  ["Neutral",   "No steering — baseline model behavior"],
                  ["Cautious",  "Safety-first, surfaces risk before acting"],
                  ["Concise",   "Tighter responses, no filler"],
                  ["Detailed",  "Thorough, expanded explanations"],
                  ["Creative",  "Broader associations, richer metaphors"],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-2.5">
                    <span className="text-[11px] font-semibold text-zinc-400 w-16 flex-shrink-0">{label}</span>
                    <span className="text-[11px] text-zinc-600 leading-snug">{desc}</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-surface-700/40">
                  <p className="text-[11px] text-zinc-700 leading-relaxed">
                    Behavior is steered via residual stream injection at a target transformer layer —
                    not prompt engineering. Use <span className="text-megan-600">Compare Outputs</span> to
                    see the difference side-by-side.
                  </p>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* Visual Time Machine modal */}
      <VisualTimeMachine
        isOpen={isTimeMachineOpen}
        onClose={() => setIsTimeMachineOpen(false)}
      />

      {/* Daily Standup Report modal */}
      <StandupModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
      />
    </div>
  );
}
