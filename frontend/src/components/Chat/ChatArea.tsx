import { useRef, useEffect } from "react";
import { Sparkles, Terminal, Monitor, FileText, Zap } from "lucide-react";
import type { Message } from "../../types/chat";
import type { Attachment } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";

interface Props {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onSend: (message: string, attachment?: Attachment | null) => void;
  currentUser?: { username: string; display_name?: string } | null;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 mb-6 animate-fade-in">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex gap-1.5 items-center py-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

export function ChatArea({ messages, loading, error, onSend, currentUser }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.filter(
    (msg) => !(msg.role === "assistant" && msg.content === "")
  );

  const showTyping =
    loading && (messages.length === 0 || messages[messages.length - 1].content === "");

  const hasMessages = visibleMessages.length > 0 || loading;

  const displayName = currentUser?.display_name || currentUser?.username || "there";

  useEffect(() => {
    if (hasMessages) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, hasMessages]);

  const QUICK_PROMPTS = [
    { icon: Terminal, label: "Open VS Code", prompt: "can u please open vs code for me" },
    { icon: Monitor, label: "Analyze Screen", prompt: "Analyze what is visible on my screen and diagnose any issues." },
    { icon: FileText, label: "Daily Standup", prompt: "Synthesize today's standup report from my git commits and activity." },
    { icon: Zap, label: "Create desktop note", prompt: "create a notes.txt file on the desktop screen" },
  ];

  return (
    <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden bg-[#09090b]">
      {/* ── Empty State: Centered Exactly in the Middle ── */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 w-full transition-all duration-300 ease-out animate-fade-in -mt-6">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">
            {/* Logo */}
            <div className="w-12 h-12 mb-3 drop-shadow-md flex items-center justify-center">
              <img src="/megan-logo.png" alt="Megan" className="w-full h-full object-contain rounded-xl" />
            </div>

            {/* Smaller, Clean Typography */}
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100 mb-1.5">
              welcome back, <span className="text-rose-400 font-semibold">{displayName}</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 font-normal mb-5 max-w-md">
              What would you like to explore or automate today?
            </p>

            {/* Centered Rectangle Input Bar */}
            <div className="w-full">
              <InputBar
                onSend={onSend}
                disabled={loading}
                placeholder="type here!"
                isCentered={true}
              />
            </div>

            {/* Quick Prompt Suggestion Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
              {QUICK_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSend(item.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141418] hover:bg-[#1a1a20] border border-[#27272e] hover:border-rose-500/40 text-xs font-medium text-zinc-300 hover:text-white shadow-sm transition-all"
                  >
                    <Icon className="w-3.5 h-3.5 text-rose-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Active Conversation View: Message Feed with Docked Input ── */
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-300 ease-in-out">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-2xl mx-auto">
              {visibleMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {showTyping && <TypingIndicator />}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="max-w-2xl mx-auto w-full px-4 mb-2">
              <div className="px-3.5 py-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs shadow-sm">
                {error}
              </div>
            </div>
          )}

          {/* Docked Bottom Input Bar */}
          <div className="w-full px-4 pb-3 flex-shrink-0">
            <InputBar
              onSend={onSend}
              disabled={loading}
              placeholder="type here!"
              isCentered={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
