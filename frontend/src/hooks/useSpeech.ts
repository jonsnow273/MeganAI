import { useState, useEffect, useCallback, useRef } from "react";
import { voiceService, FEMALE_VOICE, type VoiceOption } from "../services/voiceService";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voices] = useState<VoiceOption[]>([FEMALE_VOICE]);
  const selectedVoice = FEMALE_VOICE.id;

  const [autoSpeak, setAutoSpeakState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("megan_auto_speak") === "true";
    } catch {
      return false;
    }
  });

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const setAutoSpeak = useCallback((enabled: boolean) => {
    setAutoSpeakState(enabled);
    try {
      localStorage.setItem("megan_auto_speak", enabled ? "true" : "false");
    } catch {
      // Ignore
    }
  }, []);

  const stop = useCallback(() => {
    voiceService.stop();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (text: string, id?: string) => {
      if (!text.trim()) return;

      // If already speaking this message, toggle stop
      if (isSpeaking && id && speakingId === id) {
        stop();
        return;
      }

      setIsSpeaking(true);
      if (id) setSpeakingId(id);

      voiceService.speak(text, {
        onStart: () => {
          setIsSpeaking(true);
          if (id) setSpeakingId(id);
        },
        onEnded: () => {
          setIsSpeaking(false);
          setSpeakingId(null);
        },
        onError: () => {
          setIsSpeaking(false);
          setSpeakingId(null);
        },
      });
    },
    [isSpeaking, speakingId, stop]
  );

  const startListening = useCallback(
    (onResult: (text: string, isFinal: boolean) => void) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
        return;
      }

      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
      }

      try {
        const recog = new SpeechRecognition();
        recog.continuous = false; // Single utterance mode prevents overlapping recognition loops
        recog.interimResults = true;
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }
          if (final.trim()) {
            onResult(final.trim(), true);
          } else if (interim.trim()) {
            onResult(interim.trim(), false);
          }
        };

        recog.onerror = (e: any) => {
          console.warn("Speech recognition error:", e.error);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recog.start();
        recognitionRef.current = recog;
        setIsListening(true);
      } catch (err) {
        console.warn("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    },
    [isListening]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSpeaking,
    speakingId,
    voices,
    selectedVoice,
    setSelectedVoice: () => {},
    autoSpeak,
    setAutoSpeak,
    speak,
    stop,
    isListening,
    speechSupported,
    startListening,
    stopListening,
  };
}
