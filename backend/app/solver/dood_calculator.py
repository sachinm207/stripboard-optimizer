from typing import List, Dict
from backend.app.models.actor import Actor
from backend.app.models.scene import Scene
from backend.app.models.schedule import ActorDOODRow

def calculate_dood_matrix(
    actors: List[Actor],
    scheduled_days: Dict[int, List[Scene]],
    num_days: int
) -> List[ActorDOODRow]:
    """
    Computes the Day-out-of-Days (DOOD) grid for each actor.
    Codes:
      'W' = Work day
      'H' = Hold day (idle between first and last work day, incurs hold rate)
      'F' = Final work day (when more than 1 work day)
      '-' = Off / Not booked
    """
    dood_rows: List[ActorDOODRow] = []

    for actor in actors:
        work_by_day = {}
        for day in range(1, num_days + 1):
            scenes_on_day = scheduled_days.get(day, [])
            works_today = any(actor.actor_id in s.cast_ids for s in scenes_on_day)
            work_by_day[day] = works_today

        worked_days = [day for day, works in work_by_day.items() if works]

        day_codes: List[str] = []
        hold_days_count = 0
        work_days_count = len(worked_days)

        if not worked_days:
            day_codes = ["-"] * num_days
        else:
            first_day = min(worked_days)
            last_day = max(worked_days)

            for day in range(1, num_days + 1):
                if day < first_day or day > last_day:
                    day_codes.append("-")
                elif work_by_day[day]:
                    if day == last_day and len(worked_days) > 1:
                        day_codes.append("F")
                    else:
                        day_codes.append("W")
                else:
                    # In between first and last work day, but not working
                    day_codes.append("H")
                    hold_days_count += 1

        talent_cost = (work_days_count * actor.daily_rate) + (hold_days_count * actor.hold_rate)

        dood_rows.append(
            ActorDOODRow(
                actor_id=actor.actor_id,
                name=actor.name,
                character_name=actor.character_name,
                day_codes=day_codes,
                work_days=work_days_count,
                hold_days=hold_days_count,
                travel_days=0,
                talent_cost=talent_cost,
            )
        )

    return dood_rows
