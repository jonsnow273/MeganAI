import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface Props {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ sidebarCollapsed, onToggleSidebar, title }: Props) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-sky-150/70 bg-white/60 backdrop-blur-md flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-sky-50 transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        {title ? (
          <span className="text-xs md:text-sm text-slate-800 font-medium truncate max-w-md">
            {title}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 tracking-tight">Megan Assistant</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700 border border-sky-200">
              Gateway Active
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected</span>
        </div>
      </div>
    </header>
  );
}
