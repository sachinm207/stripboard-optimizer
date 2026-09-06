import time
import uuid
from typing import List, Dict, Optional
from ortools.sat.python import cp_model
from backend.app.models.scene import Scene, SceneSetting
from backend.app.models.actor import Actor
from backend.app.models.disruption import DisruptionAlert
from backend.app.models.schedule import (
    DaySchedule,
    ScheduleMetrics,
    ScheduleSolution
)
from backend.app.solver.dood_calculator import calculate_dood_matrix

class StripboardSolver:
    def __init__(
        self,
        scenes: List[Scene],
        actors: List[Actor],
        num_days: int = 5,
        max_minutes_per_day: int = 600,
        w_hold: int = 2000,
        w_move: int = 15000,
        w_turnaround: int = 25000,
        permit_lead_days: int = 0,
        current_day_offset: int = 1
    ):
        self.scenes = scenes
        self.actors = actors
        self.num_days = num_days
        self.max_minutes_per_day = max_minutes_per_day
        self.w_hold = w_hold
        self.w_move = w_move
        self.w_turnaround = w_turnaround
        self.permit_lead_days = permit_lead_days
        self.current_day_offset = current_day_offset

    def solve(
        self,
        disruptions: Optional[List[DisruptionAlert]] = None,
        time_limit_seconds: float = 5.0,
        naive_cost: Optional[int] = None
    ) -> ScheduleSolution:
        start_time = time.time()
        disruptions = disruptions or []
        model = cp_model.CpModel()

        D = list(range(1, self.num_days + 1))
        scene_ids = [s.scene_id for s in self.scenes]
        scene_map = {s.scene_id: s for s in self.scenes}
        actor_ids = [a.actor_id for a in self.actors]
        locations = sorted(list({s.location for s in self.scenes}))

        # Decision Variables: X[s, d] = 1 if scene s is scheduled on day d
        X = {}
        for s in scene_ids:
            for d in D:
                X[s, d] = model.NewBoolVar(f"X_{s}_{d}")

        # 1. Hard Constraint: Each scene assigned to exactly 1 day
        for s in scene_ids:
            model.Add(sum(X[s, d] for d in D) == 1)

        # 2. Hard Constraint: Daily shooting minutes cap
        for d in D:
            model.Add(
                sum(scene_map[s].est_shoot_minutes * X[s, d] for s in scene_ids)
                <= self.max_minutes_per_day
            )

        # 3. Disruption Constraints
        for alert in disruptions:
            if alert.affected_actor_id and alert.affected_shoot_days:
                for s in self.scenes:
                    if alert.affected_actor_id in s.cast_ids:
                        for d in alert.affected_shoot_days:
                            if d in D:
                                model.Add(X[s.scene_id, d] == 0)

            if alert.affected_location and alert.affected_shoot_days:
                for s in self.scenes:
                    if s.location == alert.affected_location:
                        for d in alert.affected_shoot_days:
                            if d in D:
                                model.Add(X[s.scene_id, d] == 0)

        # Static actor blackout days
        for a in self.actors:
            for d in a.blackout_days:
                if d in D:
                    for s in self.scenes:
                        if a.actor_id in s.cast_ids:
                            model.Add(X[s.scene_id, d] == 0)

        # Restricted permit days for scenes
        for s in self.scenes:
            if s.permit_days:
                for d in D:
                    if d not in s.permit_days:
                        model.Add(X[s.scene_id, d] == 0)

        # 3b. Manual Pinning / Lock Day Constraint (Human AD Manual Override)
        for s in self.scenes:
            if s.locked_day is not None and s.locked_day in D:
                model.Add(X[s.scene_id, s.locked_day] == 1)

        # 4. Precedence Constraints
        for s in self.scenes:
            if s.precedence_before:
                for after_id in s.precedence_before:
                    if after_id in scene_map:
                        day_s = sum(d * X[s.scene_id, d] for d in D)
                        day_after = sum(d * X[after_id, d] for d in D)
                        model.Add(day_s < day_after)

        # 4b. Permit Lead Time Constraint ("Frozen Horizon")
        # If a permit lead time is required (e.g. 2 days notice), exterior / permitted scenes
        # cannot be newly rescheduled onto immediate upcoming days without sufficient advance notice.
        if self.permit_lead_days > 0:
            frozen_days = [
                d for d in D 
                if self.current_day_offset <= d < (self.current_day_offset + self.permit_lead_days)
            ]
            for s in self.scenes:
                # If scene requires city permit and is not pre-cleared for these days
                if s.permit_days is not None:
                    for fd in frozen_days:
                        if fd not in s.permit_days:
                            model.Add(X[s.scene_id, fd] == 0)

        # 5. Actor Work & Hold Days Formulation
        W_act = {}
        for a in actor_ids:
            for d in D:
                W_act[a, d] = model.NewBoolVar(f"W_{a}_{d}")
                cast_scenes = [s for s in self.scenes if a in s.cast_ids]
                if cast_scenes:
                    for cs in cast_scenes:
                        model.Add(W_act[a, d] >= X[cs.scene_id, d])
                    model.Add(W_act[a, d] <= sum(X[cs.scene_id, d] for cs in cast_scenes))
                else:
                    model.Add(W_act[a, d] == 0)

        Hold = {}
        total_hold_vars = []
        for a in actor_ids:
            Started = {}
            Remaining = {}
            Span = {}
            for d in D:
                Started[d] = model.NewBoolVar(f"Started_{a}_{d}")
                Remaining[d] = model.NewBoolVar(f"Remaining_{a}_{d}")
                Span[d] = model.NewBoolVar(f"Span_{a}_{d}")
                Hold[a, d] = model.NewBoolVar(f"Hold_{a}_{d}")

            # Started propagation: Started[d] = 1 if actor worked on or before day d
            model.Add(Started[1] == W_act[a, 1])
            for d in range(2, len(D) + 1):
                model.AddMaxEquality(Started[d], [Started[d - 1], W_act[a, d]])

            # Remaining propagation: Remaining[d] = 1 if actor works on or after day d
            model.Add(Remaining[len(D)] == W_act[a, len(D)])
            for d in range(len(D) - 1, 0, -1):
                model.AddMaxEquality(Remaining[d], [Remaining[d + 1], W_act[a, d]])

            # Span = Started AND Remaining
            for d in D:
                model.AddMultiplicationEquality(Span[d], [Started[d], Remaining[d]])
                model.Add(Hold[a, d] == Span[d] - W_act[a, d])
                total_hold_vars.append(Hold[a, d])

        # 6. Location Company Moves Formulation
        LocUsed = {}
        MoveVars = []
        for loc in locations:
            loc_scenes = [s for s in self.scenes if s.location == loc]
            for d in D:
                LocUsed[loc, d] = model.NewBoolVar(f"LocUsed_{loc}_{d}")
                for ls in loc_scenes:
                    model.Add(LocUsed[loc, d] >= X[ls.scene_id, d])
                model.Add(LocUsed[loc, d] <= sum(X[ls.scene_id, d] for ls in loc_scenes))

        for d in D:
            moves_d = model.NewIntVar(0, len(locations), f"Moves_{d}")
            model.Add(moves_d >= sum(LocUsed[loc, d] for loc in locations) - 1)
            model.Add(moves_d >= 0)
            MoveVars.append(moves_d)

        # 7. SAG Turnaround Violations (Night wrap on Day d into Day call on Day d+1)
        TurnaroundVars = []
        for d in range(1, len(D)):
            night_scenes = [s for s in self.scenes if "NIGHT" in s.setting.value]
            day_scenes = [s for s in self.scenes if "DAY" in s.setting.value]

            if night_scenes and day_scenes:
                is_night_d = model.NewBoolVar(f"IsNight_{d}")
                for ns in night_scenes:
                    model.Add(is_night_d >= X[ns.scene_id, d])
                model.Add(is_night_d <= sum(X[ns.scene_id, d] for ns in night_scenes))

                is_day_next = model.NewBoolVar(f"IsDay_{d+1}")
                for ds in day_scenes:
                    model.Add(is_day_next >= X[ds.scene_id, d + 1])
                model.Add(is_day_next <= sum(X[ds.scene_id, d + 1] for ds in day_scenes))

                turn_violation = model.NewBoolVar(f"TurnViolation_{d}")
                model.AddMultiplicationEquality(turn_violation, [is_night_d, is_day_next])
                TurnaroundVars.append(turn_violation)

        # Multi-Objective Function
        model.Minimize(
            self.w_hold * sum(total_hold_vars) +
            self.w_move * sum(MoveVars) +
            self.w_turnaround * sum(TurnaroundVars)
        )

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        status_code = solver.Solve(model)

        runtime_ms = int((time.time() - start_time) * 1000)

        if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            status_str = "OPTIMAL" if status_code == cp_model.OPTIMAL else "FEASIBLE"

            # Reconstruct day-by-day schedule
            scheduled_days_dict: Dict[int, List[Scene]] = {d: [] for d in D}
            for d in D:
                for s in self.scenes:
                    if solver.Value(X[s.scene_id, d]) == 1:
                        scheduled_days_dict[d].append(s)

            # Build DaySchedule objects
            day_schedules: List[DaySchedule] = []
            total_moves = 0
            for d in D:
                scenes_on_day = scheduled_days_dict[d]
                total_duration = sum(sc.est_shoot_minutes for sc in scenes_on_day)
                day_locs = sorted(list({sc.location for sc in scenes_on_day}))
                day_moves = max(0, len(day_locs) - 1)
                total_moves += day_moves

                has_night = any("NIGHT" in sc.setting.value for sc in scenes_on_day)
                has_day = any("DAY" in sc.setting.value for sc in scenes_on_day)

                day_schedules.append(
                    DaySchedule(
                        day_number=d,
                        scenes=scenes_on_day,
                        total_duration_minutes=total_duration,
                        locations=day_locs,
                        company_moves=day_moves,
                        is_night=has_night,
                        is_day=has_day,
                    )
                )

            # Calculate DOOD
            dood_rows = calculate_dood_matrix(self.actors, scheduled_days_dict, self.num_days)
            total_hold_days = sum(r.hold_days for r in dood_rows)

            # Turnaround violations
            total_turnaround_violations = 0
            for d in range(len(day_schedules) - 1):
                if day_schedules[d].is_night and day_schedules[d + 1].is_day:
                    total_turnaround_violations += 1

            objective_cost = int(solver.ObjectiveValue())

            # Naive baseline estimation
            if naive_cost is None:
                naive_cost = (15 * self.w_hold) + (10 * self.w_move) + (1 * self.w_turnaround)
            cost_saved = max(0, naive_cost - objective_cost)

            compliance_rate = 1.0 if total_turnaround_violations == 0 else max(0.0, 1.0 - (total_turnaround_violations * 0.2))

            metrics = ScheduleMetrics(
                objective_cost=objective_cost,
                cost_saved_vs_naive=cost_saved,
                total_company_moves=total_moves,
                total_hold_days=total_hold_days,
                total_turnaround_violations=total_turnaround_violations,
                solver_runtime_ms=runtime_ms,
                union_compliance_rate=compliance_rate,
            )

            solution = ScheduleSolution(
                solution_id=f"sol_{uuid.uuid4().hex[:8]}",
                production_id="prod_neon_horizon",
                status=status_str,
                days=day_schedules,
                dood_matrix=dood_rows,
                metrics=metrics,
                disruptions_applied=disruptions,
            )
            return solution
        else:
            # Infeasibility Diagnostic & Arbitration Analysis
            tot_shoot_mins = sum(s.est_shoot_minutes for s in self.scenes)
            max_capacity = self.num_days * self.max_minutes_per_day
            capacity_overload = tot_shoot_mins > max_capacity

            # Find potentially deadlocked scenes
            deadlocked = []
            for s in self.scenes:
                disrupted_days = set()
                for alert in disruptions:
                    if alert.affected_actor_id and alert.affected_actor_id in s.cast_ids:
                        disrupted_days.update(alert.affected_shoot_days)
                    if alert.affected_location and alert.affected_location == s.location:
                        disrupted_days.update(alert.affected_shoot_days)
                available = [d for d in D if d not in disrupted_days]
                if not available:
                    deadlocked.append(f"Scene {s.scene_number} ({s.slugline}) has 0 feasible days")

            diag_reasons = []
            if capacity_overload:
                diag_reasons.append(f"Total shoot minutes ({tot_shoot_mins}m) exceed total schedule capacity ({max_capacity}m across {self.num_days} days).")
            if deadlocked:
                diag_reasons.append(f"Hard constraint deadlock: {'; '.join(deadlocked)}.")
            if not diag_reasons:
                diag_reasons.append("Precedence orderings and actor blackout/quarantine windows conflict with daily minute caps.")

            arbitration_memo = (
                f"### INFEASIBLE SCHEDULE DETECTED\n\n"
                f"**Root Cause Diagnosis:**\n" + "\n".join([f"- {r}" for r in diag_reasons]) + "\n\n"
                f"**Arbitration Recommendations (Cost-Optimal Relaxation):**\n"
                f"1. **Add Recovery Day:** Expand production horizon from {self.num_days} to {self.num_days + 1} days.\n"
                f"2. **Contract Waiver / Buyout:** Waive blackout for critical talent with union overtime penalty.\n"
                f"3. **Company Move Flexibility:** Relax daily minute cap by 60 minutes on non-turnaround days."
            )

            return ScheduleSolution(
                solution_id=f"sol_{uuid.uuid4().hex[:8]}",
                production_id="prod_neon_horizon",
                status="INFEASIBLE",
                days=[],
                dood_matrix=[],
                metrics=ScheduleMetrics(solver_runtime_ms=runtime_ms),
                disruptions_applied=disruptions,
                executive_memo=arbitration_memo,
            )

