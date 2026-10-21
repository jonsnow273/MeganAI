import { useState, useRef, useEffect } from "react";
import { Plus, Mic, Send } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  // Focus on enable
  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-4 bg-dark-bg">
      {/* Centered pill input */}
      <div className="w-full max-w-3xl">
        <div className="relative flex items-end gap-2 bg-dark-surface border border-dark-border rounded-3xl px-3 py-2.5 focus-within:border-dark-subtle transition-colors">
          {/* Plus button */}
          <button
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
            aria-label="Attach"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Megan"
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-dark-text placeholder-dark-muted text-sm resize-none focus:outline-none disabled:opacity-50 max-h-[200px]"
          />

          {/* Mic button */}
          <button
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
            aria-label="Voice input"
          >
            <Mic className="w-4.5 h-4.5" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-dark-subtle mt-2">
          Megan can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
