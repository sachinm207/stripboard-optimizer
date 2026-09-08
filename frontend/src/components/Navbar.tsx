import React from 'react';
import { Clapperboard, Cpu, Sparkles, Radio, Flame, FileText, RotateCcw, Upload, Sliders, Home, History, Zap } from 'lucide-react';
import { KafkaStatus } from '../types';

interface NavbarProps {
  productionId?: string | null;
  kafkaStatus?: KafkaStatus | null;
  hasProduction?: boolean;
  onOpenChaos: () => void;
  onOpenMemo: () => void;
  onOpenPlanEditor?: () => void;
  onOpenVersions?: () => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onReset: () => void;
  onClear?: () => void;
  onSwitchPreset?: (presetId: string) => void;
  onSolve?: () => void;
  isPendingOptimization?: boolean;
  isSolving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  productionId,
  kafkaStatus,
  hasProduction = true,
  onOpenChaos,
  onOpenMemo,
  onOpenPlanEditor,
  onOpenVersions,
  onOpenImport,
  onOpenSettings,
  onReset,
  onClear,
  onSwitchPreset,
  onSolve,
  isPendingOptimization = false,
  isSolving = false,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Production Branding & Home Anchor */}
        <div className="flex items-center gap-3">
          <div
            onClick={onClear}
            className={`flex items-center gap-3 ${onClear ? 'cursor-pointer group' : ''}`}
            title={onClear ? 'Click to return to Production Launcher' : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-black font-black group-hover:scale-105 transition-all">
              <Clapperboard className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                  STRIPBOARD OPTIMIZER
                </h1>
                {hasProduction && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {productionId?.includes('neon_horizon')
                        ? 'Neon Horizon (20-Day Demo)'
                        : productionId
                        ? productionId.replace(/_/g, ' ')
                        : 'Neon Horizon (20-Day Demo)'}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Autonomous Event-Driven CP-SAT & Gemini Multi-Agent Scheduler</p>
            </div>
          </div>

          {/* New Film Board Action Button on Left Side */}
          {hasProduction && onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all shadow-sm cursor-pointer ml-1"
              title="Create new film production or import script breakdown CSV/JSON"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>+ New Film Board</span>
            </button>
          )}
        </div>

        {/* Tech Stack Live Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>OR-Tools CP-SAT</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-sky-400">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Gemini 2.5 Pro</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-purple-400">
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>Confluent Kafka Mesh</span>
            <span className="px-1 py-0.2 text-[10px] rounded bg-purple-500/20 text-purple-300">
              {kafkaStatus?.topics?.length || 5} Topics
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {hasProduction && (
            <>
              {/* HERO OPTIMIZE SCHEDULE BUTTON: Prominent button to run Google OR-Tools CP-SAT */}
              {onSolve && (
                <button
                  onClick={onSolve}
                  disabled={isSolving}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black tracking-wider uppercase shadow-xl transition-all cursor-pointer ${
                    isPendingOptimization
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 ring-2 ring-emerald-400 animate-pulse shadow-emerald-950/80 scale-105'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 hover:scale-102 active:scale-98'
                  }`}
                  title="Run Google OR-Tools CP-SAT solver to compute globally optimal production schedule"
                >
                  <Zap className={`w-4 h-4 text-amber-300 fill-current ${isSolving ? 'animate-bounce' : ''}`} />
                  <span>{isSolving ? 'Optimizing...' : '⚡ Optimize Schedule'}</span>
                  {isPendingOptimization && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              )}

              {/* HERO THROW CHAOS BUTTON: Bold, Pulsing, High Visibility Emergency Action */}
              <button
                onClick={onOpenChaos}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:via-red-500 hover:to-amber-500 text-white text-xs sm:text-sm font-black tracking-wider uppercase shadow-xl shadow-rose-950/80 ring-2 ring-rose-400/50 hover:ring-rose-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Simulate sudden Force Majeure, COVID isolations, weather emergencies, and multi-day shutdowns"
              >
                <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Throw Chaos ⚡</span>
              </button>

              {onOpenPlanEditor && (
                <button
                  onClick={onOpenPlanEditor}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  title="Edit official production plan: Scenes, Cast blackouts, Location permits, and Calendar"
                >
                  <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Plan Editor</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-purple-200 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  title="Configure shoot start date, SAG-AFTRA penalty rates, permit lead times, and daily limits"
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Settings</span>
                </button>
              )}

              {onOpenVersions && (
                <button
                  onClick={onOpenVersions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                  title="Open Version History & Diff Explorer"
                >
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>Versions</span>
                </button>
              )}

              <button
                onClick={onOpenMemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 hover:text-sky-200 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                title="Generate Gemini AI Executive Memo"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Memo</span>
              </button>

              <button
                onClick={onReset}
                disabled={isSolving}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-400 hover:text-rose-300 text-xs font-medium transition-all cursor-pointer"
                title="Reset board to baseline clean schedule"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline">Reset</span>
              </button>
            </>
          )}

          {!hasProduction && onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-950" />
              <span>Import Film Breakdown</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