def generate_naive_schedule(
    scenes: List[Scene],
    actors: List[Actor],
    num_days: int = 5,
    max_minutes_per_day: int = 600,
    w_hold: int = 2000,
    w_move: int = 15000,
    w_turnaround: int = 25000
) -> ScheduleSolution:
    """
    Generates a raw, unoptimized schedule packing scenes in sequential script order.
    Demonstrates the baseline chaos before CP-SAT optimization.
    """
    scheduled_days_dict: Dict[int, List[Scene]] = {d: [] for d in range(1, num_days + 1)}
    current_day = 1
    current_day_minutes = 0

    for s in scenes:
        if current_day_minutes + s.est_shoot_minutes > max_minutes_per_day and current_day < num_days:
            current_day += 1
            current_day_minutes = 0
        scheduled_days_dict[current_day].append(s)
        current_day_minutes += s.est_shoot_minutes

    day_schedules: List[DaySchedule] = []
    total_moves = 0
    for d in range(1, num_days + 1):
        scs = scheduled_days_dict[d]
        tot_duration = sum(sc.est_shoot_minutes for sc in scs)
        day_locs = sorted(list({sc.location for sc in scs}))
        day_moves = max(0, len(day_locs) - 1)
        total_moves += day_moves
        has_night = any("NIGHT" in sc.setting.value for sc in scs)
        has_day = any("DAY" in sc.setting.value for sc in scs)

        day_schedules.append(
            DaySchedule(
                day_number=d,
                scenes=scs,
                total_duration_minutes=tot_duration,
                locations=day_locs,
                company_moves=day_moves,
                is_night=has_night,
                is_day=has_day,
            )
        )

    dood_rows = calculate_dood_matrix(actors, scheduled_days_dict, num_days)
    total_hold_days = sum(r.hold_days for r in dood_rows)

    total_turnaround_violations = 0
    for d in range(len(day_schedules) - 1):
        if day_schedules[d].is_night and day_schedules[d + 1].is_day:
            total_turnaround_violations += 1

    naive_cost = (total_hold_days * w_hold) + (total_moves * w_move) + (total_turnaround_violations * w_turnaround)

    metrics = ScheduleMetrics(
        objective_cost=naive_cost,
        cost_saved_vs_naive=0,
        total_company_moves=total_moves,
        total_hold_days=total_hold_days,
        total_turnaround_violations=total_turnaround_violations,
        solver_runtime_ms=0,
        union_compliance_rate=1.0 if total_turnaround_violations == 0 else max(0.0, 1.0 - (total_turnaround_violations * 0.25)),
    )

    return ScheduleSolution(
        solution_id=f"naive_{uuid.uuid4().hex[:8]}",
        production_id="prod_raw_unoptimized",
        status="RAW_UNOPTIMIZED",
        days=day_schedules,
        dood_matrix=dood_rows,
        metrics=metrics,
        disruptions_applied=[],
        executive_memo=(
            "⚠️ RAW SCRIPT-ORDER SCHEDULE LOADED (UNOPTIMIZED)\n\n"
            "Scenes are currently placed in sequential script order. Notice the high company moves, "
            "costly actor hold fees, and potential union turnaround violations.\n\n"
            "👉 Click 'RUN AUTONOMOUS CP-SAT OPTIMIZER' to let the mathematical engine solve the global optimum!"
        ),
    )
