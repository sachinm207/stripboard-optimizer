import React, { useState, useEffect } from 'react';
import {
  History,
  Save,
  RotateCcw,
  Trash2,
  X,
  Plus,
  ArrowRight,
  AlertTriangle,
  Users,
  MapPin,
  Moon,
  Flame,
  CheckCircle2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  ConstraintVersion,
  ConstraintDiffResult,
  ScheduleSolution,
} from '../types';
import {
  fetchVersions,
  saveVersion,
  restoreVersion,
  deleteVersion,
  diffVersions,
} from '../services/api';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVersionRestored: (newSolution: ScheduleSolution) => void;
  currentSolution: ScheduleSolution | null;
}

export const VersionModal: React.FC<VersionModalProps> = ({
  isOpen,
  onClose,
  onVersionRestored,
  currentSolution,
}) => {
  const [versions, setVersions] = useState<ConstraintVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New version creation
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Diff comparison states
  const [baseVersionId, setBaseVersionId] = useState<string>('');
  const [targetVersionId, setTargetVersionId] = useState<string>('current_wip');
  const [diffResult, setDiffResult] = useState<ConstraintDiffResult | null>(null);
  const [isDiffing, setIsDiffing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'dark_days' | 'actors' | 'locations' | 'chaos'>('dark_days');

  const loadVersionsList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchVersions();
      setVersions(data);
      if (data.length > 0 && !baseVersionId) {
        setBaseVersionId(data[0].version_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load constraint versions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVersionsList();
    }
  }, [isOpen]);

  const runDiff = async (baseId: string, targetId: string) => {
    if (!baseId || !targetId) return;
    try {
      setIsDiffing(true);
      setError(null);
      const result = await diffVersions(baseId, targetId);
      setDiffResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute constraint diff');
    } finally {
      setIsDiffing(false);
    }
  };

  useEffect(() => {
    if (isOpen && baseVersionId && targetVersionId) {
      runDiff(baseVersionId, targetVersionId);
    }
  }, [isOpen, baseVersionId, targetVersionId]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSolution) return;
    try {
      setIsSaving(true);
      setError(null);
      const created = await saveVersion(
        newLabel.trim() || undefined,
        newNotes.trim() || undefined
      );
      setNewLabel('');
      setNewNotes('');
      await loadVersionsList();
      setTargetVersionId(created.version_id);
    } catch (err: any) {
      setError(err.message || 'Failed to save constraint version');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (versionId: string, label: string) => {
    const confirmMsg = `Restore hard constraints from "${label}"? This will reapply the saved dark days, actor/location blackouts, and chaos disruptions.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      setError(null);
      const restoredSolution = await restoreVersion(versionId);
      onVersionRestored(restoredSolution);
      await loadVersionsList();
      runDiff(versionId, 'current_wip');
    } catch (err: any) {
      setError(err.message || 'Failed to restore constraints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!window.confirm('Delete this saved constraint version?')) return;
    try {
      setError(null);
      await deleteVersion(versionId);
      await loadVersionsList();
      if (baseVersionId === versionId) {
        setBaseVersionId(versions[0]?.version_id || '');
      }
      if (targetVersionId === versionId) {
        setTargetVersionId('current_wip');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete version');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[94vh] bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  HARD CONSTRAINTS VERSION CONTROL & DIFF
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {versions.length} Saved Snapshots
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track and compare changes to <strong>hard constraints only</strong>: Preplanned company dark days, actor contract blackouts, location permit freezes, and sudden chaos disruptions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Left Column: Version History List & Snapshot Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* Create Snapshot Form */}
            <form
              onSubmit={handleCreateVersion}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 shadow-inner shrink-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Snapshot Current Hard Constraints</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  v{versions.length + 1}
                </span>
              </div>
              <input
                type="text"
                placeholder="e.g., Added Day 3 Hiatus & Sarah Blackout"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Optional notes or reason for constraint change..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Snapshot...' : 'Save Current Constraints as Version'}</span>
              </button>
            </form>

            {/* Saved Versions List */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Saved Versions</span>
                <span className="text-[11px] text-slate-500 font-normal">Select below to inspect</span>
              </div>

              {/* Current Work In Progress Item */}
              <div
                onClick={() => setTargetVersionId('current_wip')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  targetVersionId === 'current_wip'
                    ? 'bg-purple-950/40 border-purple-500/70 shadow-md ring-1 ring-purple-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-bold text-xs text-amber-300">Current Work In Progress (WIP)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Live Working State
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                  <span>🌙 Dark: {(currentSolution?.dark_days || []).length} days</span>
                  <span>🚫 Actor Blackouts: {Object.keys(currentSolution?.actor_blackouts || {}).length}</span>
                  <span>🚨 Chaos: {(currentSolution?.disruptions_applied || []).length}</span>
                </div>
              </div>

              {/* Saved Version Cards */}
              {versions.map((v) => {
                const isBase = baseVersionId === v.version_id;
                const isTarget = targetVersionId === v.version_id;
                const isInitial = v.version_number === 1;

                return (
                  <div
                    key={v.version_id}
                    className={`p-3 rounded-xl border transition-all ${
                      isTarget
                        ? 'bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/20'
                        : isBase
                        ? 'bg-sky-950/20 border-sky-500/50'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            v{v.version_number}
                          </span>
                          <span className="font-bold text-xs text-white">{v.label}</span>
                          {isInitial && (
                            <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Baseline
                            </span>
                          )}
                        </div>
                        {v.notes && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{v.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestore(v.version_id, v.label)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="Restore hard constraints to this version"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        {!isInitial && (
                          <button
                            type="button"
                            onClick={() => handleDelete(v.version_id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete this version"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px]">
                      <div className="flex items-center gap-2.5 text-slate-400 text-[10px]">
                        <span>🌙 {v.dark_days.length} Dark Days</span>
                        <span>🚫 {Object.keys(v.actor_blackouts).length} Actors Off</span>
                        <span>🚨 {v.active_disruptions.length} Chaos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setBaseVersionId(v.version_id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            isBase
                              ? 'bg-sky-500 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isBase ? 'Base [A]' : 'Set Base'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetVersionId(v.version_id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            isTarget
                              ? 'bg-purple-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isTarget ? 'Compare [B]' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Hard Constraints Diff Inspector (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Version Diff Selector Bar */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-[11px] font-bold text-sky-400 shrink-0">Base [A]:</span>
                <select
                  value={baseVersionId}
                  onChange={(e) => setBaseVersionId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {versions.map((v) => (
                    <option key={v.version_id} value={v.version_id}>
                      v{v.version_number}: {v.label}
                    </option>
                  ))}
                  <option value="current_wip">Current Work In Progress (WIP)</option>
                </select>
              </div>

              <div className="flex items-center justify-center px-1 text-slate-500">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-[11px] font-bold text-purple-400 shrink-0">Compare [B]:</span>
                <select
                  value={targetVersionId}
                  onChange={(e) => setTargetVersionId(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="current_wip">Current Work In Progress (WIP)</option>
                  {versions.map((v) => (
                    <option key={v.version_id} value={v.version_id}>
                      v{v.version_number}: {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Changes Metric Summary Bar */}
            {diffResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                {/* Total Changes */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Total Constraints Shift</div>
                  <div className="text-base font-black font-mono mt-1 text-white">
                    {diffResult.total_changes_count} changes
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {diffResult.total_changes_count === 0 ? 'Identical hard rules' : 'Hard rules modified'}
                  </div>
                </div>

                {/* Dark Days Added / Removed */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Company Off Days</span>
                    <Moon className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="text-sm font-black font-mono mt-1 text-indigo-300">
                    +{diffResult.dark_days_added.length} / -{diffResult.dark_days_removed.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {diffResult.dark_days_added.length > 0
                      ? `Added: ${diffResult.dark_days_added.map((d) => `D${d}`).join(', ')}`
                      : 'No dark days added'}
                  </div>
                </div>

                {/* Actor Blackouts */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Actor Off Days</span>
                    <Users className="w-3 h-3 text-rose-400" />
                  </div>
                  <div className="text-sm font-black font-mono mt-1 text-rose-300">
                    {diffResult.actor_blackouts_diff.length} Actors Changed
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Contract blackouts
                  </div>
                </div>

                {/* Sudden Chaos */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Sudden Chaos</span>
                    <Flame className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-sm font-black font-mono mt-1 text-amber-300">
                    {diffResult.chaos_disruptions_diff.length} Disruptions
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Emergency injections
                  </div>
                </div>
              </div>
            )}

            {/* Category Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategory('dark_days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'dark_days'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>🌙 Company Off Days</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {(diffResult?.dark_days_added.length || 0) + (diffResult?.dark_days_removed.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('actors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'actors'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>🎭 Actor Off Days</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {diffResult?.actor_blackouts_diff.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('locations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'locations'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>📍 Location Off Days</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {diffResult?.location_blackouts_diff.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('chaos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'chaos'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>🚨 Sudden Chaos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {diffResult?.chaos_disruptions_diff.length || 0}
                </span>
              </button>
            </div>

            {/* Granular Diff Inspector Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {isDiffing ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Comparing hard constraints...</span>
                </div>
              ) : !diffResult ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Select two constraint versions above to inspect differences.
                </div>
              ) : (
                <>
                  {/* CATEGORY 1: COMPANY PREPLANNED DARK DAYS */}
                  {activeCategory === 'dark_days' && (
                    <div className="space-y-3">
                      {diffResult.dark_days_added.length === 0 && diffResult.dark_days_removed.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No company preplanned dark day differences between these versions.</span>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-400" />
                            <span>Pre-Planned Dark Days (Company Hiatus / Festivals / Rest Days)</span>
                          </div>

                          {diffResult.dark_days_added.length > 0 && (
                            <div className="flex items-start gap-2.5 text-xs text-indigo-200">
                              <span className="px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                                + Added Off Days:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {diffResult.dark_days_added.map((d) => (
                                  <span
                                    key={d}
                                    className="px-2.5 py-1 rounded bg-indigo-950 border border-indigo-600 font-mono font-bold text-xs shadow-sm"
                                  >
                                    🌙 Day {d} (Marked Dark Day)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {diffResult.dark_days_removed.length > 0 && (
                            <div className="flex items-start gap-2.5 text-xs text-emerald-200 pt-2 border-t border-slate-800/60">
                              <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                                - Reopened for Shoot:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {diffResult.dark_days_removed.map((d) => (
                                  <span
                                    key={d}
                                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-slate-300 text-xs"
                                  >
                                    🎬 Day {d} (Hiatus Removed)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CATEGORY 2: ACTOR PREPLANNED OFF DAYS */}
                  {activeCategory === 'actors' && (
                    <div className="space-y-2.5">
                      {diffResult.actor_blackouts_diff.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No actor contract blackouts or off-day differences between these versions.</span>
                        </div>
                      ) : (
                        diffResult.actor_blackouts_diff.map((ab) => (
                          <div
                            key={ab.actor_id}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-xs text-white flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-rose-400" />
                                <span>{ab.actor_name}</span>
                                <span className="text-[10px] text-slate-500 font-mono font-normal">
                                  ({ab.actor_id})
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800/60">
                              {ab.added_off_days.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-rose-300">
                                    + Newly Blacked Out (Unavailable):
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {ab.added_off_days.map((d) => (
                                      <span
                                        key={d}
                                        className="px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-200 font-mono font-bold text-[11px]"
                                      >
                                        🚫 Day {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {ab.removed_off_days.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-emerald-300">
                                    - Blackout Cleared (Now Available):
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {ab.removed_off_days.map((d) => (
                                      <span
                                        key={d}
                                        className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-200 font-mono font-bold text-[11px]"
                                      >
                                        ✓ Day {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* CATEGORY 3: LOCATION PREPLANNED OFF DAYS */}
                  {activeCategory === 'locations' && (
                    <div className="space-y-2.5">
                      {diffResult.location_blackouts_diff.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No location permit blackouts or off-day differences between these versions.</span>
                        </div>
                      ) : (
                        diffResult.location_blackouts_diff.map((lb) => (
                          <div
                            key={lb.location}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-white flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                <span>{lb.location}</span>
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-800/60">
                              {lb.added_off_days.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-amber-300">
                                    + Permit Freeze (No Filming):
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {lb.added_off_days.map((d) => (
                                      <span
                                        key={d}
                                        className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-200 font-mono font-bold text-[11px]"
                                      >
                                        🚫 Day {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {lb.removed_off_days.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-emerald-300">
                                    - Permit Cleared (Filming Permitted):
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {lb.removed_off_days.map((d) => (
                                      <span
                                        key={d}
                                        className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-200 font-mono font-bold text-[11px]"
                                      >
                                        ✓ Day {d}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* CATEGORY 4: SUDDEN CHAOS & DISRUPTIONS */}
                  {activeCategory === 'chaos' && (
                    <div className="space-y-2.5">
                      {diffResult.chaos_disruptions_diff.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No sudden emergency disruptions or chaos injections difference between these versions.</span>
                        </div>
                      ) : (
                        diffResult.chaos_disruptions_diff.map((cd) => (
                          <div
                            key={cd.alert_id}
                            className={`p-3.5 rounded-xl border space-y-1.5 ${
                              cd.change_type === 'added'
                                ? 'bg-rose-950/30 border-rose-700/60'
                                : 'bg-slate-950/40 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    cd.change_type === 'added'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {cd.change_type === 'added' ? '+ Chaos Added' : '- Chaos Removed'}
                                </span>
                                <span className="font-bold text-xs text-white flex items-center gap-1.5">
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                  <span>{cd.disruption_type}</span>
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-amber-300">
                                Affected: {cd.affected_days.map((d) => `Day ${d}`).join(', ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300">{cd.reason}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-purple-400" />
            <span>
              This diff captures user-modified hard constraints only (preplanned dark days, actor/location blackouts, and throw chaos disruptions).
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
