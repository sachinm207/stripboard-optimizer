import React, { useState, useEffect } from 'react';
import { X, Flame, AlertTriangle, Plus, Trash2, Zap, Moon } from 'lucide-react';
import { DisruptionAlert, Actor, Scene, DaySchedule } from '../types';

interface ChaosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (alert: DisruptionAlert) => void;
  onInjectBatch?: (alerts: DisruptionAlert[]) => void;
  onReset: () => void;
  activeDisruptions: DisruptionAlert[];
  actors: Actor[];
  scenes: Scene[];
  numDays?: number;
  days?: DaySchedule[];
  onSolve?: () => void;
  isSolving?: boolean;
  productionId?: string;
}

export const ChaosDrawer: React.FC<ChaosDrawerProps> = ({
  isOpen,
  onClose,
  onInject,
  onInjectBatch,
  onReset,
  activeDisruptions,
  actors,
  scenes,
  numDays = 20,
  days = [],
  onSolve,
  isSolving = false,
  productionId,
}) => {
  const [selectedActor, setSelectedActor] = useState(actors[0]?.actor_id || 'ACTOR_SARAH');
  const [selectedLocation, setSelectedLocation] = useState(scenes[0]?.location || 'Warehouse District');
  const [disruptionType, setDisruptionType] = useState('ACTOR_DISRUPTION');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [reason, setReason] = useState('');

  // Reset day selection and form input whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedDays([]);
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const locations = Array.from(new Set(scenes.map((s) => s.location)));

  const isActor = disruptionType === 'ACTOR_DISRUPTION' || disruptionType === 'ACTOR_ILLNESS';
  const isDay = disruptionType === 'DAY_SHUTDOWN';
  const isLocation = disruptionType === 'LOCATION_DISRUPTION' || disruptionType === 'LOCATION_UNAVAILABLE' || (!isActor && !isDay);

  const createAlertObject = (): DisruptionAlert => ({
    alert_id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    production_id: productionId || 'prod_neon_horizon_20d',
    disruption_type: disruptionType,
    severity: 'CRITICAL',
    affected_actor_id: isActor ? selectedActor : undefined,
    affected_location: isLocation ? selectedLocation : undefined,
    affected_shoot_days: [...selectedDays],
    reason:
      reason ||
      (isDay
        ? 'Force Majeure Emergency Day Shutdown'
        : isActor
        ? `${actors.find((a) => a.actor_id === selectedActor)?.name || 'Actor'} unavailable for call`
        : `${selectedLocation} unavailable for filming`),
  });

  const handleAddCustomDisruption = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) return;
    const alert = createAlertObject();
    onInject(alert);
    setSelectedDays([]);
    setReason('');
  };

  const handleToggleDay = (d: number) => {
    if (selectedDays.includes(d)) {
      setSelectedDays(selectedDays.filter((x) => x !== d));
    } else {
      setSelectedDays([...selectedDays, d]);
    }
  };

  const daysList = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border-2 border-rose-600/50 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-rose-950/80 ring-1 ring-rose-500/30 overflow-y-auto flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 border border-rose-400/40 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white tracking-tight">THROW PRODUCTION CHAOS</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 tracking-wider">
                  Emergency Simulation Lab
                </span>
              </div>
              <p className="text-xs text-slate-400">Simulate real-world film production emergencies, COVID blackouts, weather floods, and sudden shutdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Wide Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
          {/* Left Column: Active Disruptions & Status */}
          <div className="space-y-4 flex flex-col">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Production Disruption Overview
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add sudden real-world filming emergencies (actor illness, weather freezes, permit revocations, or complete day shutdowns).
              </p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  Active disruptions on schedule: <strong className="text-white font-mono">{activeDisruptions.length}</strong>
                </span>
              </div>
            </div>

          {/* Active Disruptions Ingested */}
          {activeDisruptions.length > 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Active Disruptions ({activeDisruptions.length})
                </h4>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline font-medium cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeDisruptions.map((d, i) => {
                  const actorMatch = actors.find((a) => a.actor_id === d.affected_actor_id);
                  const isActorType = d.disruption_type === 'ACTOR_DISRUPTION' || d.disruption_type === 'ACTOR_ILLNESS' || Boolean(d.affected_actor_id);
                  const isDayType = d.disruption_type === 'DAY_SHUTDOWN';
                  const isLocType = d.disruption_type === 'LOCATION_DISRUPTION' || d.disruption_type === 'LOCATION_UNAVAILABLE' || Boolean(d.affected_location);

                  let title = d.disruption_type;
                  if (isActorType) title = `🎭 Actor: ${actorMatch ? `${actorMatch.name} (${actorMatch.character_name})` : d.affected_actor_id}`;
                  else if (isLocType) title = `📍 Location: ${d.affected_location}`;
                  else if (isDayType) title = `🗓️ Day Shutdown`;

                  return (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/30 text-xs"
                    >
                      <div className="font-semibold text-white">{title}</div>
                      <p className="text-slate-300 text-[11px] mt-0.5">{d.reason}</p>
                      <div className="text-[10px] text-amber-400/80 mt-1 font-mono">
                        Affected Days: {d.affected_shoot_days.map((x) => `Day ${x}`).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-400">
              <span>No disruptions active on current schedule.</span>
            </div>
          )}
        </div>

      {/* Right Column: Custom Chaos Builder & Staged Batch */}
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 shadow-lg">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Custom Disruption Injection
          </h4>
          <form onSubmit={handleAddCustomDisruption} className="space-y-3.5">
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Disruption Target / Entity</label>
              <select
                value={disruptionType}
                onChange={(e) => {
                  setDisruptionType(e.target.value);
                  setSelectedDays([]);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ACTOR_DISRUPTION">🎭 Actor Disruption (Illness / Conflict / Blackout)</option>
                <option value="LOCATION_DISRUPTION">📍 Location Disruption (Weather / Permit / Damage)</option>
                <option value="DAY_SHUTDOWN">🗓️ Entire Day Shutdown (Force Majeure / Emergency / Hiatus)</option>
              </select>
            </div>

            {isActor ? (
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Affected Actor</label>
                <select
                  value={selectedActor}
                  onChange={(e) => setSelectedActor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {actors.map((a) => (
                    <option key={a.actor_id} value={a.actor_id}>
                      {a.name} ({a.character_name})
                    </option>
                  ))}
                </select>
              </div>
            ) : isLocation ? (
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Affected Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-2.5 rounded bg-indigo-950/40 border border-indigo-800/50 text-[11px] text-indigo-200">
                <Moon className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                Entire shoot day will be evacuated and declared a zero-shooting hiatus.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-400 font-medium">
                  Affected Shoot Day(s) ({daysList.length} Total Days)
                </label>
                {selectedDays.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDays([])}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {daysList.length > 10 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val && !selectedDays.includes(val)) {
                          setSelectedDays([...selectedDays, val].sort((a, b) => a - b));
                        }
                      }}
                      value=""
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="" disabled>
                        + Select Day to add (Day 1 - {daysList.length})
                      </option>
                      {daysList
                        .filter((d) => !selectedDays.includes(d))
                        .map((d) => {
                          const daySchedule = days.find((day) => day.day_number === d);
                          const dateStr = daySchedule?.date_display ? ` (${daySchedule.date_display})` : '';
                          return (
                            <option key={d} value={d}>
                              Day {d}{dateStr}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {selectedDays.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                      {selectedDays.map((d) => {
                        const daySchedule = days.find((day) => day.day_number === d);
                        return (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1"
                          >
                            <span>Day {d}{daySchedule?.date_display ? ` (${daySchedule.date_display})` : ''}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedDays(selectedDays.filter((x) => x !== d))}
                              className="hover:text-white cursor-pointer ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">Select one or more days from the dropdown.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-950/50 rounded-lg border border-slate-800">
                  {daysList.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleToggleDay(d)}
                      className={`w-8 h-7 rounded border text-[11px] font-bold transition-all cursor-pointer ${
                        selectedDays.includes(d)
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Incident Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isDay
                    ? "e.g. Municipal curfew, flood evacuation, emergency hiatus"
                    : isActor
                    ? "e.g. Flu, emergency medical leave, contract conflict"
                    : "e.g. Permit revoked, structural damage, hurricane warning"
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSolving || selectedDays.length === 0}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-md shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isSolving ? 'Adding Disruption...' : '+ Add Disruption'}</span>
              </button>
            </div>
          </form>

          {/* Direct Optimize Schedule Shortcut */}
          {onSolve && (
            <div className="mt-4 p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Autonomous Re-Optimization</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Ready to calculate recovery schedule after staging disruptions?
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSolve();
                }}
                disabled={isSolving}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ Optimize Schedule</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
);
};
