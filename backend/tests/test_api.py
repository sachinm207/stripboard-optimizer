import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_test_production():
    client.post("/api/production/load-preset", json={"preset_id": "neon_horizon", "optimize": True})

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["scenes_loaded"] > 0
    assert data["actors_loaded"] > 0

def test_get_scenes():
    response = client.get("/api/scenes")
    assert response.status_code == 200
    scenes = response.json()
    assert len(scenes) >= 10

def test_get_actors():
    response = client.get("/api/actors")
    assert response.status_code == 200
    actors = response.json()
    assert len(actors) >= 5

def test_get_initial_schedule():
    response = client.get("/api/schedule")
    assert response.status_code == 200
    solution = response.json()
    assert solution["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(solution["days"]) == 5
    assert len(solution["dood_matrix"]) > 0
    assert solution["executive_memo"] is not None

def test_inject_disruption_and_reschedule():
    payload = {
        "alert_id": "test_alert_covid",
        "production_id": "prod_neon_horizon",
        "disruption_type": "ACTOR_ILLNESS",
        "severity": "CRITICAL",
        "affected_actor_id": "ACTOR_MARCUS",
        "affected_shoot_days": [3],
        "reason": "Actor quarantined Day 3",
    }
    response = client.post("/api/schedule/disrupt", json=payload)
    assert response.status_code == 200
    solution = response.json()
    assert solution["status"] in ("OPTIMAL", "FEASIBLE")

    # Day 3 should not have Marcus
    day_3 = next(d for d in solution["days"] if d["day_number"] == 3)
    for sc in day_3["scenes"]:
        assert "ACTOR_MARCUS" not in sc["cast_ids"]

    # Verify event bus logged the disruption
    events_res = client.get("/api/events")
    assert events_res.status_code == 200
    events = events_res.json()
    assert any(e["topic"] == "schedule.disruption.alert" for e in events)

def test_kafka_status():
    res = client.get("/api/kafka/status")
    assert res.status_code == 200
    data = res.json()
    assert "topics" in data
    assert len(data["topics"]) == 5
    assert "is_confluent_connected" in data

def test_union_audit():
    res = client.get("/api/union/audit")
    assert res.status_code == 200
    audit = res.json()
    assert "compliance_score" in audit
    assert "status" in audit
    assert audit["compliance_score"] >= 0.0

def test_websocket_stream():
    with client.websocket_connect("/ws/events") as ws:
        # Initial message pushed on connect is current solution
        init_data = ws.receive_json()
        assert init_data["topic"] == "schedule.optimized.solution"
        assert "days" in init_data["payload"]

        # Send ping
        ws.send_text("ping")
        reply = ws.receive_text()
        assert reply == "pong"

def test_frontend_spa_served():
    res = client.get("/")
    assert res.status_code == 200
    assert '<div id="root"></div>' in res.text
    assert "StripBoard Optimizer" in res.text

def test_import_custom_production():
    payload = {
        "production_id": "prod_indie_short",
        "title": "Indie Short Film",
        "num_days": 3,
        "max_minutes_per_day": 480,
        "actors": [
            {
                "actor_id": "ACTOR_ALICE",
                "name": "Alice Star",
                "character_name": "Alice",
                "daily_rate": 3000,
                "hold_rate": 1500,
                "blackout_days": []
            },
            {
                "actor_id": "ACTOR_BOB",
                "name": "Bob Lead",
                "character_name": "Bob",
                "daily_rate": 2500,
                "hold_rate": 1000,
                "blackout_days": []
            }
        ],
        "scenes": [
            {
                "scene_id": "SC_INDIE_01",
                "scene_number": "1",
                "slugline": "INT. COFFEE SHOP - DAY",
                "setting": "INT_DAY",
                "location": "Downtown Cafe",
                "pages_eighths": 12,
                "est_shoot_minutes": 180,
                "cast_ids": ["ACTOR_ALICE", "ACTOR_BOB"],
                "description": "Alice confronts Bob over stolen script."
            },
            {
                "scene_id": "SC_INDIE_02",
                "scene_number": "2",
                "slugline": "EXT. PARK BENCH - DAY",
                "setting": "EXT_DAY",
                "location": "City Park",
                "pages_eighths": 8,
                "est_shoot_minutes": 120,
                "cast_ids": ["ACTOR_ALICE"],
                "description": "Alice ponders her next move alone."
            },
            {
                "scene_id": "SC_INDIE_03",
                "scene_number": "3",
                "slugline": "INT. APARTMENT - NIGHT",
                "setting": "INT_NIGHT",
                "location": "Bob's Loft",
                "pages_eighths": 16,
                "est_shoot_minutes": 200,
                "cast_ids": ["ACTOR_BOB"],
                "description": "Bob burns the evidence."
            }
        ]
    }
    res = client.post("/api/production/import", json=payload)
    assert res.status_code == 200
    sol = res.json()
    assert sol["status"] in ("OPTIMAL", "FEASIBLE")
    assert sol["production_id"] == "prod_indie_short"
    assert len(sol["days"]) == 3

def test_import_csv_production():
    csv_data = """scene_number,slugline,setting,location,pages_eighths,est_shoot_minutes,cast_names,description
1,EXT. WAREHOUSE - NIGHT,EXT_NIGHT,Warehouse,16,180,"Sarah, Leo",Opening standoff
2,INT. WAREHOUSE - NIGHT,INT_NIGHT,Warehouse,24,200,"Sarah, Marcus",Gunfight in docks
3,INT. PRECINCT - DAY,INT_DAY,Precinct,20,160,"Marcus, Alvarez",Chief orders investigation
4,EXT. ROOFTOP - NIGHT,EXT_NIGHT,Warehouse,12,140,"Sarah",Sarah escapes over roof
"""
    res = client.post("/api/production/import-csv", json={
        "title": "CSV Action Thriller",
        "csv_content": csv_data,
        "num_days": 3,
        "max_minutes_per_day": 600
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(data["days"]) == 3
    assert len(data["dood_matrix"]) >= 3

def test_load_20d_preset():
    res = client.post("/api/production/load-preset?preset_id=neon_horizon_20d")
    assert res.status_code == 200
    sol = res.json()
    assert sol["status"] == "RAW_UNOPTIMIZED"
    assert len(sol["days"]) == 20

    # Solve it
    solve_res = client.post("/api/schedule/solve")
    assert solve_res.status_code == 200
    solved_sol = solve_res.json()
    assert solved_sol["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(solved_sol["days"]) == 20
    assert len(solved_sol["dood_matrix"]) >= 8

def test_batch_disruptions():
    alerts = [
        {
            "alert_id": "batch_alert_1",
            "production_id": "prod_test",
            "disruption_type": "ACTOR_ILLNESS",
            "severity": "CRITICAL",
            "affected_actor_id": "ACTOR_SARAH",
            "affected_shoot_days": [2],
            "reason": "Actor fever isolation"
        },
        {
            "alert_id": "batch_alert_2",
            "production_id": "prod_test",
            "disruption_type": "WEATHER_EVENT",
            "severity": "CRITICAL",
            "affected_location": "Warehouse District",
            "affected_shoot_days": [1],
            "reason": "Warehouse road closure"
        }
    ]
    res = client.post("/api/schedule/disrupt-batch", json={"alerts": alerts})
    assert res.status_code == 200
    sol = res.json()
    assert sol["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(sol["disruptions_applied"]) >= 2

def test_production_settings():
    res = client.get("/api/production/settings")
    assert res.status_code == 200
    data = res.json()
    assert "w_turnaround" in data
    assert "permit_lead_days" in data
    assert "max_minutes_per_day" in data

    update_res = client.post("/api/production/settings", json={
        "w_turnaround": 30000,
        "permit_lead_days": 2,
        "max_minutes_per_day": 540
    })
    assert update_res.status_code == 200
    sol = update_res.json()
    assert sol["status"] in ("OPTIMAL", "FEASIBLE")

    verify_res = client.get("/api/production/settings")
    assert verify_res.json()["w_turnaround"] == 30000
    assert verify_res.json()["permit_lead_days"] == 2
    assert verify_res.json()["max_minutes_per_day"] == 540

def test_move_scene_without_locking():
    # Reset to baseline first
    res = client.post("/api/schedule/reset")
    assert res.status_code == 200

    # Move scene SC_01 to Day 3
    move_res = client.post("/api/production/move-scene", json={
        "scene_id": "SC_01",
        "target_day": 3
    })
    assert move_res.status_code == 200
    data = move_res.json()

    # Verify scene is on Day 3 but NOT locked
    day3_scenes = [s for day in data["days"] if day["day_number"] == 3 for s in day["scenes"]]
    sc_01 = next((s for s in day3_scenes if s["scene_id"] == "SC_01"), None)
    assert sc_01 is not None
    assert sc_01.get("locked_day") is None, "Moving scene must not lock it!"

def test_reset_schedule_unlocks_and_restores():
    # Lock a scene
    lock_res = client.post("/api/production/lock-scene", json={
        "scene_id": "SC_02",
        "locked_day": 4
    })
    assert lock_res.status_code == 200

    # Reset
    reset_res = client.post("/api/schedule/reset")
    assert reset_res.status_code == 200
    data = reset_res.json()
    assert data["status"] in ("OPTIMAL", "FEASIBLE")

    # Verify no scene has locked_day set
    for day in data["days"]:
        for s in day["scenes"]:
            assert s.get("locked_day") is None

def test_constraints_get_and_post():
    client.post("/api/schedule/reset")
    get_res = client.get("/api/production/constraints")
    assert get_res.status_code == 200
    c_data = get_res.json()
    assert "actor_blackouts" in c_data
    assert "location_blackouts" in c_data
    assert "dark_days" in c_data

    # Update Tier 1 hard constraints: Sarah unavailable Day 2, Warehouse closed Day 1
    post_res = client.post("/api/production/constraints", json={
        "actor_blackouts": {"ACTOR_SARAH": [2]},
        "location_blackouts": {"Warehouse": [1]},
        "dark_days": []
    })
    assert post_res.status_code == 200
    sol = post_res.json()
    assert sol["status"] in ("OPTIMAL", "FEASIBLE")

    # Verify Sarah is NOT scheduled on Day 2
    day2_scenes = [s for d in sol["days"] if d["day_number"] == 2 for s in d["scenes"]]
    for s in day2_scenes:
        assert "ACTOR_SARAH" not in s["cast_ids"]

def test_planned_dark_day_cascade():
    client.post("/api/schedule/reset")
    # Mark Day 3 as Dark Day / Festival
    res = client.post("/api/production/constraints", json={
        "dark_days": [3]
    })
    assert res.status_code == 200
    sol = res.json()

    day3 = next(d for d in sol["days"] if d["day_number"] == 3)
    assert day3["is_dark_day"] is True
    assert len(day3["scenes"]) == 0
    assert day3["total_duration_minutes"] == 0

def test_sudden_emergency_day_shutdown():
    client.post("/api/schedule/reset")
    # Inject sudden DAY_SHUTDOWN on Day 2 via Chaos
    alert_res = client.post("/api/schedule/disrupt", json={
        "alert_id": "sudden_curfew_01",
        "production_id": "prod_neon_horizon",
        "disruption_type": "DAY_SHUTDOWN",
        "severity": "CRITICAL",
        "affected_shoot_days": [2],
        "reason": "Emergency flood curfew"
    })
    assert alert_res.status_code == 200
    sol = alert_res.json()

    day2 = next(d for d in sol["days"] if d["day_number"] == 2)
    assert day2["is_dark_day"] is True
    assert len(day2["scenes"]) == 0

def test_soft_locks_toggle_and_clear():
    client.post("/api/schedule/reset")
    # Toggle soft lock for ACTOR_SARAH on Day 1
    toggle_res = client.post("/api/production/toggle-soft-lock", json={
        "entity_id": "ACTOR_SARAH",
        "day": 1
    })
    assert toggle_res.status_code == 200
    sol = toggle_res.json()
    assert 1 in sol["soft_locks"].get("ACTOR_SARAH", [])

    # Clear soft locks
    clear_res = client.post("/api/production/clear-soft-locks")
    assert clear_res.status_code == 200
    sol_cleared = clear_res.json()
    assert len(sol_cleared.get("soft_locks", {})) == 0

def test_versions_save_restore_diff():
    # 1. Reset baseline
    client.post("/api/schedule/reset")

    # 2. Check initial versions list
    v_res = client.get("/api/versions")
    assert v_res.status_code == 200
    versions = v_res.json()
    assert len(versions) >= 1
    v1 = versions[0]
    assert "version_id" in v1
    v1_id = v1["version_id"]

    # 3. Save a new version explicitly
    save_res = client.post("/api/versions", json={
        "label": "Version 1 Baseline Snapshot",
        "notes": "Testing hard constraints version"
    })
    assert save_res.status_code == 200
    v_saved = save_res.json()
    assert v_saved["label"] == "Version 1 Baseline Snapshot"
    v_saved_id = v_saved["version_id"]

    # 4. Modify current WIP hard constraints:
    # - Add Dark Day 3 (Company off day)
    # - Add Actor Sarah blackout Day 2
    # - Add Location Warehouse blackout Day 1
    # - Throw Chaos: Force Majeure Day 5 shutdown
    client.post("/api/production/constraints", json={
        "dark_days": [3],
        "actor_blackouts": {"ACTOR_SARAH": [2]},
        "location_blackouts": {"Warehouse District": [1]}
    })
    client.post("/api/schedule/disrupt", json={
        "alert_id": "test_chaos_01",
        "production_id": "prod_neon_horizon",
        "disruption_type": "DAY_SHUTDOWN",
        "severity": "CRITICAL",
        "affected_shoot_days": [5],
        "reason": "Sudden emergency curfew"
    })

    # 5. Diff saved version vs current WIP
    diff_wip_res = client.post("/api/versions/diff", json={
        "base_version_id": v_saved_id,
        "target_version_id": "current_wip"
    })
    assert diff_wip_res.status_code == 200
    diff_wip = diff_wip_res.json()
    assert diff_wip["base_version_id"] == v_saved_id
    assert diff_wip["target_version_id"] == "current_wip"
    assert 3 in diff_wip["dark_days_added"]
    assert any(a["actor_id"] == "ACTOR_SARAH" and 2 in a["added_off_days"] for a in diff_wip["actor_blackouts_diff"])
    assert any(l["location"] == "Warehouse District" and 1 in l["added_off_days"] for l in diff_wip["location_blackouts_diff"])
    assert any(c["alert_id"] == "test_chaos_01" for c in diff_wip["chaos_disruptions_diff"])
    assert diff_wip["total_changes_count"] >= 4

    # 6. Save WIP as Version 2
    save_v2_res = client.post("/api/versions", json={
        "label": "Version 2 Constraints",
        "notes": "Added dark day and blackouts"
    })
    assert save_v2_res.status_code == 200
    v2 = save_v2_res.json()
    v2_id = v2["version_id"]

    # 7. Diff Version 1 vs Version 2
    diff_v1_v2 = client.post("/api/versions/diff", json={
        "base_version_id": v_saved_id,
        "target_version_id": v2_id
    })
    assert diff_v1_v2.status_code == 200
    diff_data = diff_v1_v2.json()
    assert diff_data["base_version_id"] == v_saved_id
    assert diff_data["target_version_id"] == v2_id
    assert 3 in diff_data["dark_days_added"]
    assert len(diff_data["actor_blackouts_diff"]) >= 1

    # 8. Restore Version 1 Baseline
    restore_res = client.post(f"/api/versions/{v_saved_id}/restore")
    assert restore_res.status_code == 200
    restored_sol = restore_res.json()
    assert restored_sol["status"] in ["OPTIMAL", "FEASIBLE"]



