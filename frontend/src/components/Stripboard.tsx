import React from 'react';
import { Moon, Sun, MapPin, AlertCircle, Undo2, Redo2, Zap } from 'lucide-react';
import { DaySchedule } from '../types';
import { StripItem } from './StripItem';

interface StripboardProps {
  days: DaySchedule[];
  onMoveScene?: (sceneId: string, targetDay: number) => void;
  onLockScene?: (sceneId: string, lockedDay: number | null) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onReOptimize?: () => void;
  isSolving?: boolean;
}

export const Stripboard: React.FC<StripboardProps> = ({
  days,
  onMoveScene,
  onLockScene,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onReOptimize,
  isSolving = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>SHOOTING STRIPBOARD CANVAS</span>
            <span className="text-xs font-normal text-slate-400">({days.length} Shoot Days)</span>
          </h2>

          {/* Undo / Redo Toolbar */}
          {(onUndo || onRedo) && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 p-0.5 rounded-lg shadow-sm">
              <button
                onClick={onUndo}
                disabled={!canUndo || isSolving}
                title="Undo last strip move or lock (Ctrl+Z)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  canUndo && !isSolving
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer shadow-xs'
                    : 'text-slate-600 cursor-not-allowed opacity-40'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Undo</span>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo || isSolving}
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  canRedo && !isSolving
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer shadow-xs'
                    : 'text-slate-600 cursor-not-allowed opacity-40'
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Redo</span>
              </button>
            </div>
          )}
        </div>

        {/* Legend & Re-Optimize Button */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-300" />
              <span className="text-slate-300 text-[11px]">EXT DAY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-300" />
              <span className="text-slate-300 text-[11px]">INT DAY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-violet-400 border border-violet-500" />
              <span className="text-slate-300 text-[11px]">EXT NIGHT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-400 border border-blue-500" />
              <span className="text-slate-300 text-[11px]">INT NIGHT</span>
            </div>
          </div>

          {onReOptimize && (
            <button
              onClick={onReOptimize}
              disabled={isSolving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
              title="Optimize all remaining unlocked scenes around your manual locks and moves"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isSolving ? 'Optimizing...' : 'Re-Optimize Schedule'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {days.map((day) => {
          const hours = Math.floor(day.total_duration_minutes / 60);
          const mins = day.total_duration_minutes % 60;
          const isOverCapacity = day.total_duration_minutes > 600;

          return (
            <div
              key={day.day_number}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-3 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 items-stretch"
            >
              {/* Left Column: Day Headline, Call Type, Locations, Metrics */}
              <div className="md:w-52 lg:w-60 shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/80 pb-2.5 md:pb-0 md:pr-3.5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm font-mono shrink-0 shadow-sm">
                      D{day.day_number}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5 leading-none">
                        <span>DAY {day.day_number}</span>
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {day.is_night && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 text-[10px] font-semibold">
                            <Moon className="w-3 h-3" /> Night Call
                          </span>
                        )}
                        {day.is_day && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-semibold">
                            <Sun className="w-3 h-3" /> Day Call
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="text-xs text-slate-400 flex items-start gap-1.5 mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="leading-tight text-[11px] text-slate-300 font-medium">
                      {day.locations.length > 0 ? day.locations.join(', ') : 'No location scheduled'}
                    </span>
                  </div>
                </div>

                {/* Day Metrics at Bottom of Left Sidebar */}
                <div className="pt-2 mt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5 text-xs">
                  {day.company_moves > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                      {day.company_moves} Move{day.company_moves > 1 ? 's' : ''}
                    </span>
                  )}
                  <div
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                      isOverCapacity
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {hours}h {mins}m / 10h Max
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {day.scenes.length} scene{day.scenes.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Right Side: Scene Strips Stack */}
              <div className="flex-1 min-w-0 flex flex-col justify-center space-y-0.5">
                {day.scenes.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2 border-2 border-dashed border-slate-800/80 rounded-lg">
                    <AlertCircle className="w-4 h-4" /> No scenes scheduled on Day {day.day_number}. Use "Move to..." on any scene to schedule it here.
                  </div>
                ) : (
                  day.scenes.map((scene) => (
                    <StripItem
                      key={scene.scene_id}
                      scene={scene}
                      currentDay={day.day_number}
                      totalDays={days.length}
                      onMoveScene={onMoveScene}
                      onLockScene={onLockScene}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
