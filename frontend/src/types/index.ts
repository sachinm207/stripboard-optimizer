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
  blackout_days?: number[];
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

export interface ScheduleSolution {
  solution_id: string;
  production_id: string;
  status: string;
  days: DaySchedule[];
  dood_matrix: ActorDOODRow[];
  metrics: ScheduleMetrics;
  disruptions_applied: DisruptionAlert[];
  executive_memo?: string;
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
