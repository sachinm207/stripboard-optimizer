import {
  Scene,
  Actor,
  ScheduleSolution,
  DisruptionAlert,
  KafkaStatus,
  UnionAudit,
  ProductionConstraints,
  ConstraintVersion,
  ConstraintDiffResult,
} from '../types';

const API_BASE = '/api';

export async function fetchSchedule(): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/schedule`);
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
}

export async function fetchScenes(): Promise<Scene[]> {
  const res = await fetch(`${API_BASE}/scenes`);
  if (!res.ok) throw new Error('Failed to fetch scenes');
  return res.json();
}

export async function fetchActors(): Promise<Actor[]> {
  const res = await fetch(`${API_BASE}/actors`);
  if (!res.ok) throw new Error('Failed to fetch actors');
  return res.json();
}

export async function fetchKafkaStatus(): Promise<KafkaStatus> {
  const res = await fetch(`${API_BASE}/kafka/status`);
  if (!res.ok) throw new Error('Failed to fetch Kafka status');
  return res.json();
}

export async function fetchUnionAudit(): Promise<UnionAudit> {
  const res = await fetch(`${API_BASE}/union/audit`);
  if (!res.ok) throw new Error('Failed to fetch Union audit');
  return res.json();
}

export async function injectDisruption(alert: DisruptionAlert): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/schedule/disrupt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  });
  if (!res.ok) throw new Error('Failed to inject disruption');
  return res.json();
}

export async function resetSchedule(): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/schedule/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset schedule');
  return res.json();
}

export async function generateGeminiMemo(): Promise<{ memo: string }> {
  const res = await fetch(`${API_BASE}/memo/generate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate Gemini memo');
  return res.json();
}

export async function importProduction(payload: any): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Import failed' }));
    throw new Error(err.detail || 'Failed to import custom production');
  }
  return res.json();
}

export async function importCSVProduction(payload: {
  title: string;
  csv_content: string;
  num_days?: number;
  max_minutes_per_day?: number;
  w_turnaround?: number;
}): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/import-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'CSV Import failed' }));
    throw new Error(err.detail || 'Failed to import CSV breakdown');
  }
  return res.json();
}

export async function loadPreset(presetId: string, optimize: boolean = false): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/load-preset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset_id: presetId, optimize }),
  });
  if (!res.ok) throw new Error('Failed to load production preset');
  return res.json();
}

export async function solveSchedule(): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/schedule/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to solve schedule');
  return res.json();
}

export async function moveScene(sceneId: string, targetDay: number): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/move-scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene_id: sceneId, target_day: targetDay }),
  });
  if (!res.ok) throw new Error('Failed to move scene');
  return res.json();
}

export async function lockScene(sceneId: string, lockedDay: number | null): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/lock-scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene_id: sceneId, locked_day: lockedDay }),
  });
  if (!res.ok) throw new Error('Failed to lock/unlock scene');
  return res.json();
}

export async function clearSchedule(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/schedule/clear`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to clear schedule');
  return res.json();
}

export async function injectDisruptionBatch(alerts: DisruptionAlert[]): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/schedule/disrupt-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alerts }),
  });
  if (!res.ok) throw new Error('Failed to inject disruption batch');
  return res.json();
}

export async function fetchProductionSettings(): Promise<{
  w_turnaround: number;
  permit_lead_days: number;
  max_minutes_per_day: number;
  num_days: number;
  start_date?: string;
}> {
  const res = await fetch(`${API_BASE}/production/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateProductionSettings(settings: {
  w_turnaround?: number;
  permit_lead_days?: number;
  max_minutes_per_day?: number;
  start_date?: string;
}): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchConstraints(): Promise<ProductionConstraints> {
  const res = await fetch(`${API_BASE}/production/constraints`);
  if (!res.ok) throw new Error('Failed to fetch constraints');
  return res.json();
}

export async function updateConstraints(constraints: {
  actor_blackouts?: Record<string, number[]>;
  location_blackouts?: Record<string, number[]>;
  dark_days?: number[];
  soft_locks?: Record<string, number[]>;
}): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/constraints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(constraints),
  });
  if (!res.ok) throw new Error('Failed to update constraints');
  return res.json();
}

export async function updateProductionPlan(plan: {
  scenes?: Scene[];
  actors?: Actor[];
  actor_blackouts?: Record<string, number[]>;
  location_blackouts?: Record<string, number[]>;
  dark_days?: number[];
  start_date?: string;
  w_turnaround?: number;
  max_minutes_per_day?: number;
  permit_lead_days?: number;
}): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error('Failed to update production plan');
  return res.json();
}

export async function toggleSoftLock(
  entityId: string,
  day: number,
  active?: boolean
): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/toggle-soft-lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId, day, active }),
  });
  if (!res.ok) throw new Error('Failed to toggle soft lock');
  return res.json();
}

export async function clearSoftLocks(): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/production/clear-soft-locks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to clear soft locks');
  return res.json();
}

export async function fetchVersions(): Promise<ConstraintVersion[]> {
  const res = await fetch(`${API_BASE}/versions`);
  if (!res.ok) throw new Error('Failed to fetch versions');
  return res.json();
}

export async function saveVersion(label?: string, notes?: string): Promise<ConstraintVersion> {
  const res = await fetch(`${API_BASE}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, notes }),
  });
  if (!res.ok) throw new Error('Failed to save version');
  return res.json();
}

export async function restoreVersion(versionId: string): Promise<ScheduleSolution> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to restore version');
  return res.json();
}

export async function deleteVersion(versionId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/versions/${versionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete version');
  return res.json();
}

export async function diffVersions(baseVersionId: string, targetVersionId: string): Promise<ConstraintDiffResult> {
  const res = await fetch(`${API_BASE}/versions/diff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_version_id: baseVersionId,
      target_version_id: targetVersionId,
    }),
  });
  if (!res.ok) throw new Error('Failed to compute version diff');
  return res.json();
}



