from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.models.scene import Scene
from backend.app.models.disruption import DisruptionAlert

class DaySchedule(BaseModel):
    day_number: int
    scenes: List[Scene] = Field(default_factory=list)
    total_duration_minutes: int = 0
    locations: List[str] = Field(default_factory=list)
    company_moves: int = 0
    is_night: bool = False
    is_day: bool = False

class ActorDOODRow(BaseModel):
    actor_id: str
    name: str
    character_name: str
    day_codes: List[str] = Field(default_factory=list, description="List of codes per day: 'W' (Work), 'H' (Hold), 'T' (Travel), 'F' (Finish), '-' (Off)")
    work_days: int = 0
    hold_days: int = 0
    travel_days: int = 0
    talent_cost: int = 0

class ScheduleMetrics(BaseModel):
    objective_cost: int = 0
    cost_saved_vs_naive: int = 0
    total_company_moves: int = 0
    total_hold_days: int = 0
    total_turnaround_violations: int = 0
    solver_runtime_ms: int = 0
    union_compliance_rate: float = 1.0

class ScheduleSolution(BaseModel):
    solution_id: str
    production_id: str = "prod_neon_horizon"
    status: str
    days: List[DaySchedule] = Field(default_factory=list)
    dood_matrix: List[ActorDOODRow] = Field(default_factory=list)
    metrics: ScheduleMetrics = Field(default_factory=ScheduleMetrics)
    disruptions_applied: List[DisruptionAlert] = Field(default_factory=list)
    executive_memo: Optional[str] = None
