import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, Square, Sparkles, Radio } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string | undefined>;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStopSpeech: () => void;
}

type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

const PRESENTATION_TAKEOVER_SPEECH =
  "Hello everyone, Respected Professor Saste, and fellow engineers! I am Megan, your " +
  "next-generation privacy-first intelligent desktop AI assistant, built by Pranit and Hemant. " +
  "Unlike standard web chatbots that run entirely on external servers and track your telemetry, " +
  "I am engineered with a modern hybrid architecture. My system features local quantized neural " +
  "intelligence, real-time multimodal screen perception, and direct operating system automation. " +
  "Whether it is hands-free workflow execution, automated file organization, or deep contextual " +
  "understanding across your daily desktop workspace, I work right beside you with maximum privacy " +
  "and zero latency. Now, I will hand the stage back to Pranit and Hemant to walk you through our " +
  "technical architecture and core implementation details. Thank you, and over to you, guys!";

export function VoiceModeModal({
  isOpen,
  onClose,
  onSendMessage,
  isSpeaking,
  onSpeak,
  onStopSpeech,
}: Props) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [lastMeganReply, setLastMeganReply] = useState("");

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  // Single-flight processing mutex to guarantee NO duplicate voices or parallel triggers
  const isProcessingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const currentTranscriptRef = useRef("");

  // Sync internal status with isSpeaking
  useEffect(() => {
    if (isSpeaking) {
      setStatus("speaking");
    } else if (status === "speaking") {
      setStatus("idle");
      isProcessingRef.current = false;

      // Echo prevention: wait 400ms after speech ends before auto-listening again
      if (isOpen) {
        const restartTimer = setTimeout(() => {
          if (isOpen && !isSpeakingRef.current && !isProcessingRef.current) {
            startListening();
          }
        }, 400);
        return () => clearTimeout(restartTimer);
      }
    }
  }, [isSpeaking, status, isOpen]);

  // Start speech recognition when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      onStopSpeech();
      setStatus("idle");
      setTranscript("");
      isProcessingRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }

    startListening();

    return () => {
      stopListening();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isOpen]);

  const startListening = () => {
    if (isSpeakingRef.current || isProcessingRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition unavailable in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }

    try {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";

      recog.onresult = (event: any) => {
        if (isProcessingRef.current || isSpeakingRef.current) return;

        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        const candidate = (final || interim).trim();
        if (candidate) {
          setTranscript(candidate);
          currentTranscriptRef.current = candidate;

          // Clear previous silence detector
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

          // If final arrived, commit immediately; if interim, auto-commit after 650ms of silence
          if (final.trim()) {
            commitSpeech(final.trim());
          } else {
            silenceTimerRef.current = setTimeout(() => {
              if (currentTranscriptRef.current.trim() && !isProcessingRef.current) {
                commitSpeech(currentTranscriptRef.current.trim());
              }
            }, 650);
          }
        }
      };

      recog.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition error:", e.error);
          setStatus("idle");
        }
      };

      recog.onend = () => {
        // Auto-restart listening only if idle and open
        if (isOpen && !isSpeakingRef.current && !isProcessingRef.current && status === "listening") {
          try {
            recog.start();
          } catch {
            // Ignore restart errors
          }
        }
      };

      recog.start();
      recognitionRef.current = recog;
      setStatus("listening");
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setStatus("idle");
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
  };

  const commitSpeech = (cleanText: string) => {
    if (isProcessingRef.current || !cleanText.trim()) return;
    isProcessingRef.current = true;
    stopListening();
    handleFinalSpeech(cleanText);
  };

  const handleFinalSpeech = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed) {
      isProcessingRef.current = false;
      startListening();
      return;
    }

    setStatus("thinking");
    setLastUserMessage(trimmed);
    setTranscript("");

    // Instant presentation takeover response: bypass LLM round-trip delay entirely
    const lower = trimmed.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (lower.includes("take over") || lower.includes("takeover")) {
      setLastMeganReply(PRESENTATION_TAKEOVER_SPEECH);
      setStatus("speaking");
      onSpeak(PRESENTATION_TAKEOVER_SPEECH);
      // Background sync with session history
      onSendMessage(trimmed).catch(() => {});
      return;
    }

    try {
      const reply = await onSendMessage(trimmed);
      if (reply && reply.trim()) {
        setLastMeganReply(reply);
        setStatus("speaking");
        onSpeak(reply);
      } else {
        setStatus("idle");
        isProcessingRef.current = false;
        startListening();
      }
    } catch (err) {
      console.error("Message send error in Voice Mode:", err);
      setStatus("idle");
      isProcessingRef.current = false;
      startListening();
    }
  };

  const toggleMic = () => {
    if (status === "speaking") {
      onStopSpeech();
      isProcessingRef.current = false;
      startListening();
    } else if (status === "listening") {
      stopListening();
      setStatus("idle");
    } else {
      isProcessingRef.current = false;
      startListening();
    }
  };

  const handleTriggerTakeOver = () => {
    if (isProcessingRef.current) return;
    stopListening();
    onStopSpeech();
    isProcessingRef.current = true;
    handleFinalSpeech("hey megan, take over");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#09090b]/95 backdrop-blur-xl text-zinc-100 p-6 md:p-8 animate-fade-in select-none">
        {/* Ambient Radial Background Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="w-[500px] h-[500px] rounded-full bg-rose-500/10 blur-[120px] transform scale-110" />
          <div className="w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-[90px] transform -translate-y-10" />
        </div>

        {/* ── Top Bar ── */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-4xl mx-auto">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#141418] border border-[#27272e] flex items-center justify-center p-1.5 shadow-sm">
              <img src="/megan-logo.png" alt="Megan" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white">Megan Voice</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Single Female Neural Voice</p>
            </div>
          </div>

          {/* Right Controls: Single Voice Badge & Close Button */}
          <div className="flex items-center gap-3">
            {/* Single Voice Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141418] border border-[#27272e] text-xs text-zinc-300">
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-medium">Jenny (Female)</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#141418] border border-[#27272e] hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Exit Voice Mode"
              title="Close Voice Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Center Stage: Pulsing Animated Sound Orb ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full my-auto text-center px-4">
          {/* Visualizer Container */}
          <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center mb-8">
            {/* Concentric Outer Ring 3 */}
            <motion.div
              animate={{
                scale: status === "speaking" ? [1, 1.45, 1.1, 1.5, 1] : status === "listening" ? [1, 1.25, 1] : [1, 1.08, 1],
                opacity: status === "speaking" ? [0.35, 0.7, 0.4] : status === "listening" ? [0.2, 0.5, 0.2] : [0.1, 0.25, 0.1],
              }}
              transition={{
                duration: status === "speaking" ? 1.6 : status === "listening" ? 2.2 : 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 rounded-full border border-rose-500/30 bg-rose-500/5 shadow-[0_0_50px_rgba(244,63,94,0.15)]"
            />

            {/* Concentric Outer Ring 2 */}
            <motion.div
              animate={{
                scale: status === "speaking" ? [1, 1.3, 1.05, 1.35, 1] : status === "listening" ? [1, 1.15, 1] : [1, 1.05, 1],
                opacity: status === "speaking" ? [0.4, 0.8, 0.5] : status === "listening" ? [0.3, 0.6, 0.3] : [0.2, 0.35, 0.2],
              }}
              transition={{
                duration: status === "speaking" ? 1.3 : status === "listening" ? 1.8 : 3.0,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
              className="absolute inset-4 rounded-full border border-rose-500/40 bg-gradient-to-tr from-rose-500/10 to-amber-500/5"
            />

            {/* Concentric Ring 1 */}
            <motion.div
              animate={{
                scale: status === "speaking" ? [1, 1.18, 1] : status === "listening" ? [1, 1.1, 1] : [1, 1.03, 1],
                rotate: status === "thinking" ? 360 : 0,
              }}
              transition={{
                scale: {
                  duration: status === "speaking" ? 1.1 : 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                },
              }}
              className="absolute inset-10 rounded-full border border-rose-400/50 bg-gradient-to-tr from-rose-500/20 to-amber-500/10 backdrop-blur-sm"
            />

            {/* Central Glowing Neural Core */}
            <motion.div
              animate={{
                scale: status === "speaking" ? [1, 1.08, 0.96, 1.06, 1] : [1, 1.03, 1],
                boxShadow:
                  status === "speaking"
                    ? [
                        "0 0 30px rgba(244, 63, 94, 0.6)",
                        "0 0 60px rgba(244, 63, 94, 0.9)",
                        "0 0 30px rgba(244, 63, 94, 0.6)",
                      ]
                    : [
                        "0 0 20px rgba(244, 63, 94, 0.3)",
                        "0 0 35px rgba(244, 63, 94, 0.5)",
                        "0 0 20px rgba(244, 63, 94, 0.3)",
                      ],
              }}
              transition={{
                duration: status === "speaking" ? 1.0 : 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl cursor-pointer"
              onClick={toggleMic}
            >
              {status === "thinking" ? (
                <Sparkles className="w-9 h-9 animate-spin text-white" />
              ) : status === "speaking" ? (
                <div className="flex items-center gap-1 h-7">
                  <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                  <span className="w-1.5 h-9 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="w-1.5 h-7 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                  <span className="w-1.5 h-5 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                </div>
              ) : status === "listening" ? (
                <Mic className="w-9 h-9 text-white animate-pulse" />
              ) : (
                <MicOff className="w-9 h-9 text-white/80" />
              )}
            </motion.div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141418] border border-[#27272e] text-xs font-medium text-zinc-200 mb-4 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "speaking"
                  ? "bg-rose-500 animate-ping"
                  : status === "listening"
                  ? "bg-emerald-400 animate-pulse"
                  : status === "thinking"
                  ? "bg-amber-400 animate-spin"
                  : "bg-zinc-500"
              }`}
            />
            <span>
              {status === "speaking"
                ? "Megan is speaking..."
                : status === "thinking"
                ? "Thinking..."
                : status === "listening"
                ? "Listening... speak now"
                : "Microphone paused · Tap to talk"}
            </span>
          </div>

          {/* Real-time Subtitles / Transcription Feed */}
          <div className="w-full min-h-[90px] flex flex-col items-center justify-center">
            {transcript ? (
              <p className="text-sm md:text-base text-zinc-100 font-medium italic max-w-lg leading-relaxed animate-fade-in">
                "{transcript}"
              </p>
            ) : lastMeganReply && status === "speaking" ? (
              <p className="text-xs md:text-sm text-zinc-300 max-w-lg leading-relaxed line-clamp-3">
                {lastMeganReply}
              </p>
            ) : lastUserMessage ? (
              <p className="text-xs text-zinc-400 max-w-lg truncate">
                Last: "{lastUserMessage}"
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Say "Hey Megan, take over" or ask any question naturally.
              </p>
            )}
          </div>

          {/* Presentation Showstopper Preset Trigger */}
          <div className="mt-4">
            <button
              onClick={handleTriggerTakeOver}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-white transition-all shadow-sm"
              title="Click to trigger Megan's presentation intro speech"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Trigger: "Hey Megan, take over"</span>
            </button>
          </div>
        </div>

        {/* ── Bottom Control Bar ── */}
        <div className="relative z-10 flex items-center justify-center gap-4 w-full max-w-md mx-auto pt-4 border-t border-[#27272e]/60">
          {/* Mic Toggle Button */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              status === "listening"
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-coral-glow"
                : "bg-[#141418] hover:bg-[#1c1c22] border border-[#27272e] text-zinc-300"
            }`}
            title={status === "listening" ? "Mute microphone" : "Unmute microphone"}
          >
            {status === "listening" ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Interrupt / Stop Button */}
          {status === "speaking" && (
            <button
              onClick={() => {
                onStopSpeech();
                isProcessingRef.current = false;
                startListening();
              }}
              className="px-4 h-12 rounded-2xl bg-[#141418] hover:bg-[#1c1c22] border border-[#27272e] text-zinc-200 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors"
              title="Stop speaking"
            >
              <Square className="w-4 h-4 text-rose-400" />
              <span>Interrupt</span>
            </button>
          )}

          {/* Return to Chat Button */}
          <button
            onClick={onClose}
            className="px-5 h-12 rounded-2xl bg-[#141418] hover:bg-[#1c1c22] border border-[#27272e] text-zinc-300 hover:text-white text-xs font-medium transition-colors"
          >
            Switch to Chat
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
