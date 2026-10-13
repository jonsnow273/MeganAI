import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Loader2, AlertCircle, X } from "lucide-react";
import { useVoice } from "../../hooks/useVoice";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Wire voice → auto-fill textarea
  const handleTranscript = useCallback((t: string) => {
    setText((prev) => (prev.trim() ? `${prev} ${t}` : t));
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const { state: voiceState, isAvailable, error: voiceError, startRecording, stopRecording, clearTranscript } =
    useVoice(handleTranscript);

  const isRecording    = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";
  const hasVoiceError  = voiceState === "error";

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
    // reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (isTranscribing) {
      // wait — do nothing
    } else {
      clearTranscript();
      startRecording();
    }
  };

  return (
    <div className="border-t border-surface-700 bg-surface-900/80 backdrop-blur-sm px-4 pt-3 pb-4">
      {/* Voice error / transcribing banner */}
      {(hasVoiceError || isTranscribing) && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs max-w-3xl mx-auto transition-all
            ${hasVoiceError
              ? "bg-red-950/40 border border-red-800/50 text-red-300"
              : "bg-megan-900/40 border border-megan-700/40 text-megan-300"
            }`}
        >
          {isTranscribing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>Transcribing with Whisper…</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{voiceError}</span>
              <button onClick={clearTranscript} className="hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        {/* Textarea wrapper */}
        <div
          className={`
            relative flex-1 rounded-2xl border transition-all duration-200
            bg-surface-800
            ${isRecording
              ? "border-red-500/70 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
              : "border-surface-600 focus-within:border-megan-500/70 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
            }
          `}
        >
          {/* Recording pulse overlay */}
          {isRecording && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
              <div className="absolute top-2 right-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 recording-pulse" />
                <span className="text-[11px] text-red-400 font-medium">Recording…</span>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? "Listening… press mic to stop"
                : isTranscribing
                ? "Transcribing…"
                : disabled
                ? "Megan is thinking…"
                : "Message Megan… (Enter to send, Shift+Enter for newline)"
            }
            disabled={disabled || isTranscribing}
            rows={1}
            className={`
              w-full bg-transparent text-zinc-100 placeholder-zinc-600
              px-4 py-3 pr-12 resize-none text-sm leading-relaxed
              transition-colors duration-150
              ${(disabled || isTranscribing) ? "opacity-50 cursor-not-allowed" : ""}
            `}
            style={{ maxHeight: "160px" }}
          />

          {/* Inline send button (inside textarea wrapper) */}
          <button
            onClick={handleSend}
            disabled={disabled || !text.trim() || isTranscribing}
            aria-label="Send message"
            className={`
              absolute right-2.5 bottom-2.5 p-1.5 rounded-xl transition-all duration-200
              ${text.trim() && !disabled && !isTranscribing
                ? "bg-gradient-megan text-white shadow-glow-sm hover:shadow-glow opacity-100 scale-100"
                : "bg-surface-700 text-zinc-600 opacity-50 scale-95 cursor-not-allowed"
              }
            `}
          >
            {disabled
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>

        {/* Mic button */}
        {isAvailable && (
          <button
            onClick={handleMicClick}
            disabled={isTranscribing || disabled}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
            title={isRecording ? "Stop recording" : "Voice input (Whisper)"}
            className={`
              flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center
              transition-all duration-200 border
              ${isRecording
                ? "bg-red-600 hover:bg-red-500 border-red-500 text-white recording-pulse shadow-[0_0_16px_rgba(239,68,68,0.5)]"
                : isTranscribing
                ? "bg-surface-700 border-surface-600 text-megan-400 cursor-wait"
                : "bg-surface-800 hover:bg-surface-700 border-surface-600 hover:border-megan-500/50 text-zinc-400 hover:text-megan-400"
              }
            `}
          >
            {isTranscribing
              ? <Loader2 className="w-4.5 h-4.5 animate-spin" />
              : isRecording
              ? <MicOff className="w-4.5 h-4.5" />
              : <Mic className="w-4.5 h-4.5" />
            }
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-[10px] text-zinc-700 mt-2 max-w-3xl mx-auto">
        Enter to send · Shift+Enter for new line{isAvailable ? " · Mic for voice" : ""}
      </p>
    </div>
  );
}
