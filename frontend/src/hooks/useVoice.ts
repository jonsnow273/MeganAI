import { useState, useRef, useCallback } from "react";

const API = "http://localhost:8000";

export type VoiceState = "idle" | "recording" | "transcribing" | "error";

interface UseVoiceReturn {
  state: VoiceState;
  isAvailable: boolean;
  transcript: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

export function useVoice(onTranscript?: (text: string) => void): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support
  const isAvailable =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const startRecording = useCallback(async () => {
    if (!isAvailable) {
      setError("Microphone not supported in this browser.");
      setState("error");
      return;
    }

    setError(null);
    setTranscript(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick the best supported MIME type
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setState("idle");
          return;
        }

        setState("transcribing");

        const audioBlob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const res = await fetch(`${API}/api/voice/transcribe`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error(`Transcription failed: HTTP ${res.status}`);

          const data = await res.json();
          const text: string = data.transcript ?? data.text ?? "";

          if (text.trim()) {
            setTranscript(text.trim());
            onTranscript?.(text.trim());
          } else {
            setError("No speech detected. Try again.");
          }
          setState("idle");
        } catch (err: any) {
          setError(err.message ?? "Transcription error.");
          setState("error");
        }
      };

      recorder.onerror = () => {
        setError("Recording error.");
        setState("error");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // collect data every 250ms
      setState("recording");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Microphone permission denied.");
      } else {
        setError(err.message ?? "Could not access microphone.");
      }
      setState("error");
    }
  }, [isAvailable, onTranscript]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript(null);
    setError(null);
    setState("idle");
  }, []);

  return {
    state,
    isAvailable,
    transcript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
