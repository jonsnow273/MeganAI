import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-5 message-enter">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border border-megan-700/50 bg-megan-900/60 shadow-glow-sm mt-0.5">
        <Sparkles className="w-4 h-4 text-megan-400" />
      </div>

      <div className="flex flex-col gap-1 items-start">
        <span className="text-[11px] font-semibold text-megan-400 px-1">Megan</span>
        <div className="bg-surface-800 border border-surface-700/60 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-megan-500 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-megan-400 typing-dot" style={{ animationDelay: "0.15s" }} />
          <span className="w-2 h-2 rounded-full bg-megan-300 typing-dot" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}
