import { useRef, useEffect } from "react";
import type { Message } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  loading: boolean;
}

function TypingIndicator() {
  return (
    <div className="mb-6">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-dark-subtle animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-dark-subtle animate-pulse" style={{ animationDelay: "0.2s" }} />
        <span className="w-2 h-2 rounded-full bg-dark-subtle animate-pulse" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

export function ChatWindow({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hide the empty assistant placeholder while the first token is in flight.
  const visibleMessages = messages.filter(
    (msg) => !(msg.role === "assistant" && msg.content === "")
  );
  const showTyping =
    loading && (messages.length === 0 || messages[messages.length - 1].content === "");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-chat mx-auto px-4 py-8">
        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center fade-in">
            <h2 className="text-xl text-dark-text mb-2">
              How can I help you today?
            </h2>
            <p className="text-sm text-dark-muted max-w-md">
              I'm Megan, your intelligent desktop AI assistant. Powered by a high-throughput cloud gateway with full desktop automation.
            </p>
          </div>
        )}

        {/* Messages */}
        {visibleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {showTyping && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
