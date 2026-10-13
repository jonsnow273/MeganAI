import { Clock, PanelLeftOpen, PanelLeftClose, Trash2, Wifi, WifiOff } from "lucide-react";

interface Props {
  sessionId: string | null;
  onClear: () => void;
  onOpenTimeMachine?: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isConnected?: boolean;
}

export function Header({
  sessionId,
  onClear,
  onOpenTimeMachine,
  sidebarCollapsed,
  onToggleSidebar,
  isConnected = true,
}: Props) {
  return (
    <header className="
      h-14 flex-shrink-0 flex items-center justify-between
      px-4 border-b border-surface-700
      bg-surface-900/80 backdrop-blur-sm
      z-20
    ">
      {/* Left: sidebar toggle + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-surface-700 transition-all"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed
            ? <PanelLeftOpen className="w-4.5 h-4.5" />
            : <PanelLeftClose className="w-4.5 h-4.5" />
          }
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-zinc-400">
            {sessionId
              ? <span className="font-mono text-xs text-zinc-600">{sessionId.slice(0, 18)}…</span>
              : <span className="text-zinc-600 text-xs">No active session</span>
            }
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Connection indicator */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
            isConnected
              ? "text-emerald-400 bg-emerald-950/30 border-emerald-800/40"
              : "text-red-400 bg-red-950/30 border-red-800/40"
          }`}
          title={isConnected ? "Backend connected" : "Backend unreachable"}
        >
          {isConnected
            ? <Wifi className="w-3 h-3" />
            : <WifiOff className="w-3 h-3" />
          }
          <span className="hidden md:inline">{isConnected ? "Connected" : "Offline"}</span>
        </div>

        {/* Time machine */}
        {onOpenTimeMachine && (
          <button
            onClick={onOpenTimeMachine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
              bg-surface-800 hover:bg-surface-700
              border border-surface-600 hover:border-megan-700/50
              text-zinc-400 hover:text-megan-300
              transition-all duration-200"
            title="Open Visual Time Machine"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Time Machine</span>
          </button>
        )}

        {/* Clear chat */}
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
            bg-surface-800 hover:bg-red-950/40
            border border-surface-600 hover:border-red-800/50
            text-zinc-400 hover:text-red-400
            transition-all duration-200"
          title="Clear conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </header>
  );
}
