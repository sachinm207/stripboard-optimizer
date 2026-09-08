import React, { useState, useEffect } from 'react';
import { ActorDOODRow, Actor, DaySchedule } from '../types';
import {
  Users,
  MapPin,
  X,
  Pin,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface AvailabilityMatrixProps {
  doodMatrix: ActorDOODRow[];
  actors: Actor[];
  days: DaySchedule[];
  numDays: number;
  actorBlackouts?: Record<string, number[]>;
  locationBlackouts?: Record<string, number[]>;
  darkDays?: number[];
  softLocks?: Record<string, number[]>;
  onSaveConstraints?: (constraints: {
    actor_blackouts: Record<string, number[]>;
    location_blackouts: Record<string, number[]>;
    dark_days: number[];
  }) => Promise<void>;
  onToggleSoftLock?: (entityId: string, day: number) => Promise<void>;
  onApplySoftLocks?: (softLocks: Record<string, number[]>) => Promise<void>;
  onClearSoftLocks?: () => Promise<void>;
  onOpenChaos?: () => void;
  onSolve?: () => void;
  isSolving?: boolean;
}

export const AvailabilityMatrix: React.FC<AvailabilityMatrixProps> = ({
  doodMatrix,
  actors,
  days,
  numDays,
  actorBlackouts = {},
  locationBlackouts = {},
  darkDays = [],
  softLocks = {},
  onSaveConstraints,
  onToggleSoftLock,
  onApplySoftLocks,
  onClearSoftLocks,
  onOpenChaos,
  onSolve,
  isSolving = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cast' | 'location'>('cast');

  // Local staging for What-If exploratory soft locks (batching instead of immediate execution)
  const [stagedSoftLocks, setStagedSoftLocks] = useState<Record<string, number[]>>(softLocks || {});

  useEffect(() => {
    setStagedSoftLocks(softLocks || {});
  }, [softLocks]);

  const daysHeader = Array.from({ length: numDays }, (_, i) => i + 1);

  // Week Filtering & Pagination for large productions (20 - 100 days)
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const totalWeeks = Math.ceil(numDays / 5);
  const visibleDays = selectedWeek === 'all'
    ? daysHeader
    : daysHeader.filter((d) => Math.ceil(d / 5) === selectedWeek);

  // Extract unique locations from all days
  const allLocations = Array.from(
    new Set(days.flatMap((d) => d.scenes.map((s) => s.location)))
  ).sort();

  // Aggregate totals for summary rows
  const totalCastCost = doodMatrix.reduce((acc, r) => acc + r.talent_cost, 0);
  const totalCastWork = doodMatrix.reduce((acc, r) => acc + r.work_days, 0);
  const totalCastHold = doodMatrix.reduce((acc, r) => acc + r.hold_days, 0);
  const totalLocationDays = allLocations.reduce(
    (acc, loc) => acc + days.filter((d) => d.locations.includes(loc)).length,
    0
  );

  // Compare staged locks with active locks in current schedule
  const isSoftLockDirty = JSON.stringify(stagedSoftLocks) !== JSON.stringify(softLocks || {});
  const totalStagedLocks = Object.values(stagedSoftLocks).reduce((acc, arr) => acc + arr.length, 0);
  const totalActiveLocks = Object.values(softLocks || {}).reduce((acc, arr) => acc + arr.length, 0);

  // Handlers for What-If Exploratory Soft Locks (Staged locally, no instant re-solve)
  const handleToggleStagedSoftLock = (entityId: string, day: number) => {
    const current = stagedSoftLocks[entityId] || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);

    const next = { ...stagedSoftLocks };
    if (updated.length === 0) {
      delete next[entityId];
    } else {
      next[entityId] = updated;
    }
    setStagedSoftLocks(next);
  };

  const handleApplyStagedSoftLocks = async () => {
    if (onApplySoftLocks) {
      await onApplySoftLocks(stagedSoftLocks);
    }
  };

  const handleDiscardStagedSoftLocks = () => {
    setStagedSoftLocks(softLocks || {});
  };

  // Check if a cell is an active contractual/permit blackout
  const isActorBlackout = (actorId: string, day: number) => {
    if (isDayDark(day)) return false;
    return (actorBlackouts[actorId] || []).includes(day);
  };

  const isLocationBlackout = (location: string, day: number) => {
    if (isDayDark(day)) return false;
    return (locationBlackouts[location] || []).includes(day);
  };

  const isDayDark = (day: number) => {
    return (darkDays || []).includes(day);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSubTab('cast')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'cast'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cast DOOD Matrix</span>
            </button>
            <button
              onClick={() => setActiveSubTab('location')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'location'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Location LOOD Matrix</span>
            </button>
          </div>

          {/* Mode Indicator Badge */}
          <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Interactive DOOD & What-If Matrix</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSolve && (
            <button
              onClick={onSolve}
              disabled={isSolving}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              title="Run Google CP-SAT solver with all current constraints"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
              <span>{isSolving ? 'Optimizing...' : '⚡ Optimize Schedule'}</span>
            </button>
          )}

          {/* Staged What-If Optimization Button - User stages multiple pins, then clicks Optimize */}
          {(isSoftLockDirty || totalStagedLocks > 0) && (
            <button
              onClick={handleApplyStagedSoftLocks}
              disabled={isSolving || !isSoftLockDirty}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer animate-pulse"
              title="Run Google CP-SAT solver with all staged What-If Soft Locks"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isSolving
                  ? 'Optimizing...'
                  : isSoftLockDirty
                  ? `⚡ Optimize What-If (${totalStagedLocks} Pinned)`
                  : `What-If Optimized (${totalStagedLocks})`}
              </span>
            </button>
          )}

          {isSoftLockDirty && (
            <button
              onClick={handleDiscardStagedSoftLocks}
              disabled={isSolving}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Discard staged pins and revert back to active solution"
            >
              <X className="w-3.5 h-3.5" />
              <span>Discard Pins</span>
            </button>
          )}

          {totalActiveLocks > 0 && onClearSoftLocks && (
            <button
              onClick={async () => {
                await onClearSoftLocks();
                setStagedSoftLocks({});
              }}
              disabled={isSolving}
              className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/80 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Remove all soft exploratory locks"
            >
              <Pin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Clear What-If Locks ({totalActiveLocks})</span>
            </button>
          )}
        </div>
      </div>

      {/* Production Dark Days & Hiatus Status */}
      {darkDays.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs shadow-inner">
          <div className="flex items-center gap-2.5 text-indigo-200">
            <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong className="text-white">Scheduled Dark Days ({darkDays.length}):</strong>{' '}
              {darkDays.map((d) => {
                const daySchedule = days.find((day) => day.day_number === d);
                return `Day ${d}${daySchedule?.date_display ? ` (${daySchedule.date_display.split(', ')[1] || daySchedule.date_display})` : ''}`;
              }).join(', ')} — <span className="text-indigo-300">Company Hiatus (0 filming calls)</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              Calendar & dark days managed centrally in <strong className="text-purple-300 font-semibold">Plan Editor 📝</strong>
            </span>
            {onOpenChaos && (
              <button
                onClick={onOpenChaos}
                className="text-rose-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer border-l border-indigo-800/60 pl-3"
              >
                <span>Throw Chaos 🚨</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Instructional Guidance Callout */}
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            <strong className="text-slate-200">What-If Exploration:</strong> Click available cells to stage temporary <span className="text-sky-300 font-bold">What-If Locks (📌)</span>. When ready, click <strong className="text-white font-semibold">"⚡ Optimize What-If Scenario"</strong> above to test your hypothesis. Contract & permit blackouts are configured in <strong className="text-purple-300">Plan Editor 📝</strong>.
          </span>
        </div>
          <div className="flex items-center gap-3 shrink-0 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Work (W)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/25 border border-rose-500/40" /> Hold (H)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-950 border border-rose-700" /> 🚫 Blackout
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-indigo-950 border border-indigo-700" /> 🌙 Dark Day
            </span>
          </div>
        </div>

      {/* Week Pagination & Filter Bar for Long Productions (e.g. 20 - 100 days) */}
      {numDays > 5 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs shadow-inner">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <span>📅 View Week:</span>
            </span>

            {totalWeeks <= 6 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedWeek('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedWeek === 'all'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  All Days (1–{numDays})
                </button>
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                  const startDay = (w - 1) * 5 + 1;
                  const endDay = Math.min(w * 5, numDays);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWeek(w)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedWeek === w
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  All Days (1–{numDays})
                </button>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedWeek === 'all' || selectedWeek <= 1) {
                        setSelectedWeek(totalWeeks);
                      } else {
                        setSelectedWeek(selectedWeek - 1);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
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
                      All Weeks ({totalWeeks} Weeks / {numDays} Days)
                    </option>
                    {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
                      const startDay = (w - 1) * 5 + 1;
                      const endDay = Math.min(w * 5, numDays);
                      return (
                        <option key={w} value={w} className="bg-slate-900 text-white">
                          Week {w} (Days {startDay}–{endDay})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedWeek === 'all' || selectedWeek >= totalWeeks) {
                        setSelectedWeek(1);
                      } else {
                        setSelectedWeek(selectedWeek + 1);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
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
              Showing <span className="text-white font-bold">{visibleDays.length}</span> of {numDays} days
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

      {/* MATRIX VIEW: CAST DOOD */}
      {activeSubTab === 'cast' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-3 min-w-[190px] sticky left-0 bg-slate-900/95 z-20 border-r border-slate-800 shadow-md">
                  Character / Actor
                </th>
                <th className="py-3 px-3 text-right min-w-[105px] border-r border-slate-800/80 bg-slate-900/70 font-semibold text-slate-300">
                  Talent Cost
                </th>
                <th className="py-3 px-2 text-center min-w-[60px] border-r border-slate-800/60 bg-slate-900/50 font-semibold text-slate-300">
                  Work
                </th>
                <th className="py-3 px-2 text-center min-w-[60px] border-r border-slate-800/80 bg-slate-900/50 font-semibold text-slate-300">
                  Hold
                </th>
                {visibleDays.map((d) => {
                  const dayDark = isDayDark(d);
                  const daySchedule = days.find((day) => day.day_number === d);
                  return (
                    <th key={d} className="py-2.5 px-2 text-center min-w-[72px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-mono text-xs ${dayDark ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                          D{d}
                        </span>
                        {daySchedule?.date_display && (
                          <span className="text-[10px] text-slate-400 font-mono leading-tight whitespace-nowrap">
                            {daySchedule.date_display.split(', ')[1] || daySchedule.date_display}
                          </span>
                        )}
                        {dayDark && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 text-[9px] font-bold">
                            Hiatus
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {doodMatrix.map((row) => (
                <tr key={row.actor_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 shadow-md">
                    <div className="font-semibold text-white">{row.character_name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>{row.name}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-emerald-400 font-mono font-medium">${row.talent_cost.toLocaleString()}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-white bg-slate-900/40 border-r border-slate-800/80 whitespace-nowrap">
                    ${row.talent_cost.toLocaleString()}
                  </td>

                  <td className="py-3 px-2 text-center font-mono font-semibold text-slate-300 bg-slate-900/20 border-r border-slate-800/60">
                    {row.work_days}d
                  </td>

                  <td className="py-3 px-2 text-center font-mono border-r border-slate-800/80">
                    {row.hold_days > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {row.hold_days}d
                      </span>
                    ) : (
                      <span className="text-slate-500">0d</span>
                    )}
                  </td>

                  {visibleDays.map((d) => {
                    const idx = d - 1;
                    const code = row.day_codes[idx] || '-';
                    const isDark = isDayDark(d);
                    const isBlackout = isActorBlackout(row.actor_id, d);
                    const isStaged = stagedSoftLocks[row.actor_id]?.includes(d);
                    const isAlreadyActive = softLocks[row.actor_id]?.includes(d);

                    let content: React.ReactNode = code;
                    let cellClass = 'bg-slate-800/40 text-slate-500 border-transparent';

                    if (isDark) {
                      content = <Moon className="w-3 h-3 text-indigo-400" />;
                      cellClass = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
                    } else if (isBlackout) {
                      content = '🚫';
                      cellClass = 'bg-rose-950/80 text-rose-300 border-rose-700/80 font-bold';
                    } else if (isStaged) {
                      content = (
                        <span className="flex items-center gap-0.5">
                          <Pin className={`w-2.5 h-2.5 fill-current ${isAlreadyActive ? 'text-sky-400' : 'text-amber-400 animate-pulse'}`} />
                          <span>{code}</span>
                        </span>
                      );
                      cellClass = isAlreadyActive
                        ? 'bg-sky-950/80 text-sky-300 border-sky-600/80 font-bold shadow-sm shadow-sky-500/20'
                        : 'bg-amber-950/70 text-amber-200 border-amber-400 font-bold shadow-sm ring-1 ring-amber-400/40';
                    } else if (code === 'W') {
                      cellClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold';
                    } else if (code === 'H') {
                      cellClass = 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-black shadow-sm';
                    } else if (code === 'F') {
                      cellClass = 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-bold';
                    }

                    return (
                      <td key={d} className="py-2 px-2 text-center">
                        <button
                          type="button"
                          disabled={isDark || isBlackout}
                          onClick={() => {
                            if (isDark || isBlackout) return;
                            handleToggleStagedSoftLock(row.actor_id, d);
                          }}
                          title={
                            isDark
                              ? `Day ${d} is a company-wide dark day (hiatus) — shooting is suspended`
                              : isBlackout
                              ? `Contractual blackout: ${row.name} unavailable on Day ${d} (configured in Plan Editor)`
                              : isStaged
                              ? `Click to unpin Day ${d} (What-If)`
                              : `Click to pin Day ${d} (What-If staged)`
                          }
                          className={`w-9 h-8 rounded-md border text-xs flex items-center justify-center transition-all ${cellClass} ${
                            isDark || isBlackout
                              ? 'cursor-not-allowed opacity-60 shadow-none'
                              : 'hover:border-sky-400 hover:scale-105 cursor-pointer'
                          }`}
                        >
                          {content}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-950/90 font-bold text-xs">
                <td className="py-3 px-3 sticky left-0 bg-slate-950 z-20 border-r border-slate-800 shadow-md text-white">
                  TOTALS ({doodMatrix.length} Actors)
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 bg-slate-950 border-r border-slate-800/80 whitespace-nowrap">
                  ${totalCastCost.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-center font-mono font-bold text-slate-200 bg-slate-950 border-r border-slate-800/60">
                  {totalCastWork}d
                </td>
                <td className="py-3 px-2 text-center font-mono border-r border-slate-800/80">
                  {totalCastHold > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                      {totalCastHold}d
                    </span>
                  ) : (
                    <span className="text-slate-500">0d</span>
                  )}
                </td>
                {visibleDays.map((d) => {
                  const dayDark = isDayDark(d);
                  const activeActorsOnDay = doodMatrix.filter((r) => r.day_codes[d - 1] === 'W').length;
                  return (
                    <td key={d} className="py-2.5 px-2 text-center font-mono text-[11px]">
                      {dayDark ? (
                        <span className="text-indigo-400 font-bold">Hiatus</span>
                      ) : activeActorsOnDay > 0 ? (
                        <span className="text-emerald-400 font-semibold">{activeActorsOnDay} cast</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* MATRIX VIEW: LOCATION LOOD */}
      {activeSubTab === 'location' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-3 min-w-[190px] sticky left-0 bg-slate-900/95 z-20 border-r border-slate-800 shadow-md">
                  Filming Location
                </th>
                <th className="py-3 px-3 text-center min-w-[85px] border-r border-slate-800/80 bg-slate-900/70 font-semibold text-slate-300">
                  Total Days
                </th>
                <th className="py-3 px-3 text-center min-w-[75px] border-r border-slate-800/80 bg-slate-900/50 font-semibold text-slate-300">
                  Status
                </th>
                {visibleDays.map((d) => {
                  const dayDark = isDayDark(d);
                  const daySchedule = days.find((day) => day.day_number === d);
                  return (
                    <th key={d} className="py-2.5 px-2 text-center min-w-[80px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`font-mono text-xs ${dayDark ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                          D{d}
                        </span>
                        {daySchedule?.date_display && (
                          <span className="text-[10px] text-slate-400 font-mono leading-tight whitespace-nowrap">
                            {daySchedule.date_display.split(', ')[1] || daySchedule.date_display}
                          </span>
                        )}
                        {dayDark && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 text-[9px] font-bold">
                            Hiatus
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allLocations.map((loc) => {
                const totalShootDaysAtLoc = days.filter((d) => d.locations.includes(loc)).length;

                return (
                  <tr key={loc} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 shadow-md">
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{loc}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 ml-5.5">
                        {totalShootDaysAtLoc}d • {totalShootDaysAtLoc > 0 ? <span className="text-emerald-400 font-medium">Active</span> : <span className="text-slate-500">Idle</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-200 bg-slate-900/40 border-r border-slate-800/80">
                      {totalShootDaysAtLoc}d
                    </td>

                    <td className="py-3 px-3 text-center border-r border-slate-800/80">
                      {totalShootDaysAtLoc > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Idle</span>
                      )}
                    </td>

                    {visibleDays.map((d) => {
                      const daySchedule = days.find((day) => day.day_number === d);
                      const isShootingHere = daySchedule?.locations.includes(loc);
                      const scenesCount = daySchedule?.scenes.filter((s) => s.location === loc).length || 0;
                      const isDark = isDayDark(d);
                      const isBlackout = isLocationBlackout(loc, d);
                      const isStaged = stagedSoftLocks[loc]?.includes(d);
                      const isAlreadyActive = softLocks[loc]?.includes(d);

                      let cellContent: React.ReactNode = '—';
                      let cellClass = 'bg-slate-800/30 text-slate-500 border-transparent';

                      if (isDark) {
                        cellContent = <Moon className="w-3 h-3 text-indigo-400" />;
                        cellClass = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
                      } else if (isBlackout) {
                        cellContent = '🚫';
                        cellClass = 'bg-rose-950/80 text-rose-300 border-rose-700/80 font-bold';
                      } else if (isStaged) {
                        cellContent = (
                          <span className="flex items-center gap-0.5">
                            <Pin className={`w-2.5 h-2.5 fill-current ${isAlreadyActive ? 'text-sky-400' : 'text-amber-400 animate-pulse'}`} />
                            <span>{isShootingHere ? `${scenesCount}sc` : 'Pin'}</span>
                          </span>
                        );
                        cellClass = isAlreadyActive
                          ? 'bg-sky-950/80 text-sky-300 border-sky-600 font-bold shadow-sm'
                          : 'bg-amber-950/70 text-amber-200 border-amber-400 font-bold shadow-sm ring-1 ring-amber-400/40';
                      } else if (isShootingHere) {
                        cellContent = `${scenesCount} sc`;
                        cellClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold';
                      }

                      return (
                        <td key={d} className="py-2 px-2 text-center">
                          <button
                            type="button"
                            disabled={isDark || isBlackout}
                            onClick={() => {
                              if (isDark || isBlackout) return;
                              handleToggleStagedSoftLock(loc, d);
                            }}
                            title={
                              isDark
                                ? `Day ${d} is a company-wide dark day (hiatus) — shooting is suspended`
                                : isBlackout
                                ? `Permit restricted: ${loc} unavailable on Day ${d} (configured in Plan Editor)`
                                : isStaged
                                ? `Click to unpin Day ${d} for ${loc} (What-If)`
                                : `Click to pin Day ${d} for ${loc} (What-If staged)`
                            }
                            className={`w-12 h-8 rounded-md border text-[11px] flex items-center justify-center transition-all ${cellClass} ${
                              isDark || isBlackout
                                ? 'cursor-not-allowed opacity-60 shadow-none'
                                : 'hover:border-sky-400 hover:scale-105 cursor-pointer'
                            }`}
                          >
                            {cellContent}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-slate-950/90 font-bold text-xs">
                <td className="py-3 px-3 sticky left-0 bg-slate-950 z-20 border-r border-slate-800 shadow-md text-white">
                  TOTALS ({allLocations.length} Locations)
                </td>
                <td className="py-3 px-3 text-center font-mono font-black text-slate-200 bg-slate-950 border-r border-slate-800/80">
                  {totalLocationDays}d
                </td>
                <td className="py-3 px-3 text-center border-r border-slate-800/80">
                  <span className="text-slate-400 font-normal">
                    {allLocations.filter((loc) => days.some((d) => d.locations.includes(loc))).length} Active
                  </span>
                </td>
                {visibleDays.map((d) => {
                  const dayDark = isDayDark(d);
                  const daySchedule = days.find((day) => day.day_number === d);
                  const locsCount = daySchedule?.locations.length || 0;
                  return (
                    <td key={d} className="py-2.5 px-2 text-center font-mono text-[11px]">
                      {dayDark ? (
                        <span className="text-indigo-400 font-bold">Hiatus</span>
                      ) : locsCount > 0 ? (
                        <span className="text-emerald-400 font-semibold">{locsCount} loc</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
