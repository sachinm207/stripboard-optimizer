import React, { useState, useEffect } from 'react';
import {
  History,
  GitCompare,
  Save,
  RotateCcw,
  Trash2,
  X,
  Plus,
  ArrowRight,
  AlertTriangle,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ScheduleVersion,
  VersionDiffResult,
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
  const [versions, setVersions] = useState<ScheduleVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New version creation inputs
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Diff comparison states
  const [baseVersionId, setBaseVersionId] = useState<string>('');
  const [targetVersionId, setTargetVersionId] = useState<string>('current_wip');
  const [diffResult, setDiffResult] = useState<VersionDiffResult | null>(null);
  const [isDiffing, setIsDiffing] = useState(false);
  const [activeDiffTab, setActiveDiffTab] = useState<'scenes' | 'actors' | 'locations' | 'dark_days'>('scenes');

  // Load versions
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
      setError(err.message || 'Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVersionsList();
    }
  }, [isOpen]);

  // Compute diff when base or target changes
  const runDiff = async (baseId: string, targetId: string) => {
    if (!baseId || !targetId) return;
    try {
      setIsDiffing(true);
      setError(null);
      const result = await diffVersions(baseId, targetId);
      setDiffResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute diff');
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
      // Auto select newly created version for diffing
      setTargetVersionId(created.version_id);
    } catch (err: any) {
      setError(err.message || 'Failed to save version snapshot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (versionId: string, label: string) => {
    const confirmMsg = `Are you sure you want to restore "${label}"? This will replace the current working schedule.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      setError(null);
      const restoredSolution = await restoreVersion(versionId);
      onVersionRestored(restoredSolution);
      await loadVersionsList();
      runDiff(versionId, 'current_wip');
    } catch (err: any) {
      setError(err.message || 'Failed to restore version');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!window.confirm('Delete this version snapshot?')) return;
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
      <div className="w-full max-w-6xl max-h-[94vh] bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  SCHEDULE VERSION CONTROL & DIFF EXPLORER
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {versions.length} Saved Versions
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Snapshot milestones, track changes in your work-in-progress, and compare actor DOOD, location shifts, and scene movements.
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

        {/* Modal Body: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Left Column: Version History List & Snapshot Form (4 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* Create Version Snapshot Form */}
            <form
              onSubmit={handleCreateVersion}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 shadow-inner shrink-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Snapshot Current Schedule as Version</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  v{versions.length + 1}
                </span>
              </div>
              <input
                type="text"
                placeholder="e.g., Post-Flood Reschedule / Director Cut"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Optional notes or rationale..."
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
                <span>{isSaving ? 'Creating Snapshot...' : 'Save Current State as New Version'}</span>
              </button>
            </form>

            {/* Saved Versions List */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Version Timeline</span>
                <span className="text-[11px] text-slate-500 font-normal">Newest on top</span>
              </div>

              {/* Current WIP Entry */}
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
                    Live Unsaved
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                  <span>Days: {currentSolution?.days.length || 0}</span>
                  <span>Cost: ${(currentSolution?.metrics.objective_cost || 0).toLocaleString()}</span>
                  <span>Moves: {currentSolution?.metrics.total_company_moves || 0}</span>
                </div>
              </div>

              {/* Saved Versions */}
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
                          title="Restore schedule to this version"
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
                      <div className="flex items-center gap-3 text-slate-400 font-mono">
                        <span>${v.total_cost.toLocaleString()}</span>
                        <span>{v.total_days} Days</span>
                        <span>{v.company_moves} Move{v.company_moves !== 1 ? 's' : ''}</span>
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

          {/* Right Column: Diff Comparison Inspector (7 cols) */}
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

            {/* Diff Result Summary Cards */}
            {diffResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                {/* Cost Delta */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Budget Cost</span>
                    <DollarSign className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="text-base font-black mt-1 flex items-center gap-1">
                    {diffResult.cost_delta > 0 ? (
                      <span className="text-rose-400 flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +${diffResult.cost_delta.toLocaleString()}
                      </span>
                    ) : diffResult.cost_delta < 0 ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        -${Math.abs(diffResult.cost_delta).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-mono">$0</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {diffResult.cost_delta > 0
                      ? 'Increased spend'
                      : diffResult.cost_delta < 0
                      ? 'Saved vs base'
                      : 'No net cost shift'}
                  </div>
                </div>

                {/* Company Moves Delta */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Company Moves</span>
                    <MapPin className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="text-base font-black font-mono mt-1 text-white">
                    {diffResult.moves_delta > 0
                      ? `+${diffResult.moves_delta}`
                      : diffResult.moves_delta}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {diffResult.moves_delta > 0
                      ? 'Additional moves'
                      : diffResult.moves_delta < 0
                      ? 'Fewer moves'
                      : 'Same move count'}
                  </div>
                </div>

                {/* Actor Hold Days Delta */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Hold Days</span>
                    <Users className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="text-base font-black font-mono mt-1 text-white">
                    {diffResult.hold_days_delta > 0
                      ? `+${diffResult.hold_days_delta}`
                      : diffResult.hold_days_delta}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {diffResult.hold_days_delta > 0
                      ? 'More idle hold days'
                      : diffResult.hold_days_delta < 0
                      ? 'Reduced actor hold'
                      : 'Same hold days'}
                  </div>
                </div>

                {/* Affected Actors / Days */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Impact Scope</span>
                    <Calendar className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="text-sm font-black mt-1 text-purple-300">
                    {diffResult.actor_changes.length} Actors / {diffResult.day_changes.length} Days
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {diffResult.location_changes.length} location shifts
                  </div>
                </div>
              </div>
            )}

            {/* Granular Diff Category Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveDiffTab('scenes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDiffTab === 'scenes'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>🎬 Day & Scene Movements</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {diffResult?.day_changes.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffTab('actors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDiffTab === 'actors'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>🎭 Actor DOOD Shifts</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {diffResult?.actor_changes.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDiffTab('locations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeDiffTab === 'locations'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>📍 Location Shifts</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60">
                  {diffResult?.location_changes.length || 0}
                </span>
              </button>
            </div>

            {/* Granular Diff Content Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {isDiffing ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Comparing schedule versions...</span>
                </div>
              ) : !diffResult ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Select two versions above to inspect detailed differences.
                </div>
              ) : (
                <>
                  {/* TAB 1: SCENE & DAY MOVEMENTS */}
                  {activeDiffTab === 'scenes' && (
                    <div className="space-y-2.5">
                      {diffResult.day_changes.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No scenes or shoot days moved between these two versions.</span>
                        </div>
                      ) : (
                        diffResult.day_changes.map((dc) => (
                          <div
                            key={dc.day_number}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                                  DAY {dc.day_number}
                                </span>
                                {dc.is_dark_after && !dc.is_dark_before && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                    Marked as Dark Day
                                  </span>
                                )}
                                {!dc.is_dark_after && dc.is_dark_before && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    Reopened from Dark Day
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                Duration: {Math.floor(dc.duration_before / 60)}h{dc.duration_before % 60}m ➔{' '}
                                <span className="text-white font-bold">
                                  {Math.floor(dc.duration_after / 60)}h{dc.duration_after % 60}m
                                </span>
                              </div>
                            </div>

                            {/* Scenes Added / Removed */}
                            <div className="space-y-1 text-xs">
                              {dc.scenes_added.length > 0 && (
                                <div className="flex items-center gap-2 text-emerald-300">
                                  <span className="font-bold text-[11px]">+ Added:</span>
                                  <span className="font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                                    {dc.scenes_added.join(', ')}
                                  </span>
                                </div>
                              )}
                              {dc.scenes_removed.length > 0 && (
                                <div className="flex items-center gap-2 text-rose-300">
                                  <span className="font-bold text-[11px]">- Moved away:</span>
                                  <span className="font-mono bg-rose-950/80 px-2 py-0.5 rounded border border-rose-700">
                                    {dc.scenes_removed.join(', ')}
                                  </span>
                                </div>
                              )}
                              {dc.scenes_added.length === 0 && dc.scenes_removed.length === 0 && (
                                <div className="text-slate-400 text-[11px]">
                                  Same scenes scheduled ({dc.scenes_after.length} scenes).
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 2: ACTOR DOOD SHIFTS */}
                  {activeDiffTab === 'actors' && (
                    <div className="space-y-2.5">
                      {diffResult.actor_changes.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No cast members' work or hold days changed between these versions.</span>
                        </div>
                      ) : (
                        diffResult.actor_changes.map((ac) => {
                          const costDiff = ac.cost_after - ac.cost_before;
                          const holdDiff = ac.hold_days_after - ac.hold_days_before;

                          return (
                            <div
                              key={ac.actor_id}
                              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-xs text-white flex items-center gap-2">
                                    <span>{ac.character_name}</span>
                                    <span className="text-slate-400 text-[11px]">({ac.actor_name})</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs font-mono">
                                  {holdDiff !== 0 && (
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold ${
                                        holdDiff > 0
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : 'bg-emerald-500/20 text-emerald-300'
                                      }`}
                                    >
                                      Hold Days: {holdDiff > 0 ? `+${holdDiff}` : holdDiff}
                                    </span>
                                  )}
                                  {costDiff !== 0 && (
                                    <span
                                      className={`font-bold ${
                                        costDiff > 0 ? 'text-rose-400' : 'text-emerald-400'
                                      }`}
                                    >
                                      {costDiff > 0 ? `+$${costDiff.toLocaleString()}` : `-$${Math.abs(costDiff).toLocaleString()}`}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Work Day Schedule Change Details */}
                              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60 font-mono">
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Base Work Days:</span>
                                  <span className="text-slate-200">
                                    {ac.work_days_before.length > 0
                                      ? ac.work_days_before.map((d) => `Day ${d}`).join(', ')
                                      : 'None'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block">New Work Days:</span>
                                  <span className="text-purple-300 font-bold">
                                    {ac.work_days_after.length > 0
                                      ? ac.work_days_after.map((d) => `Day ${d}`).join(', ')
                                      : 'None'}
                                  </span>
                                </div>
                              </div>

                              {/* Day-by-Day Cell Code Diff */}
                              {Object.keys(ac.status_changes).length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                  <span className="text-slate-400">Status shifts:</span>
                                  {Object.entries(ac.status_changes).map(([day, codes]) => (
                                    <span
                                      key={day}
                                      className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-slate-300"
                                    >
                                      Day {day}: <span className="text-rose-400">{codes.before}</span> ➔{' '}
                                      <span className="text-emerald-400 font-bold">{codes.after}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* TAB 3: LOCATION SHIFTS */}
                  {activeDiffTab === 'locations' && (
                    <div className="space-y-2.5">
                      {diffResult.location_changes.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>No location shoot days changed between these versions.</span>
                        </div>
                      ) : (
                        diffResult.location_changes.map((lc) => (
                          <div
                            key={lc.location}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                <span>{lc.location}</span>
                              </span>
                              <span className="text-slate-400 text-[11px] font-mono">
                                {lc.scenes_count_after} scenes
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1 border-t border-slate-800/60">
                              <div>
                                <span className="text-slate-400 text-[10px] block">Base Filming Days:</span>
                                <span className="text-slate-200">
                                  {lc.days_before.length > 0
                                    ? lc.days_before.map((d) => `Day ${d}`).join(', ')
                                    : 'None'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">New Filming Days:</span>
                                <span className="text-purple-300 font-bold">
                                  {lc.days_after.length > 0
                                    ? lc.days_after.map((d) => `Day ${d}`).join(', ')
                                    : 'None'}
                                </span>
                              </div>
                            </div>
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
              All version snapshots are stored with complete actor contracts, location permits, scene locks, and CP-SAT solver results.
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
