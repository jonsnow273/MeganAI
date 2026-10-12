import { Clock } from "lucide-react";

interface Props {
  sessionId: string | null;
  onClear: () => void;
  onOpenTimeMachine?: () => void;
}

export function Header({ sessionId, onClear, onOpenTimeMachine }: Props) {
  return (
    <header className="border-b border-zinc-700 bg-zinc-900 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-white">🧠 Megan</h1>
        <span className="text-xs text-zinc-500 hidden sm:inline">
          Local AI Assistant with Controllable Behavior
        </span>
      </div>
      <div className="flex items-center gap-3">
        {onOpenTimeMachine && (
          <button
            onClick={onOpenTimeMachine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60 transition shadow-sm"
            title="Open Visual Time Machine"
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Time Machine</span>
          </button>
        )}
        {sessionId && (
          <span className="text-xs text-zinc-600 font-mono hidden md:inline">
            {sessionId.slice(0, 15)}...
          </span>
        )}
        <button
          onClick={onClear}
          className="text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          New Chat
        </button>
      </div>
    </header>
  );
}
