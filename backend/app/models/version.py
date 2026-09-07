from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from backend.app.models.disruption import DisruptionAlert

class ConstraintVersion(BaseModel):
    version_id: str
    version_number: int
    label: str
    notes: Optional[str] = None
    created_at: str
    production_id: str
    dark_days: List[int] = Field(default_factory=list)
    actor_blackouts: Dict[str, List[int]] = Field(default_factory=dict)
    location_blackouts: Dict[str, List[int]] = Field(default_factory=dict)
    active_disruptions: List[DisruptionAlert] = Field(default_factory=list)

class ActorBlackoutDiff(BaseModel):
    actor_id: str
    actor_name: str
    added_off_days: List[int]
    removed_off_days: List[int]

class LocationBlackoutDiff(BaseModel):
    location: str
    added_off_days: List[int]
    removed_off_days: List[int]

class ChaosDisruptionDiff(BaseModel):
    alert_id: str
    disruption_type: str
    affected_days: List[int]
    reason: str
    change_type: str  # "added" or "removed"

class ConstraintDiffResult(BaseModel):
    base_version_id: str
    base_label: str
    target_version_id: str
    target_label: str
    dark_days_added: List[int]
    dark_days_removed: List[int]
    actor_blackouts_diff: List[ActorBlackoutDiff]
    location_blackouts_diff: List[LocationBlackoutDiff]
    chaos_disruptions_diff: List[ChaosDisruptionDiff]
    total_changes_count: int
    summary_text: str

class CreateVersionRequest(BaseModel):
    label: Optional[str] = None
    notes: Optional[str] = None

class DiffVersionsRequest(BaseModel):
    base_version_id: str
    target_version_id: str
