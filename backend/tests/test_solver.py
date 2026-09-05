import json
import os
import pytest
from backend.app.models.scene import Scene
from backend.app.models.actor import Actor
from backend.app.models.disruption import DisruptionAlert, DisruptionType
from backend.app.solver.cp_sat_model import StripboardSolver

@pytest.fixture
def sample_data():
    data_path = os.path.join(
        os.path.dirname(__file__), "..", "app", "demo_data", "neon_horizon.json"
    )
    with open(data_path, "r") as f:
        data = json.load(f)
    scenes = [Scene(**s) for s in data["scenes"]]
    actors = [Actor(**a) for a in data["actors"]]
    return scenes, actors, data["num_days"], data["max_minutes_per_day"]

def test_initial_schedule_solve(sample_data):
    scenes, actors, num_days, max_minutes = sample_data
    solver = StripboardSolver(scenes, actors, num_days, max_minutes)
    solution = solver.solve()

    assert solution.status in ("OPTIMAL", "FEASIBLE")
    assert len(solution.days) == num_days

    # Verify all scenes are scheduled
    scheduled_scene_ids = []
    for day in solution.days:
        assert day.total_duration_minutes <= max_minutes
        for sc in day.scenes:
            scheduled_scene_ids.append(sc.scene_id)
    assert len(scheduled_scene_ids) == len(scenes)
    assert set(scheduled_scene_ids) == {s.scene_id for s in scenes}

    # Verify DOOD matrix
    assert len(solution.dood_matrix) == len(actors)
    for row in solution.dood_matrix:
        assert len(row.day_codes) == num_days
        assert row.talent_cost >= 0

    print(f"\n[Test Result] Initial solver runtime: {solution.metrics.solver_runtime_ms} ms, Status: {solution.status}")
    print(f"Company moves: {solution.metrics.total_company_moves}, Hold days: {solution.metrics.total_hold_days}")

def test_disruption_actor_illness(sample_data):
    scenes, actors, num_days, max_minutes = sample_data
    solver = StripboardSolver(scenes, actors, num_days, max_minutes)

    # Disruption: Sarah Vance is sick on Day 2
    alert = DisruptionAlert(
        alert_id="alert_sarah_sick_d2",
        production_id="prod_neon_horizon",
        disruption_type=DisruptionType.ACTOR_ILLNESS,
        affected_actor_id="ACTOR_SARAH",
        affected_shoot_days=[2],
        reason="Lead actor 48-hour medical isolation"
    )

    solution = solver.solve(disruptions=[alert])
    assert solution.status in ("OPTIMAL", "FEASIBLE")

    # Verify Sarah Vance does NOT shoot on Day 2
    day_2 = next(d for d in solution.days if d.day_number == 2)
    for sc in day_2.scenes:
        assert "ACTOR_SARAH" not in sc.cast_ids

def test_disruption_location_unavailable(sample_data):
    scenes, actors, num_days, max_minutes = sample_data
    solver = StripboardSolver(scenes, actors, num_days, max_minutes)

    # Disruption: Neon Alley is flooded on Day 1
    alert = DisruptionAlert(
        alert_id="alert_flood_d1",
        production_id="prod_neon_horizon",
        disruption_type=DisruptionType.WEATHER_EVENT,
        affected_location="Neon Alley",
        affected_shoot_days=[1],
        reason="Severe flash flood warning"
    )

    solution = solver.solve(disruptions=[alert])
    assert solution.status in ("OPTIMAL", "FEASIBLE")

    # Verify Neon Alley is NOT used on Day 1
    day_1 = next(d for d in solution.days if d.day_number == 1)
    for sc in day_1.scenes:
        assert sc.location != "Neon Alley"
