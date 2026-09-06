import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { CostMeter } from './components/CostMeter';
import { Stripboard } from './components/Stripboard';
import { AvailabilityMatrix } from './components/AvailabilityMatrix';
import { ChaosDrawer } from './components/ChaosDrawer';
import { ProducerMemoModal } from './components/ProducerMemoModal';
import { ImportModal } from './components/ImportModal';
import { SettingsModal } from './components/SettingsModal';
import {
  fetchSchedule,
  fetchScenes,
  fetchActors,
  fetchKafkaStatus,
  fetchUnionAudit,
  injectDisruption,
  injectDisruptionBatch,
  resetSchedule,
  generateGeminiMemo,
  importProduction,
  importCSVProduction,
  loadPreset,
  solveSchedule,
  lockScene,
  moveScene,
  clearSchedule,
  updateConstraints,
  toggleSoftLock,
  clearSoftLocks,
} from './services/api';
import { Scene, Actor, ScheduleSolution, DisruptionAlert, KafkaStatus, UnionAudit } from './types';
import {
  LayoutGrid,
  Calendar,
  ShieldCheck,
  Radio,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Zap,
  Play,
  Film,
  Upload,
  Clapperboard,
  Flame,
  FileText,
  RotateCcw,
} from 'lucide-react';

export const App: React.FC = () => {
  const [solution, setSolution] = useState<ScheduleSolution | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [kafkaStatus, setKafkaStatus] = useState<KafkaStatus | null>(null);
  const [unionAudit, setUnionAudit] = useState<UnionAudit | null>(null);
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
  const [activeTab, setActiveTab] = useState<'stripboard' | 'dood' | 'union' | 'kafka'>('stripboard');
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Load initial data (if any production is active on backend)
  const loadData = async () => {
    try {
      const [sched, scs, acts, kStat, uAudit] = await Promise.all([
        fetchSchedule().catch(() => null),
        fetchScenes().catch(() => []),
        fetchActors().catch(() => []),
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setSolution(sched);
      setScenes(scs);
      setActors(acts);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load initial production data', err);
      setError('Could not connect to StripBoard Optimizer backend. Ensure backend is running.');
    }
  };

  useEffect(() => {
    loadData();

    // Setup WebSocket connection for live event streaming
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events`;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.topic === 'schedule.optimized.solution' && msg.payload) {
              setSolution(msg.payload);
              // Refresh union audit
              fetchUnionAudit().then(setUnionAudit).catch(() => null);
              fetchKafkaStatus().then(setKafkaStatus).catch(() => null);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket error, falling back to REST', err);
        };
      } catch (e) {
        console.warn('WebSocket setup failed', e);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleInjectDisruption = async (disruptionItem: DisruptionAlert) => {
    setIsSolving(true);
    try {
      const updated = await injectDisruption(disruptionItem);
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setIsChaosOpen(false);
      setError(null);
    } catch (err: any) {
      setError('Error solving schedule with disruption: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleReset = async () => {
    setIsSolving(true);
    try {
      const resetSol = await resetSchedule();
      setSolution(resetSol);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Error resetting schedule: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleRegenerateGemini = async () => {
    setIsGeneratingGemini(true);
    try {
      const res = await generateGeminiMemo();
      if (solution) {
        setSolution({ ...solution, executive_memo: res.memo });
      }
      setError(null);
    } catch (e: any) {
      setError('Gemini generation error: ' + e.message);
    } finally {
      setIsGeneratingGemini(false);
    }
  };

  const handleLoadPreset = async (presetId: string, optimize: boolean = false) => {
    setIsSolving(true);
    try {
      const updated = await loadPreset(presetId, optimize);
      setSolution(updated);
      const [scs, acts, kStat, uAudit] = await Promise.all([
        fetchScenes(),
        fetchActors(),
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setScenes(scs);
      setActors(acts);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to load preset: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleSolveSchedule = async () => {
    setIsSolving(true);
    try {
      const updated = await solveSchedule();
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to optimize schedule: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleLockScene = async (sceneId: string, lockedDay: number | null) => {
    setIsSolving(true);
    try {
      const updated = await lockScene(sceneId, lockedDay);
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to lock/unlock scene: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleMoveScene = async (sceneId: string, targetDay: number) => {
    setIsSolving(true);
    try {
      const updated = await moveScene(sceneId, targetDay);
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to move scene: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleClearSchedule = async () => {
    setIsSolving(true);
    try {
      await clearSchedule();
      setSolution(null);
      setScenes([]);
      setActors([]);
      setUnionAudit(null);
      setError(null);
    } catch (err: any) {
      setError('Failed to clear schedule: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleSaveConstraints = async (constraints: {
    actor_blackouts: Record<string, number[]>;
    location_blackouts: Record<string, number[]>;
    dark_days: number[];
  }) => {
    setIsSolving(true);
    try {
      const updated = await updateConstraints(constraints);
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to update constraints: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleToggleSoftLock = async (entityId: string, day: number) => {
    setIsSolving(true);
    try {
      const updated = await toggleSoftLock(entityId, day);
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to toggle soft lock: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleClearSoftLocks = async () => {
    setIsSolving(true);
    try {
      const updated = await clearSoftLocks();
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Failed to clear soft locks: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleImportCSV = async (csvContent: string, title?: string) => {
    setIsSolving(true);
    try {
      const updated = await importCSVProduction({
        title: title || 'Imported Production',
        csv_content: csvContent,
      });
      setSolution(updated);
      const [scs, acts, kStat, uAudit] = await Promise.all([
        fetchScenes(),
        fetchActors(),
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setScenes(scs);
      setActors(acts);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('CSV Import error: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleInjectBatch = async (alerts: DisruptionAlert[]) => {
    setIsSolving(true);
    try {
      const updated = await injectDisruptionBatch(alerts);
      setSolution(updated);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setIsChaosOpen(false);
      setError(null);
    } catch (err: any) {
      setError('Error solving schedule with batch disruptions: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  const handleImport = async (data: any) => {
    setIsSolving(true);
    try {
      const updated = await importProduction(data);
      setSolution(updated);
      setScenes(data.scenes);
      setActors(data.actors);
      const [kStat, uAudit] = await Promise.all([
        fetchKafkaStatus().catch(() => null),
        fetchUnionAudit().catch(() => null),
      ]);
      setKafkaStatus(kStat);
      setUnionAudit(uAudit);
      setError(null);
    } catch (err: any) {
      setError('Import error: ' + err.message);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        productionId={solution?.production_id || null}
        kafkaStatus={kafkaStatus}
        hasProduction={Boolean(solution && solution.days && solution.days.length > 0)}
        onOpenChaos={() => setIsChaosOpen(true)}
        onOpenMemo={() => setIsMemoOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleReset}
        onClear={handleClearSchedule}
        onSwitchPreset={(id) => handleLoadPreset(id, false)}
        isSolving={isSolving}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {solution && solution.days && solution.days.length > 0 ? (
          <>
            {/* Real-time Financial & Union HUD */}
            <CostMeter
              metrics={solution.metrics}
              disruptions={solution.disruptions_applied}
              status={solution.status}
              onSelectTab={setActiveTab}
            />

            {/* Optimization Status Callout Banner */}
            {solution.status === 'RAW_UNOPTIMIZED' ? (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Raw Screenplay-Order Schedule Loaded (Unoptimized Baseline)
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {solution.days.length} Shoot Days
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Scenes are currently ordered sequentially from the screenplay. Notice the excessive company moves between distant locations
                      and high idle actor hold days (<span className="text-amber-400 font-bold">${solution.metrics.objective_cost.toLocaleString()} USD</span> baseline penalty).
                      Click below to let Google OR-Tools CP-SAT autonomously eliminate moves and optimize your budget.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSolveSchedule}
                  disabled={isSolving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-slate-950 fill-current" />
                  <span>{isSolving ? 'Optimizing...' : 'Run Autonomous CP-SAT Optimizer'}</span>
                </button>
              </div>
            ) : solution.metrics.cost_saved_vs_naive > 0 ? (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/40 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Schedule Autonomously Optimized via Google OR-Tools CP-SAT
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Saved ${solution.metrics.cost_saved_vs_naive.toLocaleString()} USD
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Company moves reduced to <span className="font-bold text-emerald-400">{solution.metrics.total_company_moves}</span>.
                      Talent hold days minimized to <span className="font-bold text-emerald-400">{solution.metrics.total_hold_days}</span>.
                      Solved in <span className="font-mono text-sky-400">{solution.metrics.solver_runtime_ms} ms</span> with zero SAG-AFTRA turnaround violations.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsChaosOpen(true)}
                    className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Throw Chaos</span>
                  </button>
                  <button
                    onClick={() => handleLoadPreset(solution.production_id, false)}
                    disabled={isSolving}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                    title="Switch back to view the raw unoptimized screenplay order"
                  >
                    View Raw Script Order
                  </button>
                </div>
              </div>
            ) : null}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('stripboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'stripboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Hollywood Stripboard</span>
              </button>

              <button
                onClick={() => setActiveTab('dood')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'dood'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Cast & Location DOOD Matrix</span>
              </button>

              <button
                onClick={() => setActiveTab('union')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'union'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Union & Labor Audit</span>
              </button>

              <button
                onClick={() => setActiveTab('kafka')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'kafka'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Kafka Event Mesh</span>
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'stripboard' && (
              <Stripboard
                days={solution.days}
                onMoveScene={handleMoveScene}
                onLockScene={handleLockScene}
              />
            )}

            {activeTab === 'dood' && (
              <AvailabilityMatrix
                doodMatrix={solution.dood_matrix}
                actors={actors}
                days={solution.days}
                numDays={solution.days.length}
                actorBlackouts={solution.actor_blackouts}
                locationBlackouts={solution.location_blackouts}
                darkDays={solution.dark_days}
                softLocks={solution.soft_locks}
                onSaveConstraints={handleSaveConstraints}
                onToggleSoftLock={handleToggleSoftLock}
                onClearSoftLocks={handleClearSoftLocks}
                isSolving={isSolving}
              />
            )}

            {activeTab === 'union' && unionAudit && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">SAG-AFTRA & Labor Union Compliance Audit</h3>
                    <p className="text-xs text-slate-400">{unionAudit.summary}</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                    Score: {Math.round(unionAudit.compliance_score * 100)}% ({unionAudit.status})
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Rules Enforced
                    </h4>
                    <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>SAG-AFTRA Rule 14-A: Mandatory 12-hour overnight rest turnaround</li>
                      <li>IATSE 6-day consecutive workweek limits</li>
                      <li>Intra-day company move penalties ($50,000 / move)</li>
                      <li>Day-out-of-days idle talent hold rates ($2,000 / day)</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Turnaround Penalties Incurred
                    </h4>
                    <div className="text-xl font-mono font-black text-emerald-400">
                      ${unionAudit.total_penalties_usd.toLocaleString()} USD
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {unionAudit.violations.length === 0
                        ? 'Zero forced calls or union turnaround infractions detected.'
                        : `${unionAudit.violations.length} turnaround warning(s).`}
                    </p>
                  </div>
                </div>

                {unionAudit.violations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Detected Violations:</h4>
                    {unionAudit.violations.map((v, i) => (
                      <div key={i} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                        <div className="font-bold">{v.rule} - {v.day_transition}</div>
                        <p className="text-[11px] text-rose-300 mt-0.5">{v.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'kafka' && kafkaStatus && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
                    <div>
                      <h3 className="text-base font-bold text-white">IBM / Confluent Kafka Event Mesh</h3>
                      <p className="text-xs text-slate-400">
                        Mode: {kafkaStatus.is_confluent_connected ? 'Live Confluent Cloud Cluster' : 'Resilient In-Memory Asynchronous Mesh'}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs">
                    {kafkaStatus.total_events_logged} Events Processed
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Topic Catalog</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {kafkaStatus.topics.map((t) => (
                      <div key={t} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/60 font-mono text-xs flex items-center justify-between">
                        <span className="text-sky-400">{t}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Blank / Welcome Screen: Hero Scenario Launcher */
          <div className="py-8 md:py-14 space-y-10">
            {/* Hero Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Clapperboard className="w-3.5 h-3.5" />
                <span>Autonomous Film Production Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Hollywood Stripboard Optimizer
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Experience real-time mathematical film re-scheduling powered by <span className="text-white font-semibold">Google OR-Tools CP-SAT</span> and <span className="text-white font-semibold">Google Gemini 2.5 Pro</span>. Select a scenario below to load the raw screenplay breakdown and benchmark autonomous budget savings.
              </p>
            </div>

            {/* Production Scenario Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Card 1: 5-Day Sprint */}
              <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all group hover:scale-[1.02]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                      5 Shoot Days
                    </span>
                    <span className="text-xs text-slate-500 font-mono">14 Scenes</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      Neon Horizon: Indie Sprint
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Downtown LA thriller with warehouse pyro shoot, 4 principal cast members, and strict SAG turnaround constraints.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">4 Cast</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">2 Locations</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Fast Chaos</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleLoadPreset('neon_horizon', false)}
                    disabled={isSolving}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Load 5-Day Scenario</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-2">
                    Loads raw script order first so you can inspect and optimize
                  </p>
                </div>
              </div>

              {/* Card 2: 20-Day Feature */}
              <div className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all group hover:scale-[1.02]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase">
                      20 Shoot Days
                    </span>
                    <span className="text-xs text-slate-500 font-mono">52 Scenes</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                      Neon Horizon: Feature Film
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Full union feature production cut. 8 principal actors, 6 practical locations, multi-actor hold-day scheduling, and complex company moves.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">8 Cast</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">6 Locations</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Permit Lead Times</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleLoadPreset('neon_horizon_20d', false)}
                    disabled={isSolving}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Load 20-Day Feature</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-2">
                    Industry-scale benchmark with $300k+ in potential optimization savings
                  </p>
                </div>
              </div>

              {/* Card 3: Custom Breakdown */}
              <div className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all group hover:scale-[1.02]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase">
                      Custom Script
                    </span>
                    <span className="text-xs text-slate-500 font-mono">CSV / JSON</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors">
                      Import Breakdown Sheet
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Bring your own screenplay scenes, actor day rates, locations, and shoot duration constraints in standard CSV or JSON format.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Movie Magic Format</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Custom Cast</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Flexible Days</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => setIsImportOpen(true)}
                    disabled={isSolving}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Import Custom Film</span>
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-2">
                    Paste CSV or upload JSON script breakdown
                  </p>
                </div>
              </div>
            </div>

            {/* Architecture Highlights Footer */}
            <div className="border-t border-slate-800/80 pt-8 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-emerald-400 font-bold text-xs">Google OR-Tools CP-SAT</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Exact integer constraint solver</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-sky-400 font-bold text-xs">Gemini 2.5 Pro</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Autonomous Executive Line Producer</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-purple-400 font-bold text-xs">Confluent Kafka</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Sub-second disruption event mesh</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-amber-400 font-bold text-xs">SAG-AFTRA Rule 14-A</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Turnaround & labor union audit</div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Disruption Drawer */}
      <ChaosDrawer
        isOpen={isChaosOpen}
        onClose={() => setIsChaosOpen(false)}
        onInject={handleInjectDisruption}
        onInjectBatch={handleInjectBatch}
        onReset={handleReset}
        activeDisruptions={solution?.disruptions_applied || []}
        actors={actors}
        scenes={scenes}
        numDays={solution?.days.length || 5}
        isSolving={isSolving}
      />

      {/* Gemini Line Producer Memo Modal */}
      <ProducerMemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        memoContent={solution?.executive_memo}
        solverRuntimeMs={solution?.metrics?.solver_runtime_ms}
        onRegenerateGemini={handleRegenerateGemini}
        isGenerating={isGeneratingGemini}
      />

      {/* Import Custom Production Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
        onImportCSV={handleImportCSV}
        isImporting={isSolving}
      />

      {/* Production Policy & Union Rules Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(updatedSol) => {
          setSolution(updatedSol);
          fetchUnionAudit().then(setUnionAudit).catch(() => null);
        }}
        isSaving={isSolving}
      />
    </div>
  );
};
