from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class DisruptionType(str, Enum):
    ACTOR_DISRUPTION = "ACTOR_DISRUPTION"
    ACTOR_ILLNESS = "ACTOR_ILLNESS"
    LOCATION_DISRUPTION = "LOCATION_DISRUPTION"
    LOCATION_UNAVAILABLE = "LOCATION_UNAVAILABLE"
    WEATHER_EVENT = "WEATHER_EVENT"
    PERMIT_REVOCATION = "PERMIT_REVOCATION"
    DAY_SHUTDOWN = "DAY_SHUTDOWN"

class DisruptionAlert(BaseModel):
    alert_id: str
    production_id: str = "prod_neon_horizon"
    disruption_type: DisruptionType
    severity: str = "CRITICAL"
    affected_actor_id: Optional[str] = None
    affected_location: Optional[str] = None
    affected_shoot_days: List[int] = Field(default_factory=list)
    reason: str
    timestamp: Optional[str] = None
