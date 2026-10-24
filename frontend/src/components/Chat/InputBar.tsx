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
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
    <div className={`w-full flex flex-col items-center transition-all duration-300 ${isCentered ? "py-1" : "py-2"}`}>
      <div className="w-full max-w-xl">
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
          <div className="mb-2 p-2 bg-[#141418] border border-[#27272e] rounded-xl flex items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              {attachment.type === "image" ? (
                <img
                  src={attachment.preview}
                  alt="Attachment preview"
                  className="w-10 h-10 rounded-lg object-cover border border-[#27272e]"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-[#27272e] text-rose-400">
                  <Film className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-100 truncate">
                  {attachment.file.name}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {(attachment.file.size / (1024 * 1024)).toFixed(2)} MB · {attachment.type.toUpperCase()}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAttachment(null)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Rectangular Input Container (Compact & Clean) */}
        <div className="relative flex items-center gap-2 bg-[#121216] border border-[#27272e] rounded-xl px-3.5 py-2.5 shadow-sm transition-all duration-200 focus-within:border-rose-500/70 focus-within:ring-1 focus-within:ring-rose-500/30">
          {/* Plus / Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-[#1a1a20] transition-colors"
            title="Attach image or video"
            aria-label="Attach file"
          >
            <Plus className="w-4 h-4" />
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
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-xs md:text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50 max-h-[160px]"
          />

          {/* Voice Input / Mic button */}
          <button
            onClick={toggleListening}
            type="button"
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isListening
                ? "text-rose-400 bg-rose-950/60 ring-1 ring-rose-500/50 animate-pulse"
                : "text-zinc-400 hover:text-rose-400 hover:bg-[#1a1a20]"
            }`}
            title={isListening ? "Stop listening" : "Click to speak"}
            aria-label="Voice input"
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!text.trim() && !attachment)}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-coral-glow-sm"
            aria-label="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subtle Disclaimer */}
        {!isCentered && (
          <p className="text-center text-[10px] text-zinc-500 mt-1.5">
            Megan can make mistakes. Verify important code and data.
          </p>
        )}
      </div>
    </div>
  );
}
