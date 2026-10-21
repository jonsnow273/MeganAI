import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface Props {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ sidebarCollapsed, onToggleSidebar, title }: Props) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-dark-border bg-dark-bg flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-muted hover:text-dark-text hover:bg-dark-hover transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
        {title && (
          <span className="text-sm text-dark-text font-medium truncate max-w-md">
            {title}
          </span>
        )}
      </div>
    </header>
  );
}
