import { useState, useCallback } from "react";
import type { Message, ChatResponse } from "../types/chat";

const API = "http://localhost:8000";

function buildWebSocketUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8000/ws/chat";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat`;
}

class StreamError extends Error {
  receivedAny: boolean;

  constructor(message: string, receivedAny: boolean) {
    super(message);
    this.name = "StreamError";
    this.receivedAny = receivedAny;
  }
}

interface StreamResult {
  sessionId: string;
  content: string;
}

function streamMessage(
  text: string,
  sessionId: string | null,
  onToken: (chunk: string) => void
): Promise<StreamResult> {
  return new Promise((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(buildWebSocketUrl());
    } catch {
      reject(new StreamError("Unable to open a streaming connection.", false));
      return;
    }

    let settled = false;
    let content = "";
    let resolvedSessionId = sessionId ?? "";
    let timeoutId: number | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // ignore
      }
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve({ sessionId: resolvedSessionId, content });
    };

    const armTimeout = (ms: number) => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        finish(new StreamError("The response timed out.", content.length > 0));
      }, ms);
    };

    socket.onopen = () => {
      armTimeout(90000);
      socket.send(JSON.stringify({ message: text, session_id: sessionId }));
    };

    socket.onmessage = (event) => {
      let frame: {
        type?: string;
        content?: string;
        detail?: string;
        session_id?: string;
      };
      try {
        frame = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (frame.type === "token") {
        const chunk = frame.content ?? "";
        if (!chunk) return;
        content += chunk;
        armTimeout(90000);
        onToken(chunk);
      } else if (frame.type === "done") {
        resolvedSessionId = frame.session_id || resolvedSessionId;
        finish();
      } else if (frame.type === "error") {
        finish(new StreamError(frame.detail || "Generation failed.", content.length > 0));
      }
    };

    socket.onerror = () => {
      finish(new StreamError("Streaming connection failed.", content.length > 0));
    };

    socket.onclose = () => {
      if (!settled) {
        finish(new StreamError("Streaming connection closed unexpectedly.", content.length > 0));
      }
    };

    armTimeout(15000);
  });
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const now = Date.now();
      const assistantId = `assistant-${now}`;

      const userMsg: Message = {
        id: `user-${now}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);
      setError(null);

      const appendToken = (chunk: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      };

      try {
        const result = await streamMessage(trimmed, sessionId, appendToken);

        if (!result.content.trim()) {
          throw new StreamError("The model returned an empty response.", false);
        }

        setSessionId(result.sessionId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: result.content } : msg
          )
        );
      } catch (err) {
        const streamError = err as StreamError;

        // Keep a partially streamed answer instead of discarding it.
        if (streamError?.receivedAny) {
          setError(streamError.message || "The response was interrupted.");
          return;
        }

        // Streaming unavailable — fall back to the REST endpoint.
        try {
          const res = await fetch(`${API}/api/chat/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed, session_id: sessionId }),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data: ChatResponse = await res.json();
          setSessionId(data.session_id);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: data.response } : msg
            )
          );
        } catch (fallbackError: any) {
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
          setError(
            fallbackError?.message ||
              streamError?.message ||
              "Failed to send message"
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  return { messages, loading, error, sessionId, sendMessage, clearChat };
}
