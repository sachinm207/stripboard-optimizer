import React, { useState } from 'react';
import { Moon, Sun, MapPin, AlertCircle, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { DaySchedule } from '../types';
import { StripItem } from './StripItem';

interface StripboardProps {
  days: DaySchedule[];
  onMoveScene?: (sceneId: string, targetDay: number) => void;
  onLockScene?: (sceneId: string, lockedDay: number | null) => void;
  isWhatIfMode?: boolean;
  onToggleWhatIfMode?: () => void;
  tentativeMoveCount?: number;
}

export const Stripboard: React.FC<StripboardProps> = ({
  days,
  onMoveScene,
  onLockScene,
  isWhatIfMode = false,
  onToggleWhatIfMode,
  tentativeMoveCount = 0,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const totalWeeks = Math.ceil(days.length / 5);

  const visibleDays = selectedWeek === 'all'
    ? days
    : days.filter((d) => Math.ceil(d.day_number / 5) === selectedWeek);

  const handlePrevWeek = () => {
    if (selectedWeek === 'all' || selectedWeek <= 1) {
      setSelectedWeek(totalWeeks);
    } else {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek === 'all' || selectedWeek >= totalWeeks) {
      setSelectedWeek(1);
    } else {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>SHOOTING STRIPBOARD CANVAS</span>
          <span className="text-xs font-normal text-slate-400">({days.length} Shoot Days total)</span>
        </h2>

        <div className="flex items-center gap-3">
          {onToggleWhatIfMode && (
            <button
              type="button"
              onClick={onToggleWhatIfMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm ${
                isWhatIfMode
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sky-950/40 ring-1 ring-sky-400/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Toggle What-If simulation mode to test schedule rearrangements without overwriting official plan"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isWhatIfMode ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{isWhatIfMode ? '🧪 What-If Sandbox Active' : '🧪 What-If Sandbox'}</span>
              {tentativeMoveCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 font-black text-[10px]">
                  {tentativeMoveCount}
                </span>
              )}
            </button>
          )}

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
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
      </div>
    </div>

      {/* Week Navigation & Day Filter for Multi-Week Productions (e.g., 20 - 100 days) */}
      {days.length > 7 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Production Schedule:</span>
            </span>

            {totalWeeks <= 6 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedWeek('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedWeek === 'all'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  All Days ({days.length})
                </button>
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                  const startDay = (w - 1) * 5 + 1;
                  const endDay = Math.min(w * 5, days.length);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWeek(w)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedWeek === w
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      Week {w} (D{startDay}–D{endDay})
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWeek('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedWeek === 'all'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  All Days
                </button>

                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-850 cursor-pointer"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={selectedWeek}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedWeek(val === 'all' ? 'all' : Number(val));
                    }}
                    className="bg-transparent text-slate-200 font-medium text-xs px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-white">
                      All Weeks ({totalWeeks} Weeks / {days.length} Days)
                    </option>
                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                      const startDay = (w - 1) * 5 + 1;
                      const endDay = Math.min(w * 5, days.length);
                      return (
                        <option key={w} value={w} className="bg-slate-900 text-white">
                          Week {w} (Days {startDay}–{endDay})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-850 cursor-pointer"
                    title="Next Week"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Showing <span className="text-white font-bold">{visibleDays.length}</span> of {days.length} days
            </span>
            {selectedWeek !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedWeek('all')}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
              >
                Reset to All
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visibleDays.map((day) => {
          const hours = Math.floor(day.total_duration_minutes / 60);
          const mins = day.total_duration_minutes % 60;
          const isOverCapacity = day.total_duration_minutes > 600;

          if (day.is_dark_day) {
            return (
              <div
                key={day.day_number}
                className="bg-indigo-950/25 border-2 border-dashed border-indigo-800/60 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-300 text-sm font-mono shrink-0 shadow-sm">
                    D{day.day_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>DAY {day.day_number}</span>
                        {day.date_display && (
                          <span className="text-indigo-300/80 font-medium text-xs">• {day.date_display}</span>
                        )}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                        <Moon className="w-3 h-3" /> Scheduled Hiatus / Dark Day
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {day.dark_day_reason || 'Company off-call: Festival, municipal permit freeze, or statutory rest day. No shooting scheduled.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
                  <span className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
                    0 Scenes Scheduled
                  </span>
                </div>
              </div>
            );
          }

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
                        {day.date_display && (
                          <span className="text-slate-400 font-medium text-xs">• {day.date_display}</span>
                        )}
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
