import { useRef, useEffect } from "react";
import { Sparkles, Zap, Shield, Scissors, BookOpen } from "lucide-react";
import type { Message } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface Props {
  messages: Message[];
  loading: boolean;
}

const SUGGESTIONS = [
  { icon: <Zap className="w-4 h-4" />, text: "Explain activation steering in simple terms" },
  { icon: <Shield className="w-4 h-4" />, text: "What are my safe automation options?" },
  { icon: <Scissors className="w-4 h-4" />, text: "Summarize this in 3 bullet points" },
  { icon: <BookOpen className="w-4 h-4" />, text: "Give me a detailed explanation of transformers" },
];

export function ChatWindow({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">

        {/* Empty / welcome state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
            {/* Logo glow */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl megan-gradient opacity-20 blur-2xl scale-150" />
              <div className="relative w-16 h-16 rounded-3xl megan-gradient flex items-center justify-center shadow-glow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold megan-gradient-text mb-2">
              Good day, I'm Megan
            </h2>
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
              The first local AI assistant with controllable internal behavior.
              I run entirely on your machine — no data leaves.
            </p>

            {/* Suggestion chips */}
            <div className="grid grid-cols-2 gap-2 mt-8 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <div
                  key={i}
                  className="
                    group flex items-center gap-2.5 px-3.5 py-3 rounded-xl
                    bg-surface-800 hover:bg-surface-700
                    border border-surface-700 hover:border-megan-700/50
                    text-zinc-400 hover:text-zinc-200
                    cursor-default transition-all duration-200
                    text-left
                  "
                >
                  <span className="flex-shrink-0 text-megan-600 group-hover:text-megan-400 transition-colors">
                    {s.icon}
                  </span>
                  <span className="text-xs leading-snug">{s.text}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-zinc-700 mt-8">
              Type a message below or use the mic for voice input
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
