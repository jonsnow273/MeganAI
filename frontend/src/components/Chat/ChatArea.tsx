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
      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="p-3.5 rounded-2xl bg-[#141418] border border-[#27272e] shadow-sm flex gap-1.5 items-center">
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
      {/* ── Empty State: Centered Greeting & Input (Gemini/Linear Style) ── */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full transition-all duration-500 ease-out animate-fade-in">
          {/* Welcome Headline Matching User Drawing */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 drop-shadow-lg flex items-center justify-center">
              <img src="/megan-logo.png" alt="Megan" className="w-full h-full object-contain rounded-2xl" />
            </div>
            <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-zinc-100 italic mb-3">
              welcome back! <span className="bg-gradient-to-r from-rose-400 via-rose-500 to-amber-300 bg-clip-text text-transparent font-semibold not-italic">{displayName}</span>
            </h1>
            <p className="text-sm md:text-base text-zinc-400 font-normal max-w-lg mx-auto">
              How can I assist you with code, screen analysis, or desktop tasks today?
            </p>
          </div>

          {/* Centered Input Bar */}
          <div className="w-full">
            <InputBar
              onSend={onSend}
              disabled={loading}
              placeholder="type here!"
              isCentered={true}
            />
          </div>

          {/* Quick Prompt Suggestion Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full max-w-2xl">
            {QUICK_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSend(item.prompt)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#141418] hover:bg-[#1a1a20] border border-[#27272e] hover:border-rose-500/40 text-xs font-medium text-zinc-300 hover:text-white shadow-sm transition-all"
                >
                  <Icon className="w-3.5 h-3.5 text-rose-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Active Conversation View: Message Feed with Docked Input ── */
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-500 ease-in-out">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-chat mx-auto">
              {visibleMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {showTyping && <TypingIndicator />}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="max-w-chat mx-auto w-full px-4 mb-2">
              <div className="px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs shadow-sm">
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
