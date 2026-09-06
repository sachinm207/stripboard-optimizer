import json
import os
import csv
import io
import re
from typing import List, Optional, Set, Dict
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.models.scene import Scene, SceneSetting
from backend.app.models.actor import Actor
from backend.app.models.disruption import DisruptionAlert
from backend.app.models.schedule import ScheduleSolution, DaySchedule, ScheduleMetrics
from backend.app.solver.cp_sat_model import StripboardSolver, generate_naive_schedule
from backend.app.solver.dood_calculator import calculate_dood_matrix
from backend.app.kafka.bus import event_bus, ALL_TOPICS
from backend.app.agents.memo_agent import ExecutiveMemoAgent
from backend.app.agents.union_agent import UnionComplianceAgent

from contextlib import asynccontextmanager

# In-memory application state
STATE = {
    "production_id": None,
    "title": None,
    "scenes": [],
    "actors": [],
    "num_days": 5,
    "max_minutes_per_day": 600,
    "w_hold": 2000,
    "w_move": 15000,
    "w_turnaround": 25000,
    "permit_lead_days": 0,
    "naive_cost": 0,
    "current_solution": None,
    "active_disruptions": [],
    "actor_blackouts": {},
    "location_blackouts": {},
    "dark_days": [],
    "soft_locks": {},
}

def run_solver(disruptions=None, naive_cost=None) -> ScheduleSolution:
    if disruptions is None:
        disruptions = STATE.get("active_disruptions", [])
    if naive_cost is None:
        naive_cost = STATE.get("naive_cost", None)

    solver = StripboardSolver(
        scenes=STATE["scenes"],
        actors=STATE["actors"],
        num_days=STATE["num_days"],
        max_minutes_per_day=STATE["max_minutes_per_day"],
        w_hold=STATE.get("w_hold", 2000),
        w_move=STATE.get("w_move", 15000),
        w_turnaround=STATE["w_turnaround"],
        permit_lead_days=STATE["permit_lead_days"]
    )
    solution = solver.solve(
        disruptions=disruptions,
        naive_cost=naive_cost,
        actor_blackouts=STATE.get("actor_blackouts", {}),
        location_blackouts=STATE.get("location_blackouts", {}),
        dark_days=STATE.get("dark_days", []),
        soft_locks=STATE.get("soft_locks", {})
    )
    solution.production_id = STATE.get("production_id", "prod_neon_horizon")
    return solution

memo_agent = ExecutiveMemoAgent()
union_agent = UnionComplianceAgent()

def load_seed_data(preset_filename: str = "neon_horizon.json", optimize: bool = False):
    data_path = os.path.join(os.path.dirname(__file__), "demo_data", preset_filename)
    if os.path.exists(data_path):
        with open(data_path, "r") as f:
            data = json.load(f)
            STATE["production_id"] = data.get("production_id", "prod_neon_horizon")
            STATE["title"] = data.get("title", "Neon Horizon")
            STATE["scenes"] = [Scene(**s) for s in data["scenes"]]
            STATE["actors"] = [Actor(**a) for a in data["actors"]]
            STATE["num_days"] = data.get("num_days", 5)
            STATE["max_minutes_per_day"] = data.get("max_minutes_per_day", 600)
            STATE["active_disruptions"] = []

    # Calculate naive script-order schedule baseline
    naive_solution = generate_naive_schedule(
        scenes=STATE["scenes"],
        actors=STATE["actors"],
        num_days=STATE["num_days"],
        max_minutes_per_day=STATE["max_minutes_per_day"],
        w_hold=STATE["w_hold"],
        w_move=STATE["w_move"],
        w_turnaround=STATE["w_turnaround"]
    )
    naive_solution.production_id = STATE["production_id"]
    STATE["naive_cost"] = naive_solution.metrics.objective_cost

    if not optimize:
        STATE["current_solution"] = naive_solution
    else:
        solver = StripboardSolver(
            scenes=STATE["scenes"],
            actors=STATE["actors"],
            num_days=STATE["num_days"],
            max_minutes_per_day=STATE["max_minutes_per_day"],
            w_turnaround=STATE["w_turnaround"],
            permit_lead_days=STATE["permit_lead_days"]
        )
        solution = solver.solve(disruptions=[], naive_cost=STATE["naive_cost"])
        solution.production_id = STATE["production_id"]
        solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
        STATE["current_solution"] = solution

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)

