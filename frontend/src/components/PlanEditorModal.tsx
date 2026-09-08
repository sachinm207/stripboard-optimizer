import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Clapperboard,
  Users,
  MapPin,
  Calendar,
  Save,
  Lock,
  Unlock,
  AlertCircle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Moon,
} from 'lucide-react';
import { Scene, Actor, DaySchedule, ScheduleSolution, ActorDOODRow } from '../types';
import { updateProductionPlan, fetchProductionSettings, fetchScenes, fetchActors, fetchConstraints } from '../services/api';

interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  actors: Actor[];
  days: DaySchedule[];
  numDays: number;
  doodMatrix?: ActorDOODRow[];
  actorBlackouts?: Record<string, number[]>;
  locationBlackouts?: Record<string, number[]>;
  darkDays?: number[];
  startDate?: string;
  wTurnaround?: number;
  maxMinutesPerDay?: number;
  permitLeadDays?: number;
  onPlanSaved: (updatedSolution: ScheduleSolution) => void;
  isSaving?: boolean;
}

export const PlanEditorModal: React.FC<PlanEditorModalProps> = ({
  isOpen,
  onClose,
  scenes: initialScenes,
  actors: initialActors,
  days,
  numDays,
  doodMatrix = [],
  actorBlackouts = {},
  locationBlackouts = {},
  darkDays = [],
  startDate = '2026-10-12',
  wTurnaround = 25000,
  maxMinutesPerDay = 600,
  permitLeadDays = 0,
  onPlanSaved,
  isSaving = false,
}) => {
  const [activeTab, setActiveTab] = useState<'cast' | 'locations' | 'calendar'>('cast');

  // Working drafts
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [draftActorBlackouts, setDraftActorBlackouts] = useState<Record<string, number[]>>({});
  const [draftLocationBlackouts, setDraftLocationBlackouts] = useState<Record<string, number[]>>({});
  const [draftDarkDays, setDraftDarkDays] = useState<number[]>([]);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftTurnaround, setDraftTurnaround] = useState(wTurnaround);
  const [draftMaxMinutes, setDraftMaxMinutes] = useState(maxMinutesPerDay);
  const [draftPermitLeadDays, setDraftPermitLeadDays] = useState(permitLeadDays);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const prevIsOpenRef = useRef(false);

  // Sync existing board data whenever modal is opened
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // 1. Resolve scenes: Prioritize scenes list, merge/fallback to scenes currently scheduled on board days
      const boardScenesMap = new Map<string, Scene>();
      if (days && days.length > 0) {
        for (const d of days) {
          for (const sc of (d.scenes || [])) {
            boardScenesMap.set(sc.scene_id, {
              ...sc,
              cast_ids: sc.cast_ids || [],
              locked_day: sc.locked_day || null,
            });
          }
        }
      }

      let mergedScenes: Scene[] = [];
      if (initialScenes && initialScenes.length > 0) {
        mergedScenes = initialScenes.map((sc) => {
          const boardSc = boardScenesMap.get(sc.scene_id);
          return {
            ...sc,
            cast_ids: sc.cast_ids || boardSc?.cast_ids || [],
            locked_day: boardSc?.locked_day ?? sc.locked_day ?? null,
          };
        });
      } else {
        mergedScenes = Array.from(boardScenesMap.values());
      }
      setScenes(mergedScenes);

      // If still empty, fetch scenes from backend catalog
      if (mergedScenes.length === 0) {
        fetchScenes()
          .then((scs) => {
            if (scs && scs.length > 0) {
              setScenes(scs.map((s) => ({ ...s, cast_ids: s.cast_ids || [] })));
            }
          })
          .catch(() => null);
      }

      // 2. Resolve actors: Prioritize initialActors, fallback to DOOD matrix if needed
      let mergedActors: Actor[] = [];
      if (initialActors && initialActors.length > 0) {
        mergedActors = JSON.parse(JSON.stringify(initialActors));
      } else if (doodMatrix && doodMatrix.length > 0) {
        mergedActors = doodMatrix.map((row) => ({
          actor_id: row.actor_id,
          name: row.name,
          character_name: row.character_name,
          daily_rate: 2500,
          hold_rate: 2000,
          blackout_days: (actorBlackouts || {})[row.actor_id] || [],
        }));
      }
      setActors(mergedActors);

      if (mergedActors.length === 0) {
        fetchActors()
          .then((acts) => {
            if (acts && acts.length > 0) setActors(acts);
          })
          .catch(() => null);
      }

      // 3. Resolve blackouts, dark days & constraints
      const resolvedDark = [...(darkDays || [])];
      const darkSet = new Set(resolvedDark);
      const initialActorBl: Record<string, number[]> = {};
      for (const [aid, bDays] of Object.entries(actorBlackouts || {})) {
        initialActorBl[aid] = (bDays || []).filter((d) => !darkSet.has(d));
      }
      for (const act of mergedActors) {
        if (act.blackout_days && act.blackout_days.length > 0) {
          if (!initialActorBl[act.actor_id] || initialActorBl[act.actor_id].length === 0) {
            initialActorBl[act.actor_id] = act.blackout_days.filter((d) => !darkSet.has(d));
          }
        }
      }
      const initialLocBl: Record<string, number[]> = {};
      for (const [loc, bDays] of Object.entries(locationBlackouts || {})) {
        initialLocBl[loc] = (bDays || []).filter((d) => !darkSet.has(d));
      }

      setDraftActorBlackouts(initialActorBl);
      setDraftLocationBlackouts(initialLocBl);
      setDraftDarkDays(resolvedDark);

      // 4. Fetch latest production constraints & settings directly from backend
      fetchConstraints()
        .then((c) => {
          if (c) {
            const activeDark = c.dark_days && c.dark_days.length > 0 ? c.dark_days : resolvedDark;
            const activeDarkSet = new Set(activeDark);
            setDraftDarkDays(activeDark);
            setDraftActorBlackouts((prev) => {
              const merged = { ...(c.actor_blackouts || {}), ...prev };
              const cleaned: Record<string, number[]> = {};
              Object.entries(merged).forEach(([k, v]) => {
                cleaned[k] = (v || []).filter((d) => !activeDarkSet.has(d));
              });
              return cleaned;
            });
            if (c.location_blackouts && Object.keys(c.location_blackouts).length > 0) {
              setDraftLocationBlackouts((prev) => {
                const merged = { ...(c.location_blackouts || {}), ...prev };
                const cleaned: Record<string, number[]> = {};
                Object.entries(merged).forEach(([k, v]) => {
                  cleaned[k] = (v || []).filter((d) => !activeDarkSet.has(d));
                });
                return cleaned;
              });
            }
          }
        })
        .catch(() => null);

      fetchProductionSettings()
        .then((s) => {
          if (s.start_date) setDraftStartDate(s.start_date);
          if (s.w_turnaround) setDraftTurnaround(s.w_turnaround);
          if (s.max_minutes_per_day) setDraftMaxMinutes(s.max_minutes_per_day);
          if (typeof s.permit_lead_days === 'number') setDraftPermitLeadDays(s.permit_lead_days);
        })
        .catch(() => {
          setDraftStartDate(startDate);
          setDraftTurnaround(wTurnaround);
          setDraftMaxMinutes(maxMinutesPerDay);
          setDraftPermitLeadDays(permitLeadDays);
        });

      setStatusMessage(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialScenes, initialActors, days, doodMatrix]);

  // Pre-calculate which days each location is currently active on the board
  const locationActiveDaysMap = useMemo(() => {
    const map = new Map<string, number[]>();
    if (days && days.length > 0) {
      for (const d of days) {
        for (const sc of (d.scenes || [])) {
          if (!sc.location) continue;
          const list = map.get(sc.location) || [];
          if (!list.includes(d.day_number)) {
            list.push(d.day_number);
            map.set(sc.location, list.sort((a, b) => a - b));
          }
        }
      }
    }
    return map;
  }, [days]);

  // Pre-calculate DOOD stats for each actor
  const actorDoodMap = useMemo(() => {
    const map = new Map<string, ActorDOODRow>();
    if (doodMatrix && doodMatrix.length > 0) {
      for (const row of doodMatrix) {
        map.set(row.actor_id, row);
      }
    }
    return map;
  }, [doodMatrix]);

  const locations = useMemo(() => {
    const set = new Set((scenes || []).map((s) => s.location).filter(Boolean));
    Object.keys(draftLocationBlackouts || {}).forEach((loc) => set.add(loc));
    Object.keys(locationBlackouts || {}).forEach((loc) => set.add(loc));
    return Array.from(set).sort();
  }, [scenes, draftLocationBlackouts, locationBlackouts]);

  const totalDays = Math.max(numDays || 20, (days || []).length, 20);
  const allDays = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Dynamic calendar date helper
  const getFormattedDate = (baseDateStr: string, dayNumber: number): string => {
    try {
      const base = new Date(baseDateStr + 'T00:00:00');
      if (isNaN(base.getTime())) return '';
      const d = new Date(base);
      d.setDate(base.getDate() + (dayNumber - 1));
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Actor editing helpers
  const handleUpdateActor = (actorId: string, field: keyof Actor, value: any) => {
    setActors(actors.map((a) => (a.actor_id === actorId ? { ...a, [field]: value } : a)));
  };

  const handleDeleteActor = (actorId: string) => {
    setActors(actors.filter((a) => a.actor_id !== actorId));
    const nextBlackouts = { ...draftActorBlackouts };
    delete nextBlackouts[actorId];
    setDraftActorBlackouts(nextBlackouts);
  };

  const handleAddActor = () => {
    const nextIdx = actors.length + 1;
    const newAct: Actor = {
      actor_id: `ACTOR_${nextIdx}`,
      name: `New Cast Member ${nextIdx}`,
      character_name: `Role ${nextIdx}`,
      daily_rate: 3000,
      hold_rate: 1500,
      blackout_days: [],
    };
    setActors([...actors, newAct]);
  };

  // Location helpers
  const handleAddLocation = (locName: string) => {
    if (!locName.trim()) return;
    if (!draftLocationBlackouts[locName]) {
      setDraftLocationBlackouts({ ...draftLocationBlackouts, [locName]: [] });
    }
    setNewLocationInput('');
  };

  // Actor blackout toggles
  const handleToggleActorBlackout = (actorId: string, day: number) => {
    if (draftDarkDays.includes(day)) return; // Dark days cannot be toggled to blackouts
    const current = (draftActorBlackouts[actorId] || []).filter((d) => !draftDarkDays.includes(d));
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setDraftActorBlackouts({ ...draftActorBlackouts, [actorId]: next });
    setActors((prev) =>
      prev.map((a) => (a.actor_id === actorId ? { ...a, blackout_days: next } : a))
    );
  };

  // Location blackout toggles
  const handleToggleLocationBlackout = (locName: string, day: number) => {
    if (draftDarkDays.includes(day)) return; // Dark days cannot be toggled to blackouts
    const current = (draftLocationBlackouts[locName] || []).filter((d) => !draftDarkDays.includes(d));
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setDraftLocationBlackouts({ ...draftLocationBlackouts, [locName]: next });
  };

  // Dark day toggles
  const handleToggleDarkDay = (day: number) => {
    const isAddingDark = !draftDarkDays.includes(day);
    const nextDark = isAddingDark
      ? [...draftDarkDays, day].sort((a, b) => a - b)
      : draftDarkDays.filter((d) => d !== day);
    setDraftDarkDays(nextDark);

    if (isAddingDark) {
      // Clean up actor and location blackouts for this newly dark day
      const updatedActorBlackouts: Record<string, number[]> = {};
      Object.entries(draftActorBlackouts).forEach(([aid, bDays]) => {
        updatedActorBlackouts[aid] = (bDays || []).filter((d) => d !== day);
      });
      setDraftActorBlackouts(updatedActorBlackouts);
      setActors((prev) =>
        prev.map((a) => ({
          ...a,
          blackout_days: (a.blackout_days || []).filter((d) => d !== day),
        }))
      );

      const updatedLocBlackouts: Record<string, number[]> = {};
      Object.entries(draftLocationBlackouts).forEach(([loc, bDays]) => {
        updatedLocBlackouts[loc] = (bDays || []).filter((d) => d !== day);
      });
      setDraftLocationBlackouts(updatedLocBlackouts);

      // Release any scene locks pinned to this dark day
      setScenes((prev) =>
        prev.map((s) => (s.locked_day === day ? { ...s, locked_day: null } : s))
      );
    }
  };

  // Save full official plan
  const handleSavePlan = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const syncedActors = actors.map((a) => ({
        ...a,
        blackout_days: draftActorBlackouts[a.actor_id] ?? a.blackout_days ?? [],
      }));
      const res = await updateProductionPlan({
        scenes,
        actors: syncedActors,
        actor_blackouts: draftActorBlackouts,
        location_blackouts: draftLocationBlackouts,
        dark_days: draftDarkDays,
        start_date: draftStartDate,
        w_turnaround: draftTurnaround,
        max_minutes_per_day: draftMaxMinutes,
        permit_lead_days: draftPermitLeadDays,
      });
      onPlanSaved(res);
      onClose();
    } catch (err: any) {
      console.error('Failed to save official plan', err);
      setStatusMessage(err.message || 'Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border-2 border-indigo-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-tight">Production Plan Editor</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Official Ground Truth
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Populated from Current Board ({scenes.length} Scenes, {days.length} Days)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modify baseline ground truth: script scenes, contract blackouts, permit windows, and schedule calendar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-2 shrink-0 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cast')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'cast'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cast & Contract Blackouts ({actors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'locations'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations & Permits ({locations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar & Dark Days</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {statusMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* TAB: CAST & CONTRACT BLACKOUTS */}
          {activeTab === 'cast' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Talent Roster & Contractual Blackouts
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Current actors populated from production. Modify names, rates, and mark contractual blackout days where talent cannot shoot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddActor}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-300" />
                  <span>+ Add Cast Member</span>
                </button>
              </div>

              {/* Hiatus & Calendar Integration Notice */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-200">
                  <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    Calendar Start: <strong className="text-white font-mono">{draftStartDate}</strong> ({getFormattedDate(draftStartDate, 1)})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-indigo-300">
                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {draftDarkDays.length > 0
                      ? `${draftDarkDays.length} Production Dark Day(s) Scheduled (Days ${draftDarkDays.join(', ')})`
                      : 'No production dark days configured'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {actors.map((act) => {
                  const blackouts = (draftActorBlackouts && draftActorBlackouts[act.actor_id]) || act.blackout_days || [];
                  const dood = actorDoodMap.get(act.actor_id);
                  return (
                    <div
                      key={act.actor_id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div>
                            <input
                              type="text"
                              value={act.name}
                              onChange={(e) => handleUpdateActor(act.actor_id, 'name', e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-sm text-white font-bold focus:outline-none focus:border-purple-500 w-44"
                              placeholder="Actor Name"
                            />
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-slate-500">as</span>
                              <input
                                type="text"
                                value={act.character_name}
                                onChange={(e) => handleUpdateActor(act.actor_id, 'character_name', e.target.value)}
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500 w-36"
                                placeholder="Character Name"
                              />
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span>Day $:</span>
                              <input
                                type="number"
                                step={100}
                                value={act.daily_rate}
                                onChange={(e) => handleUpdateActor(act.actor_id, 'daily_rate', Number(e.target.value))}
                                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-emerald-300 font-mono w-20 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Hold $:</span>
                              <input
                                type="number"
                                step={100}
                                value={act.hold_rate}
                                onChange={(e) => handleUpdateActor(act.actor_id, 'hold_rate', Number(e.target.value))}
                                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono w-20 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            {dood && (
                              <span className="text-emerald-400 text-[10px] hidden sm:inline ml-1">
                                (Board: {dood.work_days}W / {dood.hold_days}H = ${(dood.talent_cost ?? 0).toLocaleString()})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs text-amber-400 font-mono">
                            {blackouts.length > 0
                              ? `${blackouts.length} contract blackout day(s)`
                              : 'Fully available'}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteActor(act.actor_id)}
                            className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-950/30 transition-all cursor-pointer"
                            title="Remove Actor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Day Grid Picker with Dark Day & Calendar Integration */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] text-slate-400 font-medium">
                          Toggle Contract Blackout Days (Day 1 - {totalDays}):
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {allDays.map((d) => {
                            const isDark = draftDarkDays.includes(d);
                            const isBlackout = !isDark && blackouts.includes(d);
                            const dateStr = getFormattedDate(draftStartDate, d);
                            return (
                              <button
                                key={d}
                                type="button"
                                disabled={isDark}
                                onClick={() => handleToggleActorBlackout(act.actor_id, d)}
                                className={`min-w-[34px] h-8 px-1 rounded border text-[11px] font-bold transition-all flex flex-col items-center justify-center select-none ${
                                  isDark
                                    ? 'bg-indigo-950/40 text-indigo-400/50 border-indigo-900/50 cursor-not-allowed opacity-60 shadow-none'
                                    : isBlackout
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-900/40 ring-1 ring-rose-400 cursor-pointer hover:bg-rose-500'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white cursor-pointer'
                                }`}
                                title={
                                  isDark
                                    ? `Day ${d} (${dateStr}): Production Dark Day (Hiatus) — Set is closed, filming suspended. Blackouts cannot be assigned to dark days.`
                                    : isBlackout
                                    ? `Day ${d} (${dateStr}): Contract Blackout (Actor Off) — Click to remove`
                                    : `Day ${d} (${dateStr}): Available for Call — Click to toggle blackout`
                                }
                              >
                                <span className={`leading-tight ${isDark ? 'line-through text-indigo-400/50' : ''}`}>{d}</span>
                                {isDark && (
                                  <span className="text-[7.5px] uppercase font-mono tracking-tighter text-indigo-400/70 font-extrabold leading-none">
                                    DARK
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" /> Contract Blackout
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-950/60 border border-indigo-900/60 inline-block opacity-60" /> Production Dark Day (Hiatus - Disabled)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-800 inline-block" /> Available for Call
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LOCATIONS & PERMITS */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Locations & City Permit Blackouts
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Locations populated from active board. Configure municipal permit blackout days.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLocationInput}
                    onChange={(e) => setNewLocationInput(e.target.value)}
                    placeholder="New Location Name..."
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500 w-44"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLocation(newLocationInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddLocation(newLocationInput)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/50 text-sky-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Permit</span>
                  </button>
                </div>
              </div>

              {/* Hiatus & Calendar Integration Notice */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-200">
                  <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Calendar Start: <strong className="text-white font-mono">{draftStartDate}</strong> ({getFormattedDate(draftStartDate, 1)})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-indigo-300">
                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {draftDarkDays.length > 0
                      ? `${draftDarkDays.length} Production Dark Day(s) Scheduled (Days ${draftDarkDays.join(', ')})`
                      : 'No production dark days configured'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {locations.map((loc) => {
                  const blackouts = (draftLocationBlackouts && draftLocationBlackouts[loc]) || [];
                  const locScenes = scenes.filter((s) => s.location === loc);
                  const activeDays = locationActiveDaysMap.get(loc) || [];
                  return (
                    <div
                      key={loc}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-sky-400" />
                            <span>{loc}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-3">
                            <span>{locScenes.length} scenes scheduled</span>
                            {activeDays.length > 0 && (
                              <span className="text-sky-300">
                                Active on Board: {activeDays.map((d) => `Day ${d}`).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-sky-400 font-mono">
                          {blackouts.length > 0
                            ? `${blackouts.length} blackout day(s)`
                            : 'All days permitted'}
                        </div>
                      </div>

                      {/* Day Grid Picker with Dark Day & Calendar Integration */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] text-slate-400 font-medium">
                          Toggle Location Blackout Days (Day 1 - {totalDays}):
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {allDays.map((d) => {
                            const isDark = draftDarkDays.includes(d);
                            const isBlackout = !isDark && blackouts.includes(d);
                            const dateStr = getFormattedDate(draftStartDate, d);
                            return (
                              <button
                                key={d}
                                type="button"
                                disabled={isDark}
                                onClick={() => handleToggleLocationBlackout(loc, d)}
                                className={`min-w-[34px] h-8 px-1 rounded border text-[11px] font-bold transition-all flex flex-col items-center justify-center select-none ${
                                  isDark
                                    ? 'bg-indigo-950/40 text-indigo-400/50 border-indigo-900/50 cursor-not-allowed opacity-60 shadow-none'
                                    : isBlackout
                                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm shadow-sky-900/40 ring-1 ring-sky-400 cursor-pointer hover:bg-sky-500'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white cursor-pointer'
                                }`}
                                title={
                                  isDark
                                    ? `Day ${d} (${dateStr}): Production Dark Day (Hiatus) — Production suspended. Permit blackouts cannot be applied to dark days.`
                                    : isBlackout
                                    ? `Day ${d} (${dateStr}): Permit Blackout (Location Closed) — Click to remove`
                                    : `Day ${d} (${dateStr}): Filming Permitted — Click to toggle permit blackout`
                                }
                              >
                                <span className={`leading-tight ${isDark ? 'line-through text-indigo-400/50' : ''}`}>{d}</span>
                                {isDark && (
                                  <span className="text-[7.5px] uppercase font-mono tracking-tighter text-indigo-400/70 font-extrabold leading-none">
                                    DARK
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block" /> Municipal Permit Blackout
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-950/60 border border-indigo-900/60 inline-block opacity-60" /> Production Dark Day (Hiatus - Disabled)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-800 inline-block" /> Filming Permitted
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CALENDAR & DARK DAYS */}
          {activeTab === 'calendar' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Production Calendar & Dark Days
                </h4>
                <p className="text-[11px] text-slate-400">
                  Manage the calendar start date anchor and planned hiatus days (weekends, holidays, union dark days).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      Start Date (Day 1)
                    </span>
                    <span className="text-purple-300 font-mono font-bold text-xs">{draftStartDate}</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Dual Hollywood calendar anchor. All shoot day dates and call sheets recalculate from Day 1.
                  </p>
                  <input
                    type="date"
                    value={draftStartDate}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                  />
                </div>

                {/* Turnaround Penalty Rate */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      SAG-AFTRA Turnaround Penalty
                    </span>
                    <span className="text-amber-400 font-mono font-bold text-xs">
                      ${(draftTurnaround || 25000).toLocaleString()} / violation
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Penalty assessed for violating mandatory 12-hour crew overnight rest window.
                  </p>
                  <input
                    type="range"
                    min={1000}
                    max={50000}
                    step={1000}
                    value={draftTurnaround}
                    onChange={(e) => setDraftTurnaround(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Dark Days Grid */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                {/* Dark Day Film Policy Explainer */}
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5 shadow-sm">
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-indigo-300">
                      What happens when you declare a Dark Day (Hiatus)?
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      In film production, a <strong>Dark Day</strong> is a mandatory full-company hiatus (e.g. SAG-AFTRA 7th-day rest, legal holiday, or travel day). <strong>Zero filming is scheduled</strong>. Any scenes currently on that day are automatically cleared, and their cast and locations are relieved from call. Hard day locks on that day are automatically released so CP-SAT can route those scenes to the best available shoot days.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                      Pre-Planned Hiatus / Dark Days Calendar
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Zero filming will be scheduled on marked dark days. Camera roll will pause.
                    </p>
                  </div>
                  <span className="text-xs text-indigo-400 font-mono">
                    {draftDarkDays.length} dark day(s) scheduled
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {allDays.map((d) => {
                    const isDark = draftDarkDays.includes(d);
                    const dateStr = getFormattedDate(draftStartDate, d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleToggleDarkDay(d)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isDark
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-300'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                        title={isDark ? `Day ${d} (${dateStr}): Scheduled Hiatus (Dark Day)` : `Day ${d} (${dateStr}): Shooting Day`}
                      >
                        <Moon className={`w-3 h-3 ${isDark ? 'text-white' : 'text-slate-600'}`} />
                        <span>Day {d}</span>
                        {dateStr && <span className={`text-[10px] font-normal ${isDark ? 'text-indigo-200' : 'text-slate-500'}`}>• {dateStr}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Cross-Tab Sync Summary */}
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-purple-300">
                    <Users className="w-3.5 h-3.5" />
                    <span>{actors.filter((a) => ((draftActorBlackouts && draftActorBlackouts[a.actor_id]) || []).length > 0).length} Cast Members with Contract Blackouts</span>
                  </span>
                  <span className="flex items-center gap-1 text-sky-300">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{locations.filter((loc) => ((draftLocationBlackouts && draftLocationBlackouts[loc]) || []).length > 0).length} Locations with Permit Blackouts</span>
                  </span>
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Moon className="w-3.5 h-3.5" />
                    <span>{draftDarkDays.length} Dark Days (Cast & Crew Hiatus)</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-400">
            Official plan updates are saved as ground truth. Click <strong className="text-emerald-400">"⚡ Optimize Schedule"</strong> on the board when ready to solve.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSavePlan}
              disabled={isSubmitting || isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Official Plan...' : 'Save Official Plan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
