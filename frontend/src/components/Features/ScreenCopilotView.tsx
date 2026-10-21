import { useState } from "react";
import { Monitor, Camera, Loader2 } from "lucide-react";

const API = "http://localhost:8000";

export function ScreenCopilotView() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: string; screenshot_url: string; diagnosis?: string; preview_thumbnail?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Analyze my current screen. What is happening, identify any errors or issues, and provide the exact fix." })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to capture screen");
    } finally {
      setLoading(false);
    }
  };

  const imageSrc = result?.screenshot_url
    ? (result.screenshot_url.startsWith("data:") || result.screenshot_url.startsWith("http")
        ? result.screenshot_url
        : `${API}${result.screenshot_url}`)
    : result?.preview_thumbnail;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Monitor className="w-6 h-6 text-dark-text" />
          <h1 className="text-2xl font-semibold text-dark-text">Screen Copilot</h1>
        </div>
        <p className="text-sm text-dark-muted mb-6 max-w-2xl">
          Capture your screen and let the vision model analyze what's visible. Useful for debugging, understanding UI layouts, or getting help with what's on screen.
        </p>

        <button
          onClick={handleCapture}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text hover:bg-dark-hover transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Capturing...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Capture & Analyze</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-dark-surface border border-dark-border text-dark-muted text-sm">
            Error: {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {imageSrc && (
              <div className="rounded-lg border border-dark-border overflow-hidden bg-black/40">
                <img
                  src={imageSrc}
                  alt="Screen capture"
                  className="w-full max-h-96 object-contain"
                />
              </div>
            )}
            <div className="p-4 rounded-lg bg-dark-surface border border-dark-border">
              <p className="text-sm text-dark-text whitespace-pre-wrap">
                {result.analysis || result.diagnosis}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
