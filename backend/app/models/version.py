from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.app.models.schedule import ScheduleSolution, DaySchedule, ScheduleMetrics, ActorDOODRow
from backend.app.models.scene import Scene
from backend.app.models.actor import Actor
from backend.app.models.disruption import DisruptionAlert

class ScheduleVersion(BaseModel):
    version_id: str
    version_number: int
    label: str
    notes: Optional[str] = None
    created_at: str
    production_id: str
    total_days: int
    total_cost: int
    company_moves: int
    hold_days: int
    solution: ScheduleSolution
    scenes: List[Scene] = Field(default_factory=list)
    actors: List[Actor] = Field(default_factory=list)
    actor_blackouts: Dict[str, List[int]] = Field(default_factory=dict)
    location_blackouts: Dict[str, List[int]] = Field(default_factory=dict)
    dark_days: List[int] = Field(default_factory=list)
    soft_locks: Dict[str, List[int]] = Field(default_factory=dict)
    active_disruptions: List[DisruptionAlert] = Field(default_factory=list)

class VersionDiffActorChange(BaseModel):
    actor_id: str
    actor_name: str
    character_name: str
    work_days_before: List[int]
    work_days_after: List[int]
    hold_days_before: int
    hold_days_after: int
    status_changes: Dict[int, Dict[str, str]]  # day -> { "before": "W", "after": "H" }
    cost_before: int
    cost_after: int

class VersionDiffLocationChange(BaseModel):
    location: str
    days_before: List[int]
    days_after: List[int]
    scenes_count_before: int
    scenes_count_after: int

class VersionDiffDayChange(BaseModel):
    day_number: int
    is_dark_before: bool
    is_dark_after: bool
    dark_reason_before: Optional[str] = None
    dark_reason_after: Optional[str] = None
    scenes_before: List[str]  # e.g. ["SC_01", "SC_03"]
    scenes_after: List[str]
    scenes_added: List[str]
    scenes_removed: List[str]
    duration_before: int
    duration_after: int
    locations_before: List[str]
    locations_after: List[str]

class VersionDiffResult(BaseModel):
    base_version_id: str
    base_label: str
    target_version_id: str
    target_label: str
    cost_delta: int
    moves_delta: int
    hold_days_delta: int
    turnaround_delta: int
    actor_changes: List[VersionDiffActorChange]
    location_changes: List[VersionDiffLocationChange]
    day_changes: List[VersionDiffDayChange]
    dark_days_added: List[int]
    dark_days_removed: List[int]
    summary_text: str

class CreateVersionRequest(BaseModel):
    label: Optional[str] = None
    notes: Optional[str] = None

class DiffVersionsRequest(BaseModel):
    base_version_id: str
    target_version_id: str
