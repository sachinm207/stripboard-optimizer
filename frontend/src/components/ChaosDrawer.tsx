import React, { useState } from 'react';
import { X, Flame, AlertTriangle, ShieldAlert, CloudRain, Ban, Activity, Plus, Trash2, Zap } from 'lucide-react';
import { DisruptionAlert, Actor, Scene } from '../types';

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
  isSolving = false,
}) => {
  const [selectedActor, setSelectedActor] = useState(actors[0]?.actor_id || 'ACTOR_SARAH');
  const [selectedLocation, setSelectedLocation] = useState(scenes[0]?.location || 'Warehouse District');
  const [disruptionType, setDisruptionType] = useState('ACTOR_ILLNESS');
  const [selectedDays, setSelectedDays] = useState<number[]>([2]);
  const [reason, setReason] = useState('Emergency medical isolation (48h)');
  const [stagedAlerts, setStagedAlerts] = useState<DisruptionAlert[]>([]);

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
  const triggerPreset = (presetType: string) => {
    if (presetType === 'SARAH_COVID') {
      onInject({
        alert_id: `alert_covid_${Date.now()}`,
        production_id: 'prod_neon_horizon',
        disruption_type: 'ACTOR_ILLNESS',
        severity: 'CRITICAL',
        affected_actor_id: 'ACTOR_SARAH',
        affected_shoot_days: [2],
        reason: 'Lead Actor Sarah Vance tests positive for COVID (48-hr quarantine)',
      });
    } else if (presetType === 'WAREHOUSE_FLOOD') {
      onInject({
        alert_id: `alert_flood_${Date.now()}`,
        production_id: 'prod_neon_horizon',
        disruption_type: 'WEATHER_EVENT',
        severity: 'CRITICAL',
        affected_location: 'Warehouse District',
        affected_shoot_days: [1],
        reason: 'Severe flash flood at Warehouse District loading docks',
      });
    } else if (presetType === 'PERMIT_REVOCATION') {
      onInject({
        alert_id: `alert_permit_${Date.now()}`,
        production_id: 'prod_neon_horizon',
        disruption_type: 'PERMIT_REVOCATION',
        severity: 'CRITICAL',
        affected_location: 'Police Precinct',
        affected_shoot_days: [4],
        reason: 'City film commissioner revokes Police Precinct permit for Day 4',
      });
    } else if (presetType === 'MARCUS_PRESS') {
      onInject({
        alert_id: `alert_marcus_${Date.now()}`,
        production_id: 'prod_neon_horizon',
        disruption_type: 'ACTOR_ILLNESS',
        severity: 'CRITICAL',
        affected_actor_id: 'ACTOR_MARCUS',
        affected_shoot_days: [5],
        reason: 'Det. Marcus Cole required for emergency Broadway commitment on Day 5',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Throw Chaos at Production</h3>
              <p className="text-xs text-slate-400">Simulate real-world production emergencies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Production Chaos Presets */}
        <div className="my-5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            1-Click Disruption Presets
          </h4>
          <div className="space-y-2">
            <button
              onClick={() => triggerPreset('SARAH_COVID')}
              disabled={isSolving}
              className="w-full text-left p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-rose-500/30 hover:border-rose-500/60 transition-all flex items-start gap-3 group"
            >
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-xs text-white">Lead Actor COVID Quarantine</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Sarah Vance unavailable on Day 2</p>
              </div>
            </button>

            <button
              onClick={() => triggerPreset('WAREHOUSE_FLOOD')}
              disabled={isSolving}
              className="w-full text-left p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-sky-500/30 hover:border-sky-500/60 transition-all flex items-start gap-3 group"
            >
              <CloudRain className="w-5 h-5 text-sky-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-xs text-white">Warehouse Flash Flood</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Warehouse District shut down on Day 1</p>
              </div>
            </button>

            <button
              onClick={() => triggerPreset('PERMIT_REVOCATION')}
              disabled={isSolving}
              className="w-full text-left p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500/60 transition-all flex items-start gap-3 group"
            >
              <Ban className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-xs text-white">Precinct Permit Revoked</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Police Precinct filming prohibited on Day 4</p>
              </div>
            </button>
          </div>
        </div>

        {/* Custom Chaos Form */}
        <div className="border-t border-slate-800 pt-5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Custom Disruption Injection
          </h4>
          <form onSubmit={handleInjectCustom} className="space-y-3.5">
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">Disruption Type</label>
              <select
                value={disruptionType}
                onChange={(e) => setDisruptionType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ACTOR_ILLNESS">Actor Illness / Quarantine</option>
                <option value="WEATHER_EVENT">Extreme Weather Event</option>
                <option value="LOCATION_UNAVAILABLE">Location Unavailable</option>
                <option value="PERMIT_REVOCATION">Permit Revocation</option>
              </select>
            </div>

            {disruptionType === 'ACTOR_ILLNESS' ? (
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Affected Actor</label>
                <select
                  value={selectedActor}
                  onChange={(e) => setSelectedActor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {actors.map((a) => (
                    <option key={a.actor_id} value={a.actor_id}>
                      {a.name} ({a.character_name})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Affected Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
              <label className="block text-[11px] text-slate-400 font-medium mb-1.5">
                Affected Shoot Day(s) ({daysList.length} Total Days)
              </label>
              <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-950/50 rounded-lg border border-slate-800">
                {daysList.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleToggleDay(d)}
                    className={`w-8 h-7 rounded border text-[11px] font-bold transition-all ${
                      selectedDays.includes(d)
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
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
                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{isSolving ? 'Solving...' : 'Trigger Chaos'}</span>
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
                  className="text-[10px] text-slate-400 hover:text-rose-400"
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
                      className="text-slate-500 hover:text-rose-400 shrink-0 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleTriggerBatch}
                disabled={isSolving}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Trigger All {stagedAlerts.length} Staged Disruptions & Solve</span>
              </button>
            </div>
          )}
        </div>

        {/* Active Disruptions Ingested */}
        {activeDisruptions.length > 0 && (
          <div className="border-t border-slate-800 mt-6 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Active Disruptions ({activeDisruptions.length})
              </h4>
              <button
                onClick={onReset}
                className="text-[11px] text-rose-400 hover:underline font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {activeDisruptions.map((d, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-800/80 border border-amber-500/30 text-xs"
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
        )}
      </div>
    </div>
  );
};
