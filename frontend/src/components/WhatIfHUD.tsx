import React from 'react';
import {
  Sparkles,
  Zap,
  Check,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ScheduleSolution } from '../types';

interface WhatIfHUDProps {
  baselineSolution: ScheduleSolution | null;
  currentSolution: ScheduleSolution | null;
  isSolving?: boolean;
  onSolveWhatIf: () => void;
  onCommitWhatIf: () => Promise<void>;
  onDiscardWhatIf: () => void;
  tentativeMoveCount?: number;
  tentativePinCount?: number;
}

export const WhatIfHUD: React.FC<WhatIfHUDProps> = ({
  baselineSolution,
  currentSolution,
  isSolving = false,
  onSolveWhatIf,
  onCommitWhatIf,
  onDiscardWhatIf,
  tentativeMoveCount = 0,
  tentativePinCount = 0,
}) => {
  if (!currentSolution) return null;

  const baselineCost = baselineSolution?.metrics?.objective_cost ?? currentSolution.metrics.objective_cost;
  const currentCost = currentSolution.metrics.objective_cost;
  const costDelta = currentCost - baselineCost;

  const baselineMoves = baselineSolution?.metrics?.total_company_moves ?? currentSolution.metrics.total_company_moves;
  const currentMoves = currentSolution.metrics.total_company_moves;
  const movesDelta = currentMoves - baselineMoves;

  const baselineViolations = baselineSolution?.metrics?.total_turnaround_violations ?? currentSolution.metrics.total_turnaround_violations;
  const currentViolations = currentSolution.metrics.total_turnaround_violations;
  const violationsDelta = currentViolations - baselineViolations;

  const totalChanges = tentativeMoveCount + tentativePinCount;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl animate-fade-in">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-indigo-500/60 rounded-2xl shadow-2xl shadow-indigo-950/80 p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-white">
        {/* Left Status & Scenario Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                <span>What-If Sandbox</span>
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                {totalChanges > 0
                  ? `${totalChanges} Tentative Change${totalChanges > 1 ? 's' : ''}`
                  : 'Simulation Active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
              Testing schedule adjustments. Baseline plan remains untouched until committed.
            </p>
          </div>
        </div>

        {/* Center Live Delta Comparison Metrics */}
        <div className="flex items-center gap-2 sm:gap-4 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
          {/* Budget Delta */}
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-[10px] text-slate-400 font-medium">Estimated Budget Delta</span>
            <div className="flex items-center gap-1 font-mono font-bold">
              {costDelta === 0 ? (
                <span className="text-slate-300">$0 (Neutral)</span>
              ) : costDelta > 0 ? (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 text-rose-400" />
                  <span>+${costDelta.toLocaleString()}</span>
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3 text-emerald-400" />
                  <span>-${Math.abs(costDelta).toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>

          <div className="w-[1px] h-7 bg-slate-800" />

          {/* Turnaround Compliance Delta */}
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-[10px] text-slate-400 font-medium">SAG Turnaround</span>
            <div className="flex items-center gap-1 font-mono font-bold text-xs">
              {currentViolations === 0 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>0 Violations</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentViolations} Violation{currentViolations > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </div>

          <div className="w-[1px] h-7 bg-slate-800 hidden sm:block" />

          {/* Company Moves */}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-[10px] text-slate-400 font-medium">Location Moves</span>
            <span className="font-mono font-bold text-slate-200">
              {currentMoves} moves {movesDelta !== 0 && `(${movesDelta > 0 ? `+${movesDelta}` : movesDelta})`}
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Re-solve What-If */}
          <button
            onClick={onSolveWhatIf}
            disabled={isSolving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            title="Re-run CP-SAT solver respecting tentative What-If scene pins"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-300 fill-current ${isSolving ? 'animate-bounce' : ''}`} />
            <span>{isSolving ? 'Solving...' : '⚡ Solve What-If'}</span>
          </button>

          {/* Commit as Official Plan */}
          <button
            onClick={onCommitWhatIf}
            disabled={isSolving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            title="Promote this simulation to official baseline production schedule and create version snapshot"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Commit Official</span>
          </button>

          {/* Discard Simulation */}
          <button
            onClick={onDiscardWhatIf}
            disabled={isSolving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            title="Discard all tentative moves/pins and restore clean baseline schedule"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Discard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