ws_manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Register subscriber for all kafka topics to broadcast to websockets
    for topic_name in ALL_TOPICS:
        def make_handler(t=topic_name):
            async def handler(payload):
                await ws_manager.broadcast({"topic": t, "payload": payload})
            return handler
        event_bus.subscribe(topic_name, make_handler(topic_name))

    if STATE["current_solution"]:
        await event_bus.publish("schedule.optimized.solution", STATE["current_solution"].model_dump())
    yield

app = FastAPI(
    title="StripBoard Optimizer API",
    description="Autonomous Event-Driven Film Stripboard Scheduling & Disruption Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Stripboard Optimizer Engine",
        "solver_ready": True,
        "scenes_loaded": len(STATE["scenes"]),
        "actors_loaded": len(STATE["actors"]),
    }

@app.get("/api/scenes", response_model=List[Scene])
def get_scenes():
    return STATE["scenes"]

@app.get("/api/actors", response_model=List[Actor])
def get_actors():
    return STATE["actors"]

@app.get("/api/schedule", response_model=ScheduleSolution)
def get_schedule():
    if not STATE["current_solution"]:
        raise HTTPException(status_code=404, detail="Schedule not yet generated")
    return STATE["current_solution"]

def parse_csv_production(
    csv_text: str,
    title: str = "CSV Production",
    num_days: Optional[int] = None,
    max_minutes_per_day: int = 600
):
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    scenes: List[Scene] = []
    actor_map: Dict[str, Actor] = {}
    actor_counter = 1

    for idx, row in enumerate(reader, start=1):
        clean_row = {k.strip().lower().replace(" ", "_"): (v or "").strip() for k, v in row.items() if k}
        sc_num = clean_row.get("scene_number") or clean_row.get("scene") or clean_row.get("sc") or str(idx)
        sc_id = f"SC_{str(idx).zfill(2)}"
        slug = clean_row.get("slugline") or clean_row.get("slug") or f"SCENE {sc_num} - GENERAL"

        slug_upper = slug.upper()
        if "EXT" in slug_upper and "NIGHT" in slug_upper:
            setting = SceneSetting.EXT_NIGHT
        elif "INT" in slug_upper and "NIGHT" in slug_upper:
            setting = SceneSetting.INT_NIGHT
        elif "EXT" in slug_upper and "DAY" in slug_upper:
            setting = SceneSetting.EXT_DAY
        elif "INT" in slug_upper and "DAY" in slug_upper:
            setting = SceneSetting.INT_DAY
        else:
            raw_set = clean_row.get("setting", "").upper().replace(" ", "_")
            if raw_set in [s.value for s in [SceneSetting.INT_DAY, SceneSetting.EXT_DAY, SceneSetting.INT_NIGHT, SceneSetting.EXT_NIGHT]]:
                setting = SceneSetting(raw_set)
            else:
                setting = SceneSetting.EXT_NIGHT if "NIGHT" in slug_upper else SceneSetting.INT_DAY

        loc = clean_row.get("location")
        if not loc:
            parts = slug.split("-")[0].replace("EXT.", "").replace("INT.", "").strip()
            loc = parts.title() if parts else "Main Stage"

        pages = int(float(clean_row.get("pages_eighths") or clean_row.get("pages") or 16))
        minutes = int(float(clean_row.get("est_shoot_minutes") or clean_row.get("shoot_minutes") or clean_row.get("minutes") or 150))
        desc = clean_row.get("description") or clean_row.get("desc") or f"Filming {slug}"

        raw_cast = clean_row.get("cast_names") or clean_row.get("cast") or clean_row.get("actors") or ""
        cast_ids = []
        if raw_cast:
            for name in re.split(r"[,;/]+", raw_cast):
                name = name.strip()
                if not name:
                    continue
                slug_name = re.sub(r"[^A-Za-z0-9]", "_", name.upper())
                act_id = f"ACTOR_{slug_name}"
                if act_id not in actor_map:
                    actor_map[act_id] = Actor(
                        actor_id=act_id,
                        name=name,
                        character_name=name,
                        cast_number=actor_counter,
                        day_rate=2500.0,
                        hold_rate=1200.0,
                        sag_tier="SAG_THEATRICAL_DAY_PLAYER",
                        is_principal=(actor_counter <= 3)
                    )
                    actor_counter += 1
                cast_ids.append(act_id)

        scenes.append(
            Scene(
                scene_id=sc_id,
                scene_number=str(sc_num),
                slugline=slug,
                setting=setting,
                location=loc,
                pages_eighths=pages,
                est_shoot_minutes=minutes,
                cast_ids=cast_ids,
                description=desc
            )
        )

    if not num_days or num_days <= 0:
        total_mins = sum(s.est_shoot_minutes for s in scenes)
        num_days = max(2, (total_mins + max_minutes_per_day - 1) // max_minutes_per_day)

    actors = list(actor_map.values())
    return scenes, actors, num_days

class ImportProductionRequest(BaseModel):
    production_id: str = "prod_custom"
    title: str = "Custom Production"
    num_days: int = 5
    max_minutes_per_day: int = 600
    scenes: List[Scene]
    actors: List[Actor]

@app.post("/api/production/import", response_model=ScheduleSolution)
async def import_production(req: ImportProductionRequest):
    STATE["production_id"] = req.production_id
    STATE["title"] = req.title
    STATE["scenes"] = req.scenes
    STATE["actors"] = req.actors
    STATE["num_days"] = req.num_days
    STATE["max_minutes_per_day"] = req.max_minutes_per_day
    STATE["active_disruptions"] = []

    solver = StripboardSolver(
        scenes=STATE["scenes"],
        actors=STATE["actors"],
        num_days=STATE["num_days"],
        max_minutes_per_day=STATE["max_minutes_per_day"],
        w_turnaround=STATE["w_turnaround"],
        permit_lead_days=STATE["permit_lead_days"]
    )
    solution = solver.solve(disruptions=[])
    solution.production_id = req.production_id
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("production.scene.catalog", [s.model_dump() for s in req.scenes])
    await event_bus.publish("actor.contract.constraints", [a.model_dump() for a in req.actors])
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class ImportCSVRequest(BaseModel):
    title: str = "Imported Production"
    csv_content: str
    num_days: Optional[int] = None
    max_minutes_per_day: int = 600
    w_turnaround: Optional[int] = 25000

@app.post("/api/production/import-csv", response_model=ScheduleSolution)
async def import_csv_production(req: ImportCSVRequest):
    try:
        scenes, actors, num_days = parse_csv_production(
            req.csv_content,
            title=req.title,
            num_days=req.num_days,
            max_minutes_per_day=req.max_minutes_per_day
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV breakdown: {str(e)}")

    if not scenes:
        raise HTTPException(status_code=400, detail="CSV contained no valid scenes.")

    STATE["production_id"] = "prod_" + re.sub(r"[^A-Za-z0-9]", "_", req.title.lower())
    STATE["title"] = req.title
    STATE["scenes"] = scenes
    STATE["actors"] = actors
    STATE["num_days"] = num_days
    STATE["max_minutes_per_day"] = req.max_minutes_per_day
    if req.w_turnaround:
        STATE["w_turnaround"] = req.w_turnaround
    STATE["active_disruptions"] = []

    solver = StripboardSolver(
        scenes=STATE["scenes"],
        actors=STATE["actors"],
        num_days=STATE["num_days"],
        max_minutes_per_day=STATE["max_minutes_per_day"],
        w_turnaround=STATE["w_turnaround"],
        permit_lead_days=STATE["permit_lead_days"]
    )
    solution = solver.solve(disruptions=[])
    solution.production_id = STATE["production_id"]
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("production.scene.catalog", [s.model_dump() for s in scenes])
    await event_bus.publish("actor.contract.constraints", [a.model_dump() for a in actors])
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class PresetPayload(BaseModel):
    preset_id: Optional[str] = "neon_horizon"
    optimize: bool = False

@app.post("/api/production/load-preset", response_model=ScheduleSolution)
async def load_preset(preset_id: Optional[str] = None, optimize: bool = False, payload: Optional[PresetPayload] = None):
    target_id = (payload.preset_id if payload and payload.preset_id else None) or preset_id or "neon_horizon"
    should_optimize = (payload.optimize if payload and payload.optimize is not None else optimize)
    filename = "neon_horizon_20d.json" if "20" in target_id else "neon_horizon.json"
    load_seed_data(preset_filename=filename, optimize=should_optimize)
    if not STATE["current_solution"]:
        raise HTTPException(status_code=500, detail="Could not load preset")
    await event_bus.publish("production.scene.catalog", [s.model_dump() for s in STATE["scenes"]])
    await event_bus.publish("actor.contract.constraints", [a.model_dump() for a in STATE["actors"]])
    await event_bus.publish("schedule.optimized.solution", STATE["current_solution"].model_dump())
    return STATE["current_solution"]

class LockSceneRequest(BaseModel):
    scene_id: str
    locked_day: Optional[int] = None

@app.post("/api/production/lock-scene", response_model=ScheduleSolution)
async def lock_scene_to_day(req: LockSceneRequest):
    for s in STATE["scenes"]:
        if s.scene_id == req.scene_id:
            s.locked_day = req.locked_day
            break

    solver = StripboardSolver(
        scenes=STATE["scenes"],
        actors=STATE["actors"],
        num_days=STATE["num_days"],
        max_minutes_per_day=STATE["max_minutes_per_day"],
        w_turnaround=STATE["w_turnaround"],
        permit_lead_days=STATE["permit_lead_days"]
    )
    solution = solver.solve(disruptions=STATE["active_disruptions"], naive_cost=STATE.get("naive_cost", None))
    solution.production_id = STATE.get("production_id", "prod_neon_horizon")
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class MoveSceneRequest(BaseModel):
    scene_id: str
    target_day: int

@app.post("/api/production/move-scene", response_model=ScheduleSolution)
async def move_scene_to_day(req: MoveSceneRequest):
    if not STATE["current_solution"]:
        raise HTTPException(status_code=400, detail="No schedule loaded to move scene in.")

    # Find the target scene
    target_scene = None
    for s in STATE["scenes"]:
        if s.scene_id == req.scene_id:
            target_scene = s
            # Ensure it is not locked when moved manually
            target_scene.locked_day = None
            break

    if not target_scene:
        raise HTTPException(status_code=404, detail="Scene not found.")

    # Reconstruct scheduled_days_dict from current solution
    scheduled_days_dict = {
        d.day_number: [s for s in d.scenes if s.scene_id != req.scene_id]
        for d in STATE["current_solution"].days
    }
    if req.target_day not in scheduled_days_dict:
        scheduled_days_dict[req.target_day] = []

    # Place target_scene without lock
    target_scene.locked_day = None
    scheduled_days_dict[req.target_day].append(target_scene)

    # Recompute DaySchedules
    day_schedules: List[DaySchedule] = []
    total_moves = 0
    for d in range(1, STATE["num_days"] + 1):
        scs = scheduled_days_dict.get(d, [])
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

    # Recompute DOOD
    dood_rows = calculate_dood_matrix(STATE["actors"], scheduled_days_dict, STATE["num_days"])
    total_hold_days = sum(r.hold_days for r in dood_rows)

    # Turnaround violations
    total_turnaround_violations = 0
    for d in range(len(day_schedules) - 1):
        if day_schedules[d].is_night and day_schedules[d + 1].is_day:
            total_turnaround_violations += 1

    current_cost = (total_hold_days * STATE["w_hold"]) + (total_moves * STATE["w_move"]) + (total_turnaround_violations * STATE["w_turnaround"])
    naive_baseline = STATE.get("naive_cost") or current_cost
    cost_saved = max(0, naive_baseline - current_cost)

    metrics = ScheduleMetrics(
        objective_cost=current_cost,
        cost_saved_vs_naive=cost_saved,
        total_company_moves=total_moves,
        total_hold_days=total_hold_days,
        total_turnaround_violations=total_turnaround_violations,
        solver_runtime_ms=0,
        union_compliance_rate=1.0 if total_turnaround_violations == 0 else max(0.0, 1.0 - (total_turnaround_violations * 0.25)),
    )

    STATE["current_solution"].days = day_schedules
    STATE["current_solution"].dood_matrix = dood_rows
    STATE["current_solution"].metrics = metrics

    await event_bus.publish("schedule.optimized.solution", STATE["current_solution"].model_dump())
    return STATE["current_solution"]

@app.post("/api/schedule/clear")
async def clear_production_schedule():
    STATE["production_id"] = None
    STATE["title"] = None
    STATE["scenes"] = []
    STATE["actors"] = []
    STATE["current_solution"] = None
    STATE["active_disruptions"] = []
    return {"status": "cleared"}

class SettingsUpdateRequest(BaseModel):
    w_turnaround: Optional[int] = None
    permit_lead_days: Optional[int] = None
    max_minutes_per_day: Optional[int] = None

@app.get("/api/production/settings")
def get_production_settings():
    return {
        "w_turnaround": STATE["w_turnaround"],
        "permit_lead_days": STATE["permit_lead_days"],
        "max_minutes_per_day": STATE["max_minutes_per_day"],
        "num_days": STATE["num_days"],
    }

@app.post("/api/production/settings", response_model=ScheduleSolution)
async def update_production_settings(req: SettingsUpdateRequest):
    if req.w_turnaround is not None:
        STATE["w_turnaround"] = req.w_turnaround
        union_agent.forced_call_penalty = req.w_turnaround
    if req.permit_lead_days is not None:
        STATE["permit_lead_days"] = req.permit_lead_days
    if req.max_minutes_per_day is not None:
        STATE["max_minutes_per_day"] = req.max_minutes_per_day

    solution = run_solver()
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class UpdateConstraintsRequest(BaseModel):
    actor_blackouts: Optional[Dict[str, List[int]]] = None
    location_blackouts: Optional[Dict[str, List[int]]] = None
    dark_days: Optional[List[int]] = None
    soft_locks: Optional[Dict[str, List[int]]] = None

@app.get("/api/production/constraints")
def get_production_constraints():
    return {
        "actor_blackouts": STATE.get("actor_blackouts", {}),
        "location_blackouts": STATE.get("location_blackouts", {}),
        "dark_days": STATE.get("dark_days", []),
        "soft_locks": STATE.get("soft_locks", {}),
    }

@app.post("/api/production/constraints", response_model=ScheduleSolution)
async def update_production_constraints(req: UpdateConstraintsRequest):
    if req.actor_blackouts is not None:
        STATE["actor_blackouts"] = req.actor_blackouts
    if req.location_blackouts is not None:
        STATE["location_blackouts"] = req.location_blackouts
    if req.dark_days is not None:
        STATE["dark_days"] = req.dark_days
    if req.soft_locks is not None:
        STATE["soft_locks"] = req.soft_locks

    solution = run_solver()
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class ToggleSoftLockRequest(BaseModel):
    entity_id: str
    day: int
    active: Optional[bool] = None

@app.post("/api/production/toggle-soft-lock", response_model=ScheduleSolution)
async def toggle_soft_lock(req: ToggleSoftLockRequest):
    soft = STATE.setdefault("soft_locks", {})
    entity_days = soft.setdefault(req.entity_id, [])
    
    if req.active is True:
        if req.day not in entity_days:
            entity_days.append(req.day)
    elif req.active is False:
        if req.day in entity_days:
            entity_days.remove(req.day)
    else:
        # Toggle
        if req.day in entity_days:
            entity_days.remove(req.day)
        else:
            entity_days.append(req.day)

    solution = run_solver()
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

@app.post("/api/production/clear-soft-locks", response_model=ScheduleSolution)
async def clear_soft_locks():
    STATE["soft_locks"] = {}
    solution = run_solver()
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class SolveRequest(BaseModel):
    disruptions: Optional[List[DisruptionAlert]] = None
    w_turnaround: Optional[int] = None
    permit_lead_days: Optional[int] = None

@app.post("/api/schedule/solve", response_model=ScheduleSolution)
async def solve_schedule(request: Optional[SolveRequest] = None):
    disruptions = (request.disruptions if request and request.disruptions is not None else STATE["active_disruptions"])
    w_turnaround = (request.w_turnaround if request and request.w_turnaround is not None else STATE["w_turnaround"])
    permit_lead_days = (request.permit_lead_days if request and request.permit_lead_days is not None else STATE["permit_lead_days"])

    solver = StripboardSolver(
        scenes=STATE["scenes"],
        actors=STATE["actors"],
        num_days=STATE["num_days"],
        max_minutes_per_day=STATE["max_minutes_per_day"],
        w_turnaround=w_turnaround,
        permit_lead_days=permit_lead_days
    )
    solution = solver.solve(disruptions=disruptions, naive_cost=STATE.get("naive_cost", None))
    if solution.status == "INFEASIBLE":
        raise HTTPException(status_code=422, detail="No feasible schedule found satisfying all constraints.")

    solution.production_id = STATE.get("production_id", "prod_neon_horizon")
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

@app.post("/api/schedule/disrupt", response_model=ScheduleSolution)
async def inject_disruption(alert: DisruptionAlert):
    STATE["active_disruptions"].append(alert)
    await event_bus.publish("schedule.disruption.alert", alert.model_dump())

    solution = run_solver(disruptions=STATE["active_disruptions"])
    solution.executive_memo = memo_agent.generate_memo(solution, disruption_reason=alert.reason, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

class DisruptBatchRequest(BaseModel):
    alerts: List[DisruptionAlert]

@app.post("/api/schedule/disrupt-batch", response_model=ScheduleSolution)
async def inject_disruption_batch(req: DisruptBatchRequest):
    for alert in req.alerts:
        STATE["active_disruptions"].append(alert)
        await event_bus.publish("schedule.disruption.alert", alert.model_dump())

    solution = run_solver(disruptions=STATE["active_disruptions"])
    summary_reasons = "; ".join([a.reason for a in req.alerts])
    solution.executive_memo = memo_agent.generate_memo(solution, disruption_reason=summary_reasons, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

@app.post("/api/schedule/reset", response_model=ScheduleSolution)
async def reset_schedule():
    STATE["active_disruptions"] = []
    STATE["soft_locks"] = {}
    for s in STATE["scenes"]:
        s.locked_day = None
    solution = run_solver(disruptions=[])
    solution.executive_memo = memo_agent.generate_memo(solution, use_ai=False)
    STATE["current_solution"] = solution
    await event_bus.publish("schedule.optimized.solution", solution.model_dump())
    return solution

@app.post("/api/memo/generate")
async def generate_gemini_memo():
    if not STATE["current_solution"]:
        raise HTTPException(status_code=404, detail="No schedule available")
    memo = memo_agent.generate_memo(STATE["current_solution"], use_ai=True)
    STATE["current_solution"].executive_memo = memo
    return {"memo": memo}

@app.get("/api/events")
def get_events(topic: Optional[str] = None):
    return event_bus.get_events(topic=topic)

@app.get("/api/kafka/status")
def get_kafka_status():
    return {
        "is_confluent_connected": event_bus.is_confluent_connected,
        "topics": ALL_TOPICS,
        "total_events_logged": len(event_bus.get_events()),
        "active_websocket_subscribers": len(ws_manager.active_connections)
    }

@app.get("/api/union/audit")
def get_union_audit():
    if not STATE["current_solution"]:
        raise HTTPException(status_code=404, detail="No schedule available to audit")
    return union_agent.audit_schedule(STATE["current_solution"])

@app.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Push current schedule upon initial connection
        if STATE["current_solution"]:
            await websocket.send_json({
                "topic": "schedule.optimized.solution",
                "payload": STATE["current_solution"].model_dump()
            })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Serve built frontend SPA if available
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


