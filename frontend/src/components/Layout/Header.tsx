import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface Props {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ sidebarCollapsed, onToggleSidebar, title }: Props) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[#27272e] bg-[#0d0d10] flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c] transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        {title ? (
          <span className="text-xs md:text-sm text-zinc-200 font-medium truncate max-w-md">
            {title}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200 tracking-tight">Megan Assistant</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">
              Nemotron Active
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Connected</span>
        </div>
      </div>
    </header>
  );
}
