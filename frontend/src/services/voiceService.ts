/**
 * Megan Voice Service.
 * Bridges frontend audio playback to the Edge-TTS backend streaming endpoint,
 * with graceful browser SpeechSynthesis fallback.
 */

const API = "http://localhost:8000";

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  locale: string;
  description: string;
}

class VoiceService {
  private currentAudio: HTMLAudioElement | null = null;
  private isAudioPlaying = false;
  private voicesCache: VoiceOption[] = [];

  /**
   * Fetch available neural voices from Megan backend.
   */
  async getVoices(): Promise<VoiceOption[]> {
    if (this.voicesCache.length > 0) {
      return this.voicesCache;
    }

    try {
      const res = await fetch(`${API}/api/voice/voices`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.voices)) {
          this.voicesCache = data.voices;
          return data.voices;
        }
      }
    } catch (err) {
      console.warn("Could not load backend voices list:", err);
    }

    // Default fallback voice list
    const defaults: VoiceOption[] = [
      {
        id: "en-US-JennyNeural",
        name: "Jenny (US Natural)",
        gender: "Female",
        locale: "en-US",
        description: "Warm, crystal-clear, default assistant voice",
      },
      {
        id: "en-US-AriaNeural",
        name: "Aria (US Expressive)",
        gender: "Female",
        locale: "en-US",
        description: "Expressive, dynamic conversational tone",
      },
      {
        id: "en-US-GuyNeural",
        name: "Guy (US Confident)",
        gender: "Male",
        locale: "en-US",
        description: "Confident, smooth masculine voice",
      },
      {
        id: "en-IN-NeerjaNeural",
        name: "Neerja (India Fluent)",
        gender: "Female",
        locale: "en-IN",
        description: "Natural Indian English accent",
      },
      {
        id: "en-GB-SoniaNeural",
        name: "Sonia (UK Crisp)",
        gender: "Female",
        locale: "en-GB",
        description: "Crisp British English accent",
      },
    ];
    this.voicesCache = defaults;
    return defaults;
  }

  /**
   * Speak text using Edge Neural TTS streaming endpoint.
   * Automatically falls back to browser SpeechSynthesis on error.
   */
  speak(
    text: string,
    voice: string = "en-US-JennyNeural",
    callbacks?: {
      onStart?: () => void;
      onEnded?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    this.stop();

    const trimmed = text.trim();
    if (!trimmed) {
      callbacks?.onEnded?.();
      return;
    }

    try {
      const url = `${API}/api/voice/speak?text=${encodeURIComponent(trimmed)}&voice=${encodeURIComponent(voice)}`;
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isAudioPlaying = true;
        callbacks?.onStart?.();
      };

      audio.onended = () => {
        this.isAudioPlaying = false;
        this.currentAudio = null;
        callbacks?.onEnded?.();
      };

      audio.onerror = (e) => {
        console.warn("Backend TTS stream playback failed, falling back to browser speech synthesis:", e);
        this.isAudioPlaying = false;
        this.currentAudio = null;
        this.speakBrowserFallback(trimmed, callbacks);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio autoplay blocked or failed, falling back to browser speech synthesis:", err);
          this.isAudioPlaying = false;
          this.currentAudio = null;
          this.speakBrowserFallback(trimmed, callbacks);
        });
      }
    } catch (err) {
      console.warn("Audio initialization failed:", err);
      this.speakBrowserFallback(trimmed, callbacks);
    }
  }

  /**
   * Offline / In-browser speech synthesis fallback.
   */
  private speakBrowserFallback(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnded?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      callbacks?.onError?.("Speech synthesis not supported in this browser.");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.onstart = () => {
        this.isAudioPlaying = true;
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        this.isAudioPlaying = false;
        callbacks?.onEnded?.();
      };

      utterance.onerror = (e) => {
        this.isAudioPlaying = false;
        callbacks?.onError?.(e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isAudioPlaying = false;
      callbacks?.onError?.(err);
    }
  }

  /**
   * Stop any current speech playback immediately.
   */
  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore audio stop errors
      }
      this.currentAudio = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }

    this.isAudioPlaying = false;
  }

  /**
   * Whether audio is actively playing.
   */
  isPlaying(): boolean {
    return this.isAudioPlaying;
  }
}

export const voiceService = new VoiceService();
