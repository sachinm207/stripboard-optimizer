import React from 'react';
import { Clapperboard, Cpu, Sparkles, Radio, Flame, FileText, RotateCcw, Upload } from 'lucide-react';
import { KafkaStatus } from '../types';

interface NavbarProps {
  productionId: string;
  kafkaStatus?: KafkaStatus | null;
  onOpenChaos: () => void;
  onOpenMemo: () => void;
  onOpenImport?: () => void;
  onReset: () => void;
  onSwitchPreset?: (presetId: string) => void;
  isSolving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  productionId,
  kafkaStatus,
  onOpenChaos,
  onOpenMemo,
  onOpenImport,
  onReset,
  onSwitchPreset,
  isSolving = false,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Production Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-black font-black">
            <Clapperboard className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">STRIPBOARD OPTIMIZER</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PROD: {productionId.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Event-Driven CP-SAT & Gemini Multi-Agent Scheduler</p>
          </div>
        </div>

        {/* Tech Stack Live Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>OR-Tools CP-SAT</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-sky-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Gemini 2.5 / 3.5 Flash</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-purple-400">
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Confluent Kafka Event Mesh</span>
            <span className="px-1 py-0.2 text-[10px] rounded bg-purple-500/20 text-purple-300">
              {kafkaStatus?.topics?.length || 5} Topics
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenChaos}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all shadow-sm"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Throw Chaos</span>
          </button>

          <button
            onClick={onOpenMemo}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 hover:text-sky-200 text-xs font-semibold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Executive Memo</span>
          </button>

          {onSwitchPreset && (
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => onSwitchPreset('neon_horizon')}
                disabled={isSolving}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  !productionId.includes('20')
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to 5-day demo production"
              >
                5-Day Sprint
              </button>
              <button
                onClick={() => onSwitchPreset('neon_horizon_20d')}
                disabled={isSolving}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  productionId.includes('20')
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to realistic 20-day feature film production"
              >
                20-Day Feature
              </button>
            </div>
          )}

          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Film</span>
            </button>
          )}

          <button
            onClick={onReset}
            disabled={isSolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Reset board to baseline clean schedule"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
