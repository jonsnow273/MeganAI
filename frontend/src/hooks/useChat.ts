import { useState, useCallback } from "react";
import type { Message, ChatResponse } from "../types/chat";

const API = "http://localhost:8000";

export interface Attachment {
  file: File;
  preview: string;
  type: "image" | "video";
  base64?: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("megan_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load an existing session into view
  const loadSession = useCallback((sid: string, rawMessages: any[]) => {
    const formatted: Message[] = rawMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m, idx) => ({
        id: `msg-${sid}-${idx}`,
        role: m.role as "user" | "assistant",
        content: m.content || "",
        timestamp: m.timestamp || new Date().toISOString(),
      }));
    setSessionId(sid);
    setMessages(formatted);
    setError(null);
    setLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string, attachment?: Attachment | null) => {
      const trimmed = text.trim();
      if (!trimmed && !attachment) return;
      if (loading) return;

      const now = Date.now();
      const assistantId = `assistant-${now}`;

      const userDisplayContent = attachment
        ? trimmed
          ? `[Attached ${attachment.type === "image" ? "Image" : "Media"}]\n${trimmed}`
          : `[Attached ${attachment.type === "image" ? "Image" : "Media"}]`
        : trimmed;

      const userMsg: Message = {
        id: `user-${now}`,
        role: "user",
        content: userDisplayContent,
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

      const payload: Record<string, any> = {
        message: trimmed || "Please analyze the attached media.",
        session_id: sessionId,
      };

      if (attachment?.base64) {
        payload.image_base64 = attachment.base64;
        payload.media_type = attachment.file.type || "image/png";
      }

      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      // Primary: Fast SSE streaming over HTTP
      try {
        const res = await fetch(`${API}/api/chat/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let accumulated = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith("data:")) continue;

              const jsonStr = trimmedLine.slice(5).trim();
              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);
                if (event.type === "token" && event.content) {
                  accumulated += event.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: accumulated } : m
                    )
                  );
                } else if (event.type === "done") {
                  if (event.session_id) setSessionId(event.session_id);
                  if (event.content && !accumulated) {
                    accumulated = event.content;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId ? { ...m, content: accumulated } : m
                      )
                    );
                  }
                } else if (event.type === "error") {
                  throw new Error(event.detail || "Generation error");
                }
              } catch (parseErr: any) {
                if (parseErr.message && !parseErr.message.includes("JSON")) {
                  throw parseErr;
                }
              }
            }
          }

          if (accumulated.trim()) {
            return accumulated.trim();
          }
        }
      } catch (streamErr) {
        // Fallback to standard REST endpoint
        try {
          const res = await fetch(`${API}/api/chat/message`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data: ChatResponse = await res.json();
          setSessionId(data.session_id);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: data.response } : m
            )
          );
          return data.response;
        } catch (fallbackErr: any) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setError(fallbackErr?.message || "Failed to generate response.");
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

  return {
    messages,
    loading,
    error,
    sessionId,
    sendMessage,
    clearChat,
    loadSession,
  };
}
