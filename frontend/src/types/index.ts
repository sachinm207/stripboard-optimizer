export interface Scene {
  scene_id: string;
  scene_number: string;
  slugline: string;
  setting: string;
  location: string;
  pages_eighths: number;
  est_shoot_minutes: number;
  cast_ids: string[];
  description: string;
  requires_pyro?: boolean;
  locked_day?: number;
}

export interface Actor {
  actor_id: string;
  name: string;
  character_name: string;
  daily_rate: number;
  hold_rate: number;
  blackout_days: number[];
}

export interface DisruptionAlert {
  alert_id: string;
  production_id: string;
  disruption_type: string;
  severity: string;
  affected_actor_id?: string;
  affected_location?: string;
  affected_shoot_days: number[];
  reason: string;
  timestamp?: string;
}

export interface DaySchedule {
  day_number: number;
  scenes: Scene[];
  total_duration_minutes: number;
  locations: string[];
  company_moves: number;
  is_night: boolean;
  is_day: boolean;
  is_dark_day?: boolean;
  dark_day_reason?: string;
}

export interface ActorDOODRow {
  actor_id: string;
  name: string;
  character_name: string;
  day_codes: string[];
  work_days: number;
  hold_days: number;
  travel_days: number;
  talent_cost: number;
}

export interface ScheduleMetrics {
  objective_cost: number;
  cost_saved_vs_naive: number;
  total_company_moves: number;
  total_hold_days: number;
  total_turnaround_violations: number;
  solver_runtime_ms: number;
  union_compliance_rate: number;
}

export interface ProductionConstraints {
  actor_blackouts: Record<string, number[]>;
  location_blackouts: Record<string, number[]>;
  dark_days: number[];
  soft_locks: Record<string, number[]>;
}

export interface ScheduleSolution {
  solution_id: string;
  production_id: string;
  status: string;
  days: DaySchedule[];
  dood_matrix: ActorDOODRow[];
  metrics: ScheduleMetrics;
  disruptions_applied: DisruptionAlert[];
  executive_memo?: string;
  actor_blackouts?: Record<string, number[]>;
  location_blackouts?: Record<string, number[]>;
  dark_days?: number[];
  soft_locks?: Record<string, number[]>;
}

export interface UnionViolation {
  day_transition: string;
  rule: string;
  description: string;
  affected_cast_count: number;
  penalty_usd: number;
}

export interface UnionAudit {
  compliance_score: number;
  status: string;
  total_penalties_usd: number;
  violations: UnionViolation[];
  summary: string;
}

export interface KafkaStatus {
  is_confluent_connected: boolean;
  topics: string[];
  total_events_logged: number;
  active_websocket_subscribers: number;
}

export interface ScheduleVersion {
  version_id: string;
  version_number: number;
  label: string;
  notes?: string;
  created_at: string;
  production_id: string;
  total_days: number;
  total_cost: number;
  company_moves: number;
  hold_days: number;
  solution: ScheduleSolution;
  scenes: Scene[];
  actors: Actor[];
  actor_blackouts: Record<string, number[]>;
  location_blackouts: Record<string, number[]>;
  dark_days: number[];
  soft_locks: Record<string, number[]>;
  active_disruptions: DisruptionAlert[];
}

export interface VersionDiffActorChange {
  actor_id: string;
  actor_name: string;
  character_name: string;
  work_days_before: number[];
  work_days_after: number[];
  hold_days_before: number;
  hold_days_after: number;
  status_changes: Record<number, { before: string; after: string }>;
  cost_before: number;
  cost_after: number;
}

export interface VersionDiffLocationChange {
  location: string;
  days_before: number[];
  days_after: number[];
  scenes_count_before: number;
  scenes_count_after: number;
}

export interface VersionDiffDayChange {
  day_number: number;
  is_dark_before: boolean;
  is_dark_after: boolean;
  dark_reason_before?: string;
  dark_reason_after?: string;
  scenes_before: string[];
  scenes_after: string[];
  scenes_added: string[];
  scenes_removed: string[];
  duration_before: number;
  duration_after: number;
  locations_before: string[];
  locations_after: string[];
}

export interface VersionDiffResult {
  base_version_id: string;
  base_label: string;
  target_version_id: string;
  target_label: string;
  cost_delta: number;
  moves_delta: number;
  hold_days_delta: number;
  turnaround_delta: number;
  actor_changes: VersionDiffActorChange[];
  location_changes: VersionDiffLocationChange[];
  day_changes: VersionDiffDayChange[];
  dark_days_added: number[];
  dark_days_removed: number[];
  summary_text: string;
}
