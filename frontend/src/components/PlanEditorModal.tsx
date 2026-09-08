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
} from 'lucide-react';
import { Scene, Actor, DaySchedule, ScheduleSolution, ActorDOODRow } from '../types';
import { updateProductionPlan, fetchProductionSettings, fetchScenes, fetchActors } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'scenes' | 'cast' | 'locations' | 'calendar'>('scenes');

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
      setDraftActorBlackouts(JSON.parse(JSON.stringify(actorBlackouts || {})));
      setDraftLocationBlackouts(JSON.parse(JSON.stringify(locationBlackouts || {})));
      setDraftDarkDays([...(darkDays || [])]);

      // 4. Load latest settings directly from backend
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

  // Pre-calculate which day each scene is currently scheduled on the active stripboard
  const sceneScheduledDayMap = useMemo(() => {
    const map = new Map<string, DaySchedule>();
    if (days && days.length > 0) {
      for (const d of days) {
        for (const sc of (d.scenes || [])) {
          map.set(sc.scene_id, d);
        }
      }
    }
    return map;
  }, [days]);

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
    return Array.from(set).sort();
  }, [scenes, draftLocationBlackouts]);

  const totalDays = Math.max(numDays || 5, (days || []).length, 5);
  const allDays = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Scene editing helpers
  const handleUpdateScene = (idx: number, field: keyof Scene, value: any) => {
    const updated = [...scenes];
    updated[idx] = { ...updated[idx], [field]: value };
    setScenes(updated);
  };

  const handleDeleteScene = (idx: number) => {
    const updated = scenes.filter((_, i) => i !== idx);
    setScenes(updated);
  };

  const handleAddScene = () => {
    const nextNum = scenes.length > 0 ? (Math.max(...scenes.map((s) => parseInt(s.scene_number) || 0)) + 1).toString() : '1';
    const newSc: Scene = {
      scene_id: `SC_${nextNum.padStart(2, '0')}`,
      scene_number: nextNum,
      slugline: `INT. NEW STAGE - DAY`,
      setting: 'INT_DAY' as any,
      location: locations[0] || 'Studio Soundstage',
      pages_eighths: 8,
      est_shoot_minutes: 120,
      cast_ids: actors.length > 0 ? [actors[0].actor_id] : [],
      description: 'New script revision scene',
      locked_day: null,
    };
    setScenes([...scenes, newSc]);
  };

  const handleToggleSceneCast = (sceneIdx: number, actorId: string) => {
    const sc = scenes[sceneIdx];
    if (!sc) return;
    const currentCast = sc.cast_ids || [];
    const cast = currentCast.includes(actorId)
      ? currentCast.filter((id) => id !== actorId)
      : [...currentCast, actorId];
    handleUpdateScene(sceneIdx, 'cast_ids', cast);
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
    const current = draftActorBlackouts[actorId] || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setDraftActorBlackouts({ ...draftActorBlackouts, [actorId]: next });
  };

  // Location blackout toggles
  const handleToggleLocationBlackout = (locName: string, day: number) => {
    const current = draftLocationBlackouts[locName] || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setDraftLocationBlackouts({ ...draftLocationBlackouts, [locName]: next });
  };

  // Dark day toggles
  const handleToggleDarkDay = (day: number) => {
    const next = draftDarkDays.includes(day)
      ? draftDarkDays.filter((d) => d !== day)
      : [...draftDarkDays, day].sort((a, b) => a - b);
    setDraftDarkDays(next);
  };

  // Save full official plan
  const handleSavePlan = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await updateProductionPlan({
        scenes,
        actors,
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
            onClick={() => setActiveTab('scenes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'scenes'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Scenes & Script ({scenes.length})</span>
          </button>

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

          {/* TAB 1: SCENES & SCRIPT BREAKDOWN */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Shooting Script Scenes</h4>
                  <p className="text-[11px] text-slate-400">
                    Existing scenes from current stripboard. Modify durations, lighting settings, cast calls, and locked days.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-400 font-mono">
                    Total Duration:{' '}
                    <span className="text-amber-400 font-bold">
                      {Math.round(scenes.reduce((acc, s) => acc + s.est_shoot_minutes, 0) / 60)} hrs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddScene}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-300" />
                    <span>+ Add Scene</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {scenes.map((sc, idx) => {
                  const scheduledDay = sceneScheduledDayMap.get(sc.scene_id);
                  return (
                    <div
                      key={sc.scene_id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                            Scene {sc.scene_number}
                          </span>
                          <input
                            type="text"
                            value={sc.slugline}
                            onChange={(e) => handleUpdateScene(idx, 'slugline', e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 min-w-[280px]"
                          />
                          {/* Live Scheduled Day Tag */}
                          {scheduledDay && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Board: Day {scheduledDay.day_number}{scheduledDay.date_display ? ` (${scheduledDay.date_display})` : ''}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {/* Setting Pill */}
                          <select
                            value={sc.setting}
                            onChange={(e) => handleUpdateScene(idx, 'setting', e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="INT_DAY">INT DAY</option>
                            <option value="EXT_DAY">EXT DAY</option>
                            <option value="INT_NIGHT">INT NIGHT</option>
                            <option value="EXT_NIGHT">EXT NIGHT</option>
                          </select>

                          {/* Location */}
                          <input
                            type="text"
                            value={sc.location}
                            onChange={(e) => handleUpdateScene(idx, 'location', e.target.value)}
                            placeholder="Location"
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-36"
                          />

                          {/* Est Minutes */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <input
                              type="number"
                              min={15}
                              step={15}
                              value={sc.est_shoot_minutes}
                              onChange={(e) => handleUpdateScene(idx, 'est_shoot_minutes', Number(e.target.value))}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-indigo-500 w-16"
                            />
                            <span className="text-[10px] text-slate-500">min</span>
                          </div>

                          {/* Hard Pin to Day Lock */}
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-2 py-1">
                            {sc.locked_day ? (
                              <Lock className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Unlock className="w-3 h-3 text-slate-500" />
                            )}
                            <select
                              value={sc.locked_day || ''}
                              onChange={(e) =>
                                handleUpdateScene(idx, 'locked_day', e.target.value ? Number(e.target.value) : null)
                              }
                              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                            >
                              <option value="">Flexible (Auto)</option>
                              {allDays.map((d) => (
                                <option key={d} value={d}>
                                  Lock Day {d}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Delete Scene Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteScene(idx)}
                            className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-950/30 transition-all cursor-pointer ml-0.5"
                            title="Delete Scene from Script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Cast required chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900 text-xs">
                        <span className="text-[11px] text-slate-400 mr-1">Cast Required:</span>
                        {actors.map((act) => {
                          const isCast = (sc.cast_ids || []).includes(act.actor_id);
                          return (
                            <button
                              key={act.actor_id}
                              type="button"
                              onClick={() => handleToggleSceneCast(idx, act.actor_id)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                                isCast
                                  ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {act.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CAST & CONTRACT BLACKOUTS */}
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

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {actors.map((act) => {
                  const blackouts = (draftActorBlackouts && draftActorBlackouts[act.actor_id]) || [];
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

                      {/* Day Grid Picker */}
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium mb-1.5">
                          Toggle Contract Blackout Days (Day 1 - {totalDays}):
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {allDays.map((d) => {
                            const isBlackout = blackouts.includes(d);
                            const daySched = days.find((day) => day.day_number === d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleToggleActorBlackout(act.actor_id, d)}
                                className={`w-8 h-7 rounded border text-[11px] font-bold transition-all cursor-pointer ${
                                  isBlackout
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-900/40'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                                title={
                                  isBlackout
                                    ? `Day ${d}${daySched?.date_display ? ` (${daySched.date_display})` : ''}: Contract Blackout`
                                    : `Day ${d}${daySched?.date_display ? ` (${daySched.date_display})` : ''}: Available`
                                }
                              >
                                {d}
                              </button>
                            );
                          })}
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

                      {/* Day Grid Picker */}
                      <div>
                        <div className="text-[11px] text-slate-400 font-medium mb-1.5">
                          Toggle Location Blackout Days (Day 1 - {totalDays}):
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {allDays.map((d) => {
                            const isBlackout = blackouts.includes(d);
                            const daySched = days.find((day) => day.day_number === d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleToggleLocationBlackout(loc, d)}
                                className={`w-8 h-7 rounded border text-[11px] font-bold transition-all cursor-pointer ${
                                  isBlackout
                                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm shadow-sky-900/40'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                                }`}
                                title={
                                  isBlackout
                                    ? `Day ${d}${daySched?.date_display ? ` (${daySched.date_display})` : ''}: Location Unavailable`
                                    : `Day ${d}${daySched?.date_display ? ` (${daySched.date_display})` : ''}: Permitted`
                                }
                              >
                                {d}
                              </button>
                            );
                          })}
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
                    const daySched = days.find((day) => day.day_number === d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleToggleDarkDay(d)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          isDark
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                        title={isDark ? `Day ${d}: Scheduled Hiatus` : `Day ${d}: Shooting Day`}
                      >
                        Day {d}{daySched?.date_display ? ` (${daySched.date_display})` : ''}
                      </button>
                    );
                  })}
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
