/**
 * Megan Voice Service.
 * High-speed audio playback using Edge-TTS backend streaming with in-memory caching.
 * Locked to single natural female voice (Jenny) with absolute protection against dual/overlapping speech.
 */

const API = "http://localhost:8000";

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  locale: string;
  description: string;
}

export const FEMALE_VOICE: VoiceOption = {
  id: "en-US-JennyNeural",
  name: "Jenny (Neural Female)",
  gender: "Female",
  locale: "en-US",
  description: "Natural, crystal-clear conversational female voice",
};

class VoiceService {
  private currentAudio: HTMLAudioElement | null = null;
  private isAudioPlaying = false;
  private currentPlaybackId = 0;

  /**
   * Return single available female voice.
   */
  async getVoices(): Promise<VoiceOption[]> {
    return [FEMALE_VOICE];
  }

  /**
   * Speak text using Edge Neural TTS.
   * Absolutely prevents dual/overlapping voices by stopping any active audio first.
   */
  speak(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnded?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    // 1. Immediately abort and silence any current playback
    this.stop();

    const trimmed = text.trim();
    if (!trimmed) {
      callbacks?.onEnded?.();
      return;
    }

    const playbackId = ++this.currentPlaybackId;

    try {
      // Direct stream with cache-friendly URL
      const url = `${API}/api/voice/speak?text=${encodeURIComponent(trimmed)}`;
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onplay = () => {
        if (playbackId !== this.currentPlaybackId) return;
        this.isAudioPlaying = true;
        callbacks?.onStart?.();
      };

      audio.onended = () => {
        if (playbackId !== this.currentPlaybackId) return;
        this.isAudioPlaying = false;
        this.currentAudio = null;
        callbacks?.onEnded?.();
      };

      audio.onerror = (e) => {
        if (playbackId !== this.currentPlaybackId) return;
        this.isAudioPlaying = false;
        this.currentAudio = null;
        console.warn("TTS stream audio error:", e);
        callbacks?.onError?.(e);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // If aborted due to another speech or user interruption, ignore gracefully
          if (playbackId === this.currentPlaybackId && err.name !== "AbortError") {
            console.warn("Audio playback exception:", err);
            this.isAudioPlaying = false;
            callbacks?.onError?.(err);
          }
        });
      }
    } catch (err) {
      console.warn("Voice service exception:", err);
      this.isAudioPlaying = false;
      callbacks?.onError?.(err);
    }
  }

  /**
   * Stop any current speech playback immediately and cleanly.
   */
  stop(): void {
    this.currentPlaybackId++; // Invalidate any pending callbacks

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = "";
        this.currentAudio.removeAttribute("src");
        this.currentAudio.onplay = null;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
      } catch {
        // Ignore stop cleanup errors
      }
      this.currentAudio = null;
    }

    // Cancel browser synthesis if anything was lingering
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
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
