from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class Actor(BaseModel):
    model_config = ConfigDict(extra="allow")

    actor_id: str
    name: str
    character_name: str
    daily_rate: int = Field(default=5000, description="Daily contract rate in USD")
    day_rate: Optional[float] = None
    hold_rate: float = Field(default=2000.0, description="Daily holding rate in USD when idle between work days")
    blackout_days: List[int] = Field(default_factory=list, description="Shoot days where actor is unavailable")

    def model_post_init(self, __context):
        if self.day_rate is not None and self.daily_rate == 5000:
            self.daily_rate = int(self.day_rate)
        if isinstance(self.hold_rate, float):
            self.hold_rate = int(self.hold_rate)
