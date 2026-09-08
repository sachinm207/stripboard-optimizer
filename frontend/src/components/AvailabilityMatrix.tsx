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
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDarkDays, setIsEditingDarkDays] = useState(false);

  // Draft state for matrix blackouts (Actor contracts & Location permits)
  const [draftActorBlackouts, setDraftActorBlackouts] = useState<Record<string, number[]>>(actorBlackouts);
  const [draftLocationBlackouts, setDraftLocationBlackouts] = useState<Record<string, number[]>>(locationBlackouts);

  // Draft state for pre-planned dark days calendar
  const [draftDarkDays, setDraftDarkDays] = useState<number[]>(darkDays);

  // Local staging for What-If exploratory soft locks (batching instead of immediate execution)
  const [stagedSoftLocks, setStagedSoftLocks] = useState<Record<string, number[]>>(softLocks || {});

  // Synchronize when props update (e.g. after solver run)
  useEffect(() => {
    if (!isEditing) {
      setDraftActorBlackouts(actorBlackouts);
      setDraftLocationBlackouts(locationBlackouts);
    }
  }, [actorBlackouts, locationBlackouts, isEditing]);

  useEffect(() => {
    if (!isEditingDarkDays) {
      setDraftDarkDays(darkDays);
    }
  }, [darkDays, isEditingDarkDays]);

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

  // Dropdown & Range helpers for Dark Days Calendar
  const [selectedDarkDayToAdd, setSelectedDarkDayToAdd] = useState<number>(1);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.min(numDays, 3));

  // Extract unique locations from all days
  const allLocations = Array.from(
    new Set(days.flatMap((d) => d.scenes.map((s) => s.location)))
  ).sort();

  // Compare staged locks with active locks in current schedule
  const isSoftLockDirty = JSON.stringify(stagedSoftLocks) !== JSON.stringify(softLocks || {});
  const totalStagedLocks = Object.values(stagedSoftLocks).reduce((acc, arr) => acc + arr.length, 0);
  const totalActiveLocks = Object.values(softLocks || {}).reduce((acc, arr) => acc + arr.length, 0);

  // Handlers for Matrix Blackouts Editing (Edit Hard Constraints)
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

  const handleSaveDraft = async () => {
    if (!onSaveConstraints) return;
    await onSaveConstraints({
      actor_blackouts: draftActorBlackouts,
      location_blackouts: draftLocationBlackouts,
      dark_days: darkDays,
    });
    setIsEditing(false);
  };

  const handleCancelDraft = () => {
    setDraftActorBlackouts(actorBlackouts);
    setDraftLocationBlackouts(locationBlackouts);
    setIsEditing(false);
  };

  // Handlers for Pre-Planned Dark Days Calendar (Configure Dark Days)
  const handleToggleDraftDarkDay = (day: number) => {
    if (!isEditingDarkDays) return;
    const updated = draftDarkDays.includes(day)
      ? draftDarkDays.filter((d) => d !== day)
      : [...draftDarkDays, day].sort((a, b) => a - b);
    setDraftDarkDays(updated);
  };

  const handleSaveDarkDays = async () => {
    if (!onSaveConstraints) return;
    await onSaveConstraints({
      actor_blackouts: actorBlackouts,
      location_blackouts: locationBlackouts,
      dark_days: draftDarkDays,
    });
    setIsEditingDarkDays(false);
  };

  const handleCancelDarkDays = () => {
    setDraftDarkDays(darkDays);
    setIsEditingDarkDays(false);
  };

  const handleAddSingleDarkDay = () => {
    if (!isEditingDarkDays) return;
    if (selectedDarkDayToAdd && !draftDarkDays.includes(selectedDarkDayToAdd)) {
      setDraftDarkDays([...draftDarkDays, selectedDarkDayToAdd].sort((a, b) => a - b));
    }
  };

  const handleApplyDarkRange = () => {
    if (!isEditingDarkDays) return;
    const start = Math.max(1, Math.min(rangeStart, rangeEnd));
    const end = Math.min(numDays, Math.max(rangeStart, rangeEnd));
    const newDays = new Set(draftDarkDays);
    for (let d = start; d <= end; d++) {
      newDays.add(d);
    }
    setDraftDarkDays(Array.from(newDays).sort((a, b) => a - b));
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
    return isEditingDarkDays ? draftDarkDays.includes(day) : darkDays.includes(day);
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
              <span>Editing Matrix Blackouts (🚫 Contractual & Permit)</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Read-Only Matrix (Protected)</span>
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
                <span>{isSolving ? 'Saving...' : 'Save Blackouts'}</span>
              </button>
            </>
          ) : (
            <>
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

              {onSaveConstraints && (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={isSolving}
                  className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Unlock edit mode to modify contractual actor blackouts or location permit restrictions"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Hard Constraints (Blackouts)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* DEDICATED PRE-PLANNED DARK DAYS & STATUTORY HIATUS CALENDAR (SOLE LOCATION FOR DARK DAYS) */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                🗓️ Pre-Planned Dark Days & Hiatus Calendar
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 border border-indigo-700 text-indigo-300">
                Company-Wide Hiatus
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pre-schedule statutory rest days, holidays, festivals, or municipal permit freezes. The solver strictly schedules 0 scenes on dark dates.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!isEditingDarkDays ? (
              <button
                onClick={() => setIsEditingDarkDays(true)}
                disabled={isSolving}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Configure company dark days and statutory hiatus"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Configure Dark Days</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelDarkDays}
                  disabled={isSolving}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveDarkDays}
                  disabled={isSolving}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSolving ? 'Saving...' : 'Save Dark Days'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Active Dark Days Exception List */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scheduled Dark Days ({isEditingDarkDays ? draftDarkDays.length : darkDays.length}):</span>
          </div>

          {(isEditingDarkDays ? draftDarkDays : darkDays).length === 0 ? (
            <div className="text-xs text-slate-400 py-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>No hiatus or dark days scheduled. All {numDays} shoot days are active calls.</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {(isEditingDarkDays ? draftDarkDays : darkDays).map((d) => {
                const daySchedule = days.find((day) => day.day_number === d);
                return (
                  <div
                    key={d}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950 border border-indigo-600 text-indigo-200 text-xs font-bold shadow-sm"
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Day {d}{daySchedule?.date_display ? ` • ${daySchedule.date_display}` : ''}: Hiatus / Dark Day
                    </span>
                    {isEditingDarkDays && (
                      <button
                        type="button"
                        onClick={() => handleToggleDraftDarkDay(d)}
                        className="p-0.5 rounded hover:bg-indigo-900 text-indigo-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title={`Remove Day ${d} from dark days`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dropdown & Range Tools when configuring dark days */}
        {isEditingDarkDays && (
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Dropdown to add single day */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Add Dark Day:</span>
                <select
                  value={selectedDarkDayToAdd}
                  onChange={(e) => setSelectedDarkDayToAdd(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {daysHeader
                    .filter((d) => !draftDarkDays.includes(d))
                    .map((d) => {
                      const daySchedule = days.find((day) => day.day_number === d);
                      const dateStr = daySchedule?.date_display ? ` (${daySchedule.date_display})` : '';
                      return (
                        <option key={d} value={d}>
                          Day {d}{dateStr} of {numDays} (Shoot Call)
                        </option>
                      );
                    })}
                </select>
                <button
                  type="button"
                  onClick={handleAddSingleDarkDay}
                  disabled={draftDarkDays.includes(selectedDarkDayToAdd)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  + Add Dark Day
                </button>
              </div>

              {/* Multi-Day Range Selector for longer productions (e.g. 20-100 days) */}
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                <span className="font-semibold text-slate-400">Multi-Day Range:</span>
                <span className="text-[11px] text-slate-500">Day</span>
                <input
                  type="number"
                  min={1}
                  max={numDays}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white text-center"
                />
                <span className="text-[11px] text-slate-500">to</span>
                <input
                  type="number"
                  min={1}
                  max={numDays}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white text-center"
                />
                <button
                  type="button"
                  onClick={handleApplyDarkRange}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-950 border border-slate-700 text-slate-200 hover:text-indigo-200 text-xs font-semibold cursor-pointer"
                >
                  Mark Range Dark
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compact Quick Pills Strip (shown for shoots <= 12 days, or as optional quick glance) */}
        {numDays <= 12 && (
          <div className="pt-1">
            <div className="text-[10px] text-slate-500 font-medium mb-1">
              Quick Day Toggle ({numDays} Days):
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {daysHeader.map((d) => {
                const isDark = isDayDark(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (isEditingDarkDays) {
                        handleToggleDraftDarkDay(d);
                      } else {
                        setIsEditingDarkDays(true);
                        handleToggleDraftDarkDay(d);
                      }
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                      isDark
                        ? 'bg-indigo-950 border-indigo-600 text-indigo-200 shadow-md shadow-indigo-950/60 ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    } cursor-pointer hover:scale-105`}
                    title={
                      isEditingDarkDays
                        ? isDark
                          ? `Day ${d}: Dark Day (Click to reopen as Shoot Day)`
                          : `Day ${d}: Shoot Day (Click to mark Dark Day)`
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
                      {isDark ? '🌙 Dark' : '🎬 Shoot'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            <span className="font-bold text-amber-300">Editing Contract & Permit Blackouts:</span> Click any matrix cell to toggle actor contract blackouts or location permit restrictions (🚫). Pre-planned company dark days are managed separately in the Calendar above. Click <strong className="text-white">"Save Blackouts"</strong> to stage your changes, then click <strong className="text-emerald-300">"⚡ Optimize Schedule"</strong> when ready to solve the stripboard.
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
                <th className="py-3 px-3 min-w-[180px] sticky left-0 bg-slate-900/95 z-20 border-r border-slate-800 shadow-md">
                  Character / Actor
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
                <th className="py-3 px-3 text-center">Work</th>
                <th className="py-3 px-3 text-center">Hold</th>
                <th className="py-3 px-3 text-right">Talent Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {doodMatrix.map((row) => (
                <tr key={row.actor_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 shadow-md">
                    <div className="font-semibold text-white">{row.character_name}</div>
                    <div className="text-[11px] text-slate-400">{row.name}</div>
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
                <th className="py-3 px-3 min-w-[200px] sticky left-0 bg-slate-900/95 z-20 border-r border-slate-800 shadow-md">
                  Filming Location
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
                <th className="py-3 px-3 text-center">Total Days</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allLocations.map((loc) => {
                const totalShootDaysAtLoc = days.filter((d) => d.locations.includes(loc)).length;

                return (
                  <tr key={loc} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 shadow-md">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{loc}</span>
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
