import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, FileText } from 'lucide-react';

interface ProducerMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoContent?: string;
  solverRuntimeMs?: number;
  onRegenerateGemini?: () => Promise<void>;
  isGenerating?: boolean;
}

export const ProducerMemoModal: React.FC<ProducerMemoModalProps> = ({
  isOpen,
  onClose,
  memoContent = 'No memorandum generated yet.',
  solverRuntimeMs = 0,
  onRegenerateGemini,
  isGenerating = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(memoContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">AI Executive Producer Memorandum</h3>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-semibold border border-sky-500/30">
                  Gemini 2.5 / 3.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generated from CP-SAT optimization delta ({solverRuntimeMs} ms)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRegenerateGemini && (
              <button
                onClick={onRegenerateGemini}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isGenerating ? 'Drafting with Gemini...' : 'Live Gemini Draft'}</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Memo Content Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 space-y-4 whitespace-pre-wrap bg-slate-950/60">
          {memoContent}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <FileText className="w-3.5 h-3.5 text-slate-500" /> StripBoard Optimizer Autonomous Agent Mesh
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
