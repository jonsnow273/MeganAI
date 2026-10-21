import { useState } from "react";
import { Zap } from "lucide-react";
import { MacroRecorderModal } from "../Automation/MacroRecorderModal";

export function MacrosView() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-dark-text" />
          <h1 className="text-2xl font-semibold text-dark-text">Workflow Macros</h1>
        </div>
        <p className="text-sm text-dark-muted mb-6 max-w-2xl">
          Record and replay multi-step desktop workflows. Automate repetitive tasks with safe, whitelisted desktop actions and natural-language triggers.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text hover:bg-dark-hover transition-colors font-medium text-sm flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          <span>Open Macro Recorder & Runner</span>
        </button>
        <MacroRecorderModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
