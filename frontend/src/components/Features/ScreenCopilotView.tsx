import { useState, useRef } from "react";
import { Monitor, Camera, Upload, Loader2, Sparkles, HelpCircle } from "lucide-react";

const API = "http://localhost:8000";

export function ScreenCopilotView() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("Analyze what is visible on screen, identify any errors or bugs, and explain the exact fix.");
  const [result, setResult] = useState<{ analysis: string; screenshot_url?: string; diagnosis?: string; preview_thumbnail?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to analyze screen");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(",", 1)[-1];
      try {
        const res = await fetch(`${API}/api/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query.trim() || "Analyze this uploaded screenshot and diagnose any issues.",
            image_base64: base64Data,
            media_type: file.type || "image/png",
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({
          analysis: data.response,
          diagnosis: data.response,
          screenshot_url: reader.result as string,
        });
      } catch (err: any) {
        setError(err.message || "Failed to analyze uploaded screenshot.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const imageSrc = result?.screenshot_url || result?.preview_thumbnail;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Monitor className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-semibold text-dark-text">Multimodal Screen Copilot</h1>
        </div>

        <p className="text-sm text-dark-muted mb-6 max-w-2xl">
          Instantly inspect your active monitor or upload an image to let the Multimodal Vision model diagnose terminal stack traces, review IDE code, explain interface layouts, and prescribe actionable fixes.
        </p>

        {/* Instructions Card */}
        <div className="mb-6 p-4 rounded-xl bg-dark-surface/60 border border-dark-border text-xs text-dark-muted space-y-2">
          <div className="flex items-center gap-2 font-medium text-dark-text">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>How to use Screen Copilot:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Capture Desktop Screen:</strong> Grabs your primary monitor automatically via Win32 GDI and sends it to the vision model.</li>
            <li><strong>Upload Screenshot:</strong> Upload any error dialog, cropped terminal trace, or UI screenshot directly for diagnosis.</li>
            <li><strong>Custom Inspection Query:</strong> Type specific instructions below (e.g. &ldquo;Find the syntax error in my Python code&rdquo;) before clicking inspect.</li>
          </ul>
        </div>

        {/* Query Input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-dark-muted mb-1.5">
            Inspection Prompt / Question
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What should Megan look for on your screen?"
            className="w-full px-4 py-2.5 bg-dark-surface border border-dark-border rounded-xl text-xs text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleCapture}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Screen...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Capture & Analyze Desktop</span>
              </>
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-surface border border-dark-border text-dark-text hover:bg-dark-hover text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-dark-muted" />
            <span>Upload Screenshot</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
            Error: {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4 animate-fade-in">
            {imageSrc && (
              <div className="rounded-xl border border-dark-border overflow-hidden bg-black/60 p-1">
                <img
                  src={imageSrc}
                  alt="Inspected Screen"
                  className="w-full max-h-[420px] object-contain rounded-lg"
                />
              </div>
            )}
            <div className="p-5 rounded-xl bg-dark-surface border border-dark-border">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Vision Copilot Diagnosis</span>
              </div>
              <p className="text-xs text-dark-text leading-relaxed whitespace-pre-wrap">
                {result.analysis || result.diagnosis}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
