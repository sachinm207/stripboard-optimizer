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




