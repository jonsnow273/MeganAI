import { useState } from "react";
import { Clock } from "lucide-react";
import { VisualTimeMachine } from "../Memory/VisualTimeMachine";

export function TimeMachineView() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-dark-text" />
          <h1 className="text-2xl font-semibold text-dark-text">Time Machine</h1>
        </div>
        <p className="text-sm text-dark-muted mb-6 max-w-2xl">
          Browse your screen capture history, search OCR text, and replay past moments with the interactive temporal scrubber.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text hover:bg-dark-hover transition-colors font-medium text-sm flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          <span>Launch Visual Time Machine</span>
        </button>
        <VisualTimeMachine isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
