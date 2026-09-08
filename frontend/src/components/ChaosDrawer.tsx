import React, { useState } from 'react';
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
  numDays = 5,
  days = [],
  onSolve,
  isSolving = false,
}) => {
  const [selectedActor, setSelectedActor] = useState(actors[0]?.actor_id || 'ACTOR_SARAH');
  const [selectedLocation, setSelectedLocation] = useState(scenes[0]?.location || 'Warehouse District');
  const [disruptionType, setDisruptionType] = useState('ACTOR_ILLNESS');
  const [selectedDays, setSelectedDays] = useState<number[]>([2]);
  const [reason, setReason] = useState('Emergency medical isolation (48h)');
  const [stagedAlerts, setStagedAlerts] = useState<DisruptionAlert[]>([]);
  const [shutdownDay, setShutdownDay] = useState<number>(3);
  const [shutdownReason, setShutdownReason] = useState<string>('Emergency Force Majeure: Citywide flash flood warning and municipal curfew');

  if (!isOpen) return null;

  const locations = Array.from(new Set(scenes.map((s) => s.location)));

  const createAlertObject = (): DisruptionAlert => ({
    alert_id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    production_id: 'prod_neon_horizon',
    disruption_type: disruptionType,
    severity: 'CRITICAL',
    affected_actor_id: disruptionType === 'ACTOR_ILLNESS' ? selectedActor : undefined,
    affected_location: disruptionType !== 'ACTOR_ILLNESS' ? selectedLocation : undefined,
    affected_shoot_days: [...selectedDays],
    reason: reason || 'Production disruption incident',
  });

  const handleInjectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const alert = createAlertObject();
    if (stagedAlerts.length > 0 && onInjectBatch) {
      onInjectBatch([...stagedAlerts, alert]);
      setStagedAlerts([]);
    } else {
      onInject(alert);
    }
  };

  const handleStageDisruption = () => {
    const alert = createAlertObject();
    setStagedAlerts([...stagedAlerts, alert]);
  };

  const handleRemoveStaged = (idx: number) => {
    setStagedAlerts(stagedAlerts.filter((_, i) => i !== idx));
  };

  const handleTriggerBatch = () => {
    if (stagedAlerts.length === 0) return;
    if (onInjectBatch) {
      onInjectBatch(stagedAlerts);
    } else {
      stagedAlerts.forEach((a) => onInject(a));
    }
    setStagedAlerts([]);
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
          {/* Left Column: Sudden Day Shutdown & Active Disruptions */}
          <div className="space-y-4">
            {/* DEDICATED SUDDEN EMERGENCY DAY SHUTDOWN SECTION */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-rose-950/40 border-2 border-rose-500/50 shadow-xl space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  🚨 Sudden Day Shutdown
                </h4>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  Force Majeure
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Instantly evacuate any shooting day due to sudden disasters, curfews, or strikes.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
              Select Day to Evacuate & Lock Down:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={shutdownDay}
                onChange={(e) => setShutdownDay(Number(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {daysList.map((d) => {
                  const daySchedule = days.find((day) => day.day_number === d);
                  const dateStr = daySchedule?.date_display ? ` (${daySchedule.date_display})` : '';
                  return (
                    <option key={d} value={d}>
                      Day {d}{dateStr} of {daysList.length} (Shoot Call)
                    </option>
                  );
                })}
              </select>
              {daysList.length <= 8 && (
                <div className="flex items-center gap-1">
                  {daysList.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setShutdownDay(d)}
                      className={`w-7 h-7 rounded border text-[11px] font-bold transition-all cursor-pointer ${
                        shutdownDay === d
                          ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-medium mb-1">
              Shutdown Reason:
            </label>
            <input
              type="text"
              value={shutdownReason}
              onChange={(e) => setShutdownReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

            <button
              type="button"
              disabled={isSolving}
              onClick={() => {
                onInject({
                  alert_id: `alert_shutdown_${Date.now()}`,
                  production_id: 'prod_neon_horizon',
                  disruption_type: 'DAY_SHUTDOWN',
                  severity: 'CRITICAL',
                  affected_shoot_days: [shutdownDay],
                  reason: shutdownReason || `Force Majeure: Emergency Day ${shutdownDay} Shutdown`,
                });
              }}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-98 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Moon className="w-4 h-4" />
              <span>
                {isSolving ? 'Evacuating Day...' : `🚨 Evacuate Day ${shutdownDay} & Reschedule Production`}
              </span>
            </button>
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
                {activeDisruptions.map((d, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/30 text-xs"
                  >
                    <div className="font-semibold text-white">{d.disruption_type}</div>
                    <p className="text-slate-300 text-[11px] mt-0.5">{d.reason}</p>
                    <div className="text-[10px] text-amber-400/80 mt-1 font-mono">
                      Affected Days: {d.affected_shoot_days.map((x) => `Day ${x}`).join(', ')}
                    </div>
                  </div>
                ))}
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
          <form onSubmit={handleInjectCustom} className="space-y-3.5">
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Disruption Type</label>
              <select
                value={disruptionType}
                onChange={(e) => setDisruptionType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ACTOR_ILLNESS">Actor Illness / Quarantine</option>
                <option value="WEATHER_EVENT">Extreme Weather Event</option>
                <option value="LOCATION_UNAVAILABLE">Location Unavailable</option>
                <option value="PERMIT_REVOCATION">Permit Revocation</option>
                <option value="DAY_SHUTDOWN">Force Majeure / Emergency Day Shutdown</option>
              </select>
            </div>

            {disruptionType === 'ACTOR_ILLNESS' ? (
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
            ) : disruptionType === 'DAY_SHUTDOWN' ? (
              <div className="p-2.5 rounded bg-indigo-950/40 border border-indigo-800/50 text-[11px] text-indigo-200">
                <Moon className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                Entire shoot day will be evacuated and declared a zero-shooting hiatus.
              </div>
            ) : (
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
                placeholder="e.g. Broken crane, union grievance"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleStageDisruption}
                disabled={selectedDays.length === 0}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                title="Queue this disruption to trigger alongside other disruptions"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Stage in Batch</span>
              </button>

              <button
                type="submit"
                disabled={isSolving || selectedDays.length === 0}
                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{isSolving ? 'Registering...' : 'Inject Disruption'}</span>
              </button>
            </div>
          </form>

          {/* Staged Disruptions Queue */}
          {stagedAlerts.length > 0 && (
            <div className="mt-4 p-3 bg-slate-950/80 border border-amber-500/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Staged Disruptions Batch ({stagedAlerts.length})
                </span>
                <button
                  onClick={() => setStagedAlerts([])}
                  className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {stagedAlerts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                    <div className="truncate pr-2">
                      <div className="font-semibold text-white truncate">{a.reason}</div>
                      <div className="text-slate-400 text-[10px]">
                        Days: {a.affected_shoot_days.map(d => `D${d}`).join(', ')} | {a.affected_actor_id || a.affected_location}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveStaged(i)}
                      className="text-slate-500 hover:text-rose-400 shrink-0 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleTriggerBatch}
                disabled={isSolving}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Register All {stagedAlerts.length} Staged Disruptions</span>
              </button>
            </div>
          )}

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
