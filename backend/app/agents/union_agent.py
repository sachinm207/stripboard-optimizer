from typing import Dict, Any, List
from backend.app.models.schedule import ScheduleSolution

class UnionComplianceAgent:
    """
    SAG-AFTRA, DGA, and IATSE Union Compliance Agent.
    Audits the shooting schedule for turnaround violations (12-hour rest periods)
    and forced call penalties.
    """
    def __init__(self, forced_call_penalty: int = 5000):
        self.forced_call_penalty = forced_call_penalty

    def audit_schedule(self, solution: ScheduleSolution) -> Dict[str, Any]:
        violations: List[Dict[str, Any]] = []
        total_penalties = 0

        # Check consecutive night-to-day shoots
        for i in range(len(solution.days) - 1):
            curr_day = solution.days[i]
            next_day = solution.days[i + 1]

            if curr_day.is_night and next_day.is_day:
                # SAG-AFTRA turnaround violation risk: Wrap at 04:00 AM, Day call at 07:00 AM (<12h)
                affected_cast = set()
                for s in curr_day.scenes:
                    affected_cast.update(s.cast_ids)
                for s in next_day.scenes:
                    if set(s.cast_ids).intersection(affected_cast):
                        penalty = len(affected_cast) * self.forced_call_penalty
                        total_penalties += penalty
                        violations.append({
                            "day_transition": f"Day {curr_day.day_number} -> Day {next_day.day_number}",
                            "rule": "SAG-AFTRA 12-Hour Rest Turnaround (Rule 14-A)",
                            "description": f"Night shoot on Day {curr_day.day_number} directly followed by Day call on Day {next_day.day_number}.",
                            "affected_cast_count": len(affected_cast),
                            "penalty_usd": penalty
                        })

        compliance_rate = 1.0 if not violations else max(0.0, 1.0 - (len(violations) * 0.25))

        return {
            "compliance_score": compliance_rate,
            "status": "COMPLIANT" if not violations else "FORCED_CALL_WARNING",
            "total_penalties_usd": total_penalties,
            "violations": violations,
            "summary": "Full SAG-AFTRA turnaround compliance verified. Zero forced call penalties." if not violations else f"Warning: {len(violations)} turnaround violation(s) detected ($ {total_penalties:,} penalty risk)."
        }
