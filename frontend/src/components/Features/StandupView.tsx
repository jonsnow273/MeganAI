import { useState } from "react";
import { FileText } from "lucide-react";
import { StandupModal } from "../Standup/StandupModal";

export function StandupView() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-dark-text" />
          <h1 className="text-2xl font-semibold text-dark-text">Standup Reports</h1>
        </div>
        <p className="text-sm text-dark-muted mb-6 max-w-2xl">
          Automatically synthesize daily standup reports from your git commits, focus sessions, and screen activity into clean Markdown.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text hover:bg-dark-hover transition-colors font-medium text-sm flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span>Generate Daily Standup Report</span>
        </button>
        <StandupModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
