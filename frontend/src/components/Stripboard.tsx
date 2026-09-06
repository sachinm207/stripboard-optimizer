import React from 'react';
import { Moon, Sun, MapPin, AlertCircle } from 'lucide-react';
import { DaySchedule } from '../types';
import { StripItem } from './StripItem';

interface StripboardProps {
  days: DaySchedule[];
  onLockScene?: (sceneId: string, lockedDay: number | null) => void;
}

export const Stripboard: React.FC<StripboardProps> = ({ days, onLockScene }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>SHOOTING STRIPBOARD CANVAS</span>
          <span className="text-xs font-normal text-slate-400">({days.length} Shoot Days)</span>
        </h2>

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
            <span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-300" />
            <span className="text-slate-300 text-[11px]">EXT NIGHT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-sky-200 border border-sky-300" />
            <span className="text-slate-300 text-[11px]">INT NIGHT</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const hours = Math.floor(day.total_duration_minutes / 60);
          const mins = day.total_duration_minutes % 60;
          const isOverCapacity = day.total_duration_minutes > 600;

          return (
            <div
              key={day.day_number}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sceneId = e.dataTransfer.getData('text/plain');
                if (sceneId && onLockScene) {
                  onLockScene(sceneId, day.day_number);
                }
              }}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-4 shadow-sm"
            >
              {/* Day Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                    D{day.day_number}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>DAY {day.day_number}</span>
                      {day.is_night && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300 text-[10px] font-semibold">
                          <Moon className="w-3 h-3" /> Night Call
                        </span>
                      )}
                      {day.is_day && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-semibold">
                          <Sun className="w-3 h-3" /> Day Call
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {day.locations.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Day Metrics Right */}
                <div className="flex items-center gap-3 text-xs">
                  {day.company_moves > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-medium">
                      {day.company_moves} Company Move{day.company_moves > 1 ? 's' : ''}
                    </span>
                  )}

                  <div className={`px-2.5 py-1 rounded-md font-mono text-xs font-semibold ${
                    isOverCapacity ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {hours}h {mins}m / 10h Max
                  </div>
                </div>
              </div>

              {/* Strips List */}
              {day.scenes.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2 border-2 border-dashed border-slate-800/80 rounded-lg">
                  <AlertCircle className="w-4 h-4" /> Drop scene strips here to schedule onto Day {day.day_number}
                </div>
              ) : (
                <div className="space-y-1">
                  {day.scenes.map((scene) => (
                    <StripItem
                      key={scene.scene_id}
                      scene={scene}
                      currentDay={day.day_number}
                      totalDays={days.length}
                      onLockScene={onLockScene}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
