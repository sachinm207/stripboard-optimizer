import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { CostMeter } from './components/CostMeter';
import { Stripboard } from './components/Stripboard';
import { DoodMatrix } from './components/DoodMatrix';
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
} from './services/api';
import { Scene, Actor, ScheduleSolution, DisruptionAlert, KafkaStatus, UnionAudit } from './types';
import { LayoutGrid, Calendar, ShieldCheck, Radio, Sparkles, AlertCircle } from 'lucide-react';

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

  // Load initial data
  const loadData = async () => {
    try {
      const [sched, scs, acts, kStat, uAudit] = await Promise.all([
        fetchSchedule(),
        fetchScenes(),
        fetchActors(),
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

  const handleSwitchPreset = async (presetId: string) => {
    setIsSolving(true);
    try {
      const updated = await loadPreset(presetId);
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
      setError('Failed to switch preset: ' + err.message);
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
        productionId={solution?.production_id || 'prod_neon_horizon'}
        kafkaStatus={kafkaStatus}
        onOpenChaos={() => setIsChaosOpen(true)}
        onOpenMemo={() => setIsMemoOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleReset}
        onSwitchPreset={handleSwitchPreset}
        isSolving={isSolving}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {solution && (
          <>
            {/* Real-time Financial & Union HUD */}
            <CostMeter
              metrics={solution.metrics}
              disruptions={solution.disruptions_applied}
            />

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
                <span>Day-out-of-Days (DOOD)</span>
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
              <Stripboard days={solution.days} />
            )}

            {activeTab === 'dood' && (
              <DoodMatrix doodMatrix={solution.dood_matrix} numDays={solution.days.length} />
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
