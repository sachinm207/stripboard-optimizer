import React, { useState, useEffect } from 'react';
import { ActorDOODRow, Actor, DaySchedule } from '../types';
import {
  Users,
  MapPin,
  Eye,
  Edit3,
  Save,
  X,
  Pin,
  Moon,
  Sparkles,
  Info,
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
  isSolving = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cast' | 'location'>('cast');
  const [isEditing, setIsEditing] = useState(false);

  // Draft state for edits
  const [draftActorBlackouts, setDraftActorBlackouts] = useState<Record<string, number[]>>(actorBlackouts);
  const [draftLocationBlackouts, setDraftLocationBlackouts] = useState<Record<string, number[]>>(locationBlackouts);
  const [draftDarkDays, setDraftDarkDays] = useState<number[]>(darkDays);

  // Local staging for What-If exploratory soft locks (batching instead of immediate execution)
  const [stagedSoftLocks, setStagedSoftLocks] = useState<Record<string, number[]>>(softLocks || {});

  // Synchronize when props update (e.g. after solver run)
  useEffect(() => {
    if (!isEditing) {
      setDraftActorBlackouts(actorBlackouts);
      setDraftLocationBlackouts(locationBlackouts);
      setDraftDarkDays(darkDays);
    }
  }, [actorBlackouts, locationBlackouts, darkDays, isEditing]);

  useEffect(() => {
    setStagedSoftLocks(softLocks || {});
  }, [softLocks]);

  const daysHeader = Array.from({ length: numDays }, (_, i) => i + 1);

  // Extract unique locations from all days
  const allLocations = Array.from(
    new Set(days.flatMap((d) => d.scenes.map((s) => s.location)))
  ).sort();

  // Compare staged locks with active locks in current schedule
  const isSoftLockDirty = JSON.stringify(stagedSoftLocks) !== JSON.stringify(softLocks || {});
  const totalStagedLocks = Object.values(stagedSoftLocks).reduce((acc, arr) => acc + arr.length, 0);
  const totalActiveLocks = Object.values(softLocks || {}).reduce((acc, arr) => acc + arr.length, 0);

  // Handlers for Draft Mode (Hard Constraints)
  const handleToggleActorDraftBlackout = (actorId: string, day: number) => {
    if (!isEditing) return;
    const current = draftActorBlackouts[actorId] || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setDraftActorBlackouts({ ...draftActorBlackouts, [actorId]: updated });
  };

  const handleToggleLocationDraftBlackout = (location: string, day: number) => {
    if (!isEditing) return;
    const current = draftLocationBlackouts[location] || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setDraftLocationBlackouts({ ...draftLocationBlackouts, [location]: updated });
  };

  const handleToggleDraftDarkDay = (day: number) => {
    if (!isEditing) return;
    const updated = draftDarkDays.includes(day)
      ? draftDarkDays.filter((d) => d !== day)
      : [...draftDarkDays, day].sort((a, b) => a - b);
    setDraftDarkDays(updated);
  };

  const handleSaveDraft = async () => {
    if (!onSaveConstraints) return;
    await onSaveConstraints({
      actor_blackouts: draftActorBlackouts,
      location_blackouts: draftLocationBlackouts,
      dark_days: draftDarkDays,
    });
    setIsEditing(false);
  };

  const handleCancelDraft = () => {
    setDraftActorBlackouts(actorBlackouts);
    setDraftLocationBlackouts(locationBlackouts);
    setDraftDarkDays(darkDays);
    setIsEditing(false);
  };

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

  // Check if a cell is an active hard blackout
  const isActorBlackout = (actorId: string, day: number) => {
    const list = isEditing ? draftActorBlackouts[actorId] : actorBlackouts[actorId];
    return list?.includes(day);
  };

  const isLocationBlackout = (location: string, day: number) => {
    const list = isEditing ? draftLocationBlackouts[location] : locationBlackouts[location];
    return list?.includes(day);
  };

  const isDayDark = (day: number) => {
    return isEditing ? draftDarkDays.includes(day) : darkDays.includes(day);
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
          {isEditing ? (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Draft Edit Mode (Unsaved Changes)</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Read-Only Mode (Protected)</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelDraft}
                disabled={isSolving}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSolving}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSolving ? 'Saving...' : 'Save & Re-Optimize'}</span>
              </button>
            </>
          ) : (
            <>
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

              {onSaveConstraints && (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={isSolving}
                  className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Unlock edit mode to modify legal contract blackouts or pre-planned dark days"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Hard Constraints</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tier 2: DEDICATED PRE-PLANNED DARK DAYS & STATUTORY HIATUS CALENDAR */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                🗓️ Pre-Planned Dark Days & Hiatus Calendar (Tier 1 Constraint)
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 border border-indigo-700 text-indigo-300">
                Company-Wide
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pre-schedule statutory rest days, holidays, festivals, or municipal permit freezes. The solver strictly schedules 0 scenes on dark dates.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Edit company dark days and actor contract blackouts"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Configure Dark Days</span>
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                Click any day pill below to toggle Dark Day
              </span>
            )}
          </div>
        </div>

        {/* Day Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
          {daysHeader.map((d) => {
            const isDark = isDayDark(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  if (isEditing) {
                    handleToggleDraftDarkDay(d);
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                  isDark
                    ? 'bg-indigo-950 border-indigo-600 text-indigo-200 shadow-md shadow-indigo-950/60 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                } cursor-pointer hover:scale-105`}
                title={
                  isEditing
                    ? isDark
                      ? `Day ${d}: Dark Day (Click to reopen)`
                      : `Day ${d}: Shoot Day (Click to set as Dark Day)`
                    : isDark
                    ? `Day ${d}: Pre-Planned Dark Day (Hiatus). Click to edit.`
                    : `Day ${d}: Scheduled Shoot Day. Click to edit.`
                }
              >
                <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="font-mono font-bold">Day {d}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isDark ? 'bg-indigo-900/90 text-indigo-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDark ? '🌙 Dark / Hiatus' : '🎬 Shoot Day'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cross-Link notice to Sudden Chaos Off Days */}
        <div className="text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-slate-800/60">
          <span>
            Looking to simulate an <strong className="text-rose-300">unplanned / sudden emergency day shutdown</strong> (Force Majeure, sudden storm)?
          </span>
          {onOpenChaos && (
            <button
              onClick={onOpenChaos}
              className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline cursor-pointer self-start sm:self-auto"
            >
              <span>Open Throw Chaos (Sudden Day Shutdown) 🚨</span>
            </button>
          )}
        </div>
      </div>

      {/* Instructional Guidance Callout */}
      {isEditing ? (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300">Tier 1 Hard Constraints Editing:</span> Click any cell to toggle contractual / permit blackouts (🚫). Click the <strong className="text-white font-mono">[🌙 Dark Day]</strong> button in any column header or the calendar strip above to declare that entire calendar date a festival/holiday dark day. Click <strong className="text-white">"Save & Re-Optimize"</strong> to batch-commit your changes to the Google CP-SAT solver.
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              <strong className="text-slate-200">Tier 3 What-If Exploration:</strong> Click available cells to stage temporary <span className="text-sky-300 font-bold">What-If Locks (📌)</span>. When ready, click <strong className="text-white font-semibold">"⚡ Optimize What-If Scenario"</strong> above to test your hypothesis.
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
      )}

      {/* MATRIX VIEW: CAST DOOD */}
      {activeSubTab === 'cast' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-3 min-w-[180px]">Character / Actor</th>
                {daysHeader.map((d) => {
                  const dayDark = isDayDark(d);
                  return (
                    <th key={d} className="py-2.5 px-2 text-center min-w-[72px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-mono text-xs ${dayDark ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                          Day {d}
                        </span>
                        {isEditing && (
                          <button
                            onClick={() => handleToggleDraftDarkDay(d)}
                            title={dayDark ? `Reopen Day ${d}` : `Mark Day ${d} as Festival / Dark Day`}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                              dayDark
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800 hover:bg-indigo-950 text-slate-400 hover:text-indigo-300 border-slate-700'
                            }`}
                          >
                            <Moon className="w-2.5 h-2.5 inline mr-0.5" />
                            {dayDark ? 'Dark' : 'Hiatus'}
                          </button>
                        )}
                        {!isEditing && dayDark && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 text-[9px] font-bold">
                            Hiatus
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center">Work</th>
                <th className="py-3 px-3 text-center">Hold</th>
                <th className="py-3 px-3 text-right">Talent Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {doodMatrix.map((row) => (
                <tr key={row.actor_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{row.character_name}</div>
                    <div className="text-[11px] text-slate-400">{row.name}</div>
                  </td>

                  {daysHeader.map((d, idx) => {
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
                          disabled={isDark && !isEditing}
                          onClick={() => {
                            if (isEditing) {
                              handleToggleActorDraftBlackout(row.actor_id, d);
                            } else if (!isDark && !isBlackout) {
                              handleToggleStagedSoftLock(row.actor_id, d);
                            }
                          }}
                          title={
                            isEditing
                              ? `Click to toggle Day ${d} blackout for ${row.name}`
                              : isDark
                              ? `Day ${d} is a company-wide dark day`
                              : isBlackout
                              ? `Contractually unavailable (Blackout)`
                              : isStaged
                              ? `Click to unpin Day ${d} (What-If)`
                              : `Click to pin Day ${d} (What-If staged)`
                          }
                          className={`w-9 h-8 rounded-md border text-xs flex items-center justify-center transition-all ${cellClass} ${
                            isEditing
                              ? 'hover:scale-105 hover:border-amber-400 cursor-pointer'
                              : !isDark && !isBlackout
                              ? 'hover:border-sky-400 hover:scale-105 cursor-pointer'
                              : 'cursor-default'
                          }`}
                        >
                          {content}
                        </button>
                      </td>
                    );
                  })}

                  <td className="py-3 px-3 text-center font-mono font-semibold text-slate-300">
                    {row.work_days}d
                  </td>

                  <td className="py-3 px-3 text-center font-mono">
                    {row.hold_days > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {row.hold_days}d
                      </span>
                    ) : (
                      <span className="text-slate-500">0d</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    ${row.talent_cost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MATRIX VIEW: LOCATION LOOD */}
      {activeSubTab === 'location' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-3 min-w-[200px]">Filming Location</th>
                {daysHeader.map((d) => {
                  const dayDark = isDayDark(d);
                  return (
                    <th key={d} className="py-2.5 px-2 text-center min-w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-mono text-xs ${dayDark ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                          Day {d}
                        </span>
                        {isEditing && (
                          <button
                            onClick={() => handleToggleDraftDarkDay(d)}
                            title={dayDark ? `Reopen Day ${d}` : `Mark Day ${d} as Festival / Dark Day`}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                              dayDark
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800 hover:bg-indigo-950 text-slate-400 hover:text-indigo-300 border-slate-700'
                            }`}
                          >
                            <Moon className="w-2.5 h-2.5 inline mr-0.5" />
                            {dayDark ? 'Dark' : 'Hiatus'}
                          </button>
                        )}
                        {!isEditing && dayDark && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 text-[9px] font-bold">
                            Hiatus
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center">Total Days</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allLocations.map((loc) => {
                const totalShootDaysAtLoc = days.filter((d) => d.locations.includes(loc)).length;

                return (
                  <tr key={loc} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{loc}</span>
                    </td>

                    {daysHeader.map((d) => {
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
                            disabled={isDark && !isEditing}
                            onClick={() => {
                              if (isEditing) {
                                handleToggleLocationDraftBlackout(loc, d);
                              } else if (!isDark && !isBlackout) {
                                handleToggleStagedSoftLock(loc, d);
                              }
                            }}
                            title={
                              isEditing
                                ? `Click to toggle permit blackout on Day ${d} for ${loc}`
                                : isDark
                                ? `Day ${d} is a dark day (no shooting)`
                                : isBlackout
                                ? `Permit Restricted (Blackout on Day ${d})`
                                : isStaged
                                ? `Click to unpin Day ${d} for ${loc} (What-If)`
                                : `Click to pin Day ${d} for ${loc} (What-If staged)`
                            }
                            className={`w-12 h-8 rounded-md border text-[11px] flex items-center justify-center transition-all ${cellClass} ${
                              isEditing
                                ? 'hover:scale-105 hover:border-amber-400 cursor-pointer'
                                : !isDark && !isBlackout
                                ? 'hover:border-sky-400 hover:scale-105 cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            {cellContent}
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-300">
                      {totalShootDaysAtLoc}d
                    </td>

                    <td className="py-3 px-3 text-right">
                      {totalShootDaysAtLoc > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Idle</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
