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
  onClearSoftLocks?: () => Promise<void>;
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
  onClearSoftLocks,
  isSolving = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cast' | 'location'>('cast');
  const [isEditing, setIsEditing] = useState(false);

  // Draft state for edits
  const [draftActorBlackouts, setDraftActorBlackouts] = useState<Record<string, number[]>>(actorBlackouts);
  const [draftLocationBlackouts, setDraftLocationBlackouts] = useState<Record<string, number[]>>(locationBlackouts);
  const [draftDarkDays, setDraftDarkDays] = useState<number[]>(darkDays);

  // Synchronize when props update (e.g. after solver run)
  useEffect(() => {
    if (!isEditing) {
      setDraftActorBlackouts(actorBlackouts);
      setDraftLocationBlackouts(locationBlackouts);
      setDraftDarkDays(darkDays);
    }
  }, [actorBlackouts, locationBlackouts, darkDays, isEditing]);

  const daysHeader = Array.from({ length: numDays }, (_, i) => i + 1);

  // Extract unique locations from all days
  const allLocations = Array.from(
    new Set(days.flatMap((d) => d.scenes.map((s) => s.location)))
  ).sort();

  // Count active soft locks
  const totalSoftLocks = Object.values(softLocks).reduce((acc, arr) => acc + arr.length, 0);

  // Handlers for Draft Mode
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
        <div className="flex items-center gap-2.5 shrink-0">
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
              {totalSoftLocks > 0 && onClearSoftLocks && (
                <button
                  onClick={() => onClearSoftLocks()}
                  disabled={isSolving}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/80 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Remove all soft exploratory locks"
                >
                  <Pin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Clear What-If Locks ({totalSoftLocks})</span>
                </button>
              )}

              {onSaveConstraints && (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={isSolving}
                  className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Unlock edit mode to modify legal contract blackouts or city permits"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Hard Constraints</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Instructional Guidance Callout */}
      {isEditing ? (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300">Tier 1 Hard Constraints Editing:</span> Click any cell to toggle contractual / permit blackouts (🚫). Click the <strong className="text-white font-mono">[🌙 Dark Day]</strong> button in any column header to declare that entire calendar date a festival/holiday dark day. Click <strong className="text-white">"Save & Re-Optimize"</strong> to batch-commit your changes to the Google CP-SAT solver.
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              <strong className="text-slate-200">Tier 3 What-If Exploration:</strong> In Read Mode, click on any available day to toggle a temporary <span className="text-sky-300 font-bold">What-If Lock (📌)</span>. The solver prioritizes it without altering legally binding contracts.
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
                    const isSoftLocked = softLocks[row.actor_id]?.includes(d);

                    let content: React.ReactNode = code;
                    let cellClass = 'bg-slate-800/40 text-slate-500 border-transparent';

                    if (isDark) {
                      content = <Moon className="w-3 h-3 text-indigo-400" />;
                      cellClass = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
                    } else if (isBlackout) {
                      content = '🚫';
                      cellClass = 'bg-rose-950/80 text-rose-300 border-rose-700/80 font-bold';
                    } else if (isSoftLocked) {
                      content = (
                        <span className="flex items-center gap-0.5">
                          <Pin className="w-2.5 h-2.5 text-sky-400 fill-current" /> {code}
                        </span>
                      );
                      cellClass = 'bg-sky-950/80 text-sky-300 border-sky-600/80 font-bold shadow-sm shadow-sky-500/20';
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
                            } else if (!isDark && !isBlackout && onToggleSoftLock) {
                              onToggleSoftLock(row.actor_id, d);
                            }
                          }}
                          title={
                            isEditing
                              ? `Click to toggle Day ${d} blackout for ${row.name}`
                              : isDark
                              ? `Day ${d} is a company-wide dark day`
                              : isBlackout
                              ? `Contractually unavailable (Blackout)`
                              : isSoftLocked
                              ? `Click to remove What-If Soft Lock on Day ${d}`
                              : `Click to test What-If Soft Lock on Day ${d}`
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
                      const isSoftLocked = softLocks[loc]?.includes(d);

                      let cellContent: React.ReactNode = '—';
                      let cellClass = 'bg-slate-800/30 text-slate-500 border-transparent';

                      if (isDark) {
                        cellContent = <Moon className="w-3 h-3 text-indigo-400" />;
                        cellClass = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
                      } else if (isBlackout) {
                        cellContent = '🚫';
                        cellClass = 'bg-rose-950/80 text-rose-300 border-rose-700/80 font-bold';
                      } else if (isSoftLocked) {
                        cellContent = (
                          <span className="flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 text-sky-400 fill-current" />
                            <span>{isShootingHere ? `${scenesCount}sc` : 'Pin'}</span>
                          </span>
                        );
                        cellClass = 'bg-sky-950/80 text-sky-300 border-sky-600 font-bold shadow-sm';
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
                              } else if (!isDark && !isBlackout && onToggleSoftLock) {
                                onToggleSoftLock(loc, d);
                              }
                            }}
                            title={
                              isEditing
                                ? `Click to toggle permit blackout on Day ${d} for ${loc}`
                                : isDark
                                ? `Day ${d} is a dark day (no shooting)`
                                : isBlackout
                                ? `Permit Restricted (Blackout on Day ${d})`
                                : isSoftLocked
                                ? `Click to remove What-If Soft Lock on Day ${d}`
                                : `Click to test What-If Soft Lock on Day ${d}`
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
