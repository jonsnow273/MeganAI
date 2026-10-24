import { useState, useRef, useEffect } from "react";
import { Plus, Mic, MicOff, Send, X, Film } from "lucide-react";
import type { Attachment } from "../../hooks/useChat";

interface Props {
  onSend: (message: string, attachment?: Attachment | null) => void;
  disabled: boolean;
  placeholder?: string;
  isCentered?: boolean;
}

export function InputBar({ onSend, disabled, placeholder = "type here!", isCentered = false }: Props) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";

      recog.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setText((prev) => {
              const cleaned = prev.trim();
              const newWord = event.results[i][0].transcript.trim();
              return cleaned ? `${cleaned} ${newWord}` : newWord;
            });
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recog.onerror = (e: any) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  // Focus on enable
  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or a Chromium browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      alert("Please select an image or video file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachment({
        file,
        preview: result,
        type: isVideo ? "video" : "image",
        base64: result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || disabled) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    onSend(trimmed, attachment);
    setText("");
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`w-full flex flex-col items-center transition-all duration-500 ${isCentered ? "py-2" : "py-3"}`}>
      <div className="w-full max-w-3xl">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/*"
          className="hidden"
        />

        {/* Media Preview Card */}
        {attachment && (
          <div className="mb-2 p-2.5 bg-[#141418] border border-[#27272e] rounded-2xl flex items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              {attachment.type === "image" ? (
                <img
                  src={attachment.preview}
                  alt="Attachment preview"
                  className="w-12 h-12 rounded-xl object-cover border border-[#27272e]"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-[#27272e] text-rose-400">
                  <Film className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-100 truncate">
                  {attachment.file.name}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {(attachment.file.size / (1024 * 1024)).toFixed(2)} MB · {attachment.type.toUpperCase()}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAttachment(null)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Carbon Pill Container */}
        <div className={`relative flex items-end gap-2 bg-[#121216] border border-[#27272e] rounded-3xl px-4 shadow-carbon-card transition-all duration-300 focus-within:border-rose-500/70 focus-within:ring-2 focus-within:ring-rose-500/15 ${
          isCentered ? "py-4 text-base" : "py-3"
        }`}>
          {/* Plus / Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-[#1a1a20] transition-colors"
            title="Attach image or video"
            aria-label="Attach file"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening... speak now"
                : attachment
                ? "Ask a question about this media..."
                : placeholder
            }
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50 max-h-[180px] self-center"
          />

          {/* Voice Input / Mic button */}
          <button
            onClick={toggleListening}
            type="button"
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isListening
                ? "text-rose-400 bg-rose-950/60 ring-2 ring-rose-500/50 animate-pulse"
                : "text-zinc-400 hover:text-rose-400 hover:bg-[#1a1a20]"
            }`}
            title={isListening ? "Stop listening" : "Click to speak"}
            aria-label="Voice input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !attachment)}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-coral-glow-sm"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Disclaimer */}
        {!isCentered && (
          <p className="text-center text-[11px] text-zinc-500 mt-2">
            Megan can make mistakes. Verify important code and data.
          </p>
        )}
      </div>
    </div>
  );
}
