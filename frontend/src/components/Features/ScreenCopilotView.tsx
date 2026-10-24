import { useState, useRef } from "react";
import { Monitor, Camera, Upload, Loader2, Sparkles, HelpCircle, AlertCircle } from "lucide-react";

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
    <div className="flex-1 overflow-y-auto bg-[#09090b]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-coral-glow-sm">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Multimodal Screen Copilot</h1>
            <p className="text-xs text-zinc-400 font-medium">Vision-powered desktop debugger and IDE inspector</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6 max-w-2xl leading-relaxed">
          Instantly inspect your active monitor or upload an image to let the Multimodal Vision model diagnose terminal stack traces, review IDE code, explain interface layouts, and prescribe actionable fixes.
        </p>

        {/* Instructions Card */}
        <div className="mb-6 p-5 rounded-2xl bg-[#121216] border border-[#27272e] text-xs text-zinc-300 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-zinc-100">
            <HelpCircle className="w-4 h-4 text-rose-400" />
            <span>How to use Screen Copilot:</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-zinc-400">
            <li><strong>Capture Desktop Screen:</strong> Grabs your primary monitor automatically via Win32 GDI and sends it to the vision model.</li>
            <li><strong>Upload Screenshot:</strong> Upload any error dialog, cropped terminal trace, or UI screenshot directly for diagnosis.</li>
            <li><strong>Custom Inspection Query:</strong> Type specific instructions below before clicking inspect.</li>
          </ul>
        </div>

        {/* Query Input Card */}
        <div className="mb-5 p-5 rounded-2xl bg-[#121216] border border-[#27272e] shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Inspection Prompt / Question
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What should Megan look for on your screen?"
            className="w-full px-4 py-3 bg-[#0a0a0c] border border-[#27272e] rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/80 focus:ring-2 focus:ring-rose-500/20 transition-all"
          />

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleCapture}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-coral-glow-sm active:scale-[0.99]"
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18181c] border border-[#27272e] text-zinc-300 hover:text-white hover:bg-[#202026] text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-zinc-400" />
              <span>Upload Screenshot</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Error: {error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4 animate-fade-in">
            {imageSrc && (
              <div className="rounded-2xl border border-[#27272e] overflow-hidden bg-black p-2 shadow-sm">
                <img
                  src={imageSrc}
                  alt="Inspected Screen"
                  className="w-full max-h-[460px] object-contain rounded-xl"
                />
              </div>
            )}
            <div className="p-6 rounded-2xl bg-[#121216] border border-[#27272e] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 mb-3">
                <Sparkles className="w-4 h-4" />
                <span>Vision Copilot Diagnosis</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
                {result.analysis || result.diagnosis}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
