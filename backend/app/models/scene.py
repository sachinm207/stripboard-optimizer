from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class SceneSetting(str, Enum):
    DAY_EXT = "DAY_EXT"
    DAY_INT = "DAY_INT"
    NIGHT_EXT = "NIGHT_EXT"
    NIGHT_INT = "NIGHT_INT"
    EXT_DAY = "EXT_DAY"
    INT_DAY = "INT_DAY"
    EXT_NIGHT = "EXT_NIGHT"
    INT_NIGHT = "INT_NIGHT"

class Scene(BaseModel):
    model_config = ConfigDict(extra="allow")

    scene_id: str
    scene_number: str
    slugline: str
    setting: SceneSetting
    location: str
    pages_eighths: int = Field(default=8, description="Length in eighths of a page")
    est_shoot_minutes: int = Field(default=120, description="Estimated filming time in minutes")
    cast_ids: List[str] = Field(default_factory=list)
    description: str = ""
    precedence_before: List[str] = Field(default_factory=list, description="IDs of scenes that must shoot AFTER this scene")
    permit_days: Optional[List[int]] = Field(default=None, description="Restricted shoot days allowed for this scene")
    locked_day: Optional[int] = Field(default=None, description="Manually locked shoot day preference by AD/Director")
