from typing import List, Dict, Set
from backend.app.models.version import (
    ScheduleVersion,
    VersionDiffResult,
    VersionDiffActorChange,
    VersionDiffLocationChange,
    VersionDiffDayChange
)

def compute_version_diff(base: ScheduleVersion, target: ScheduleVersion) -> VersionDiffResult:
    # 1. Cost & metric deltas
    cost_delta = target.total_cost - base.total_cost
    moves_delta = target.company_moves - base.company_moves
    hold_days_delta = target.hold_days - base.hold_days
    
    b_turn = base.solution.metrics.total_turnaround_violations if base.solution and base.solution.metrics else 0
    t_turn = target.solution.metrics.total_turnaround_violations if target.solution and target.solution.metrics else 0
    turnaround_delta = t_turn - b_turn

    # 2. Actor DOOD changes
    actor_changes: List[VersionDiffActorChange] = []
    base_dood_map = {row.actor_id: row for row in (base.solution.dood_matrix if base.solution else [])}
    target_dood_map = {row.actor_id: row for row in (target.solution.dood_matrix if target.solution else [])}
    all_actor_ids = sorted(list(set(base_dood_map.keys()) | set(target_dood_map.keys())))

    for act_id in all_actor_ids:
        b_row = base_dood_map.get(act_id)
        t_row = target_dood_map.get(act_id)

        name = t_row.name if t_row else (b_row.name if b_row else act_id)
        char_name = t_row.character_name if t_row else (b_row.character_name if b_row else "")

        b_codes = b_row.day_codes if b_row else []
        t_codes = t_row.day_codes if t_row else []

        max_days = max(len(b_codes), len(t_codes))
        work_before = [d + 1 for d, c in enumerate(b_codes) if c == 'W']
        work_after = [d + 1 for d, c in enumerate(t_codes) if c == 'W']

        status_changes: Dict[int, Dict[str, str]] = {}
        for d_idx in range(max_days):
            b_c = b_codes[d_idx] if d_idx < len(b_codes) else "-"
            t_c = t_codes[d_idx] if d_idx < len(t_codes) else "-"
            if b_c != t_c:
                status_changes[d_idx + 1] = {"before": b_c, "after": t_c}

        b_hold = b_row.hold_days if b_row else 0
        t_hold = t_row.hold_days if t_row else 0
        b_cost = b_row.talent_cost if b_row else 0
        t_cost = t_row.talent_cost if t_row else 0

        if work_before != work_after or b_hold != t_hold or status_changes or b_cost != t_cost:
            actor_changes.append(
                VersionDiffActorChange(
                    actor_id=act_id,
                    actor_name=name,
                    character_name=char_name,
                    work_days_before=work_before,
                    work_days_after=work_after,
                    hold_days_before=b_hold,
                    hold_days_after=t_hold,
                    status_changes=status_changes,
                    cost_before=b_cost,
                    cost_after=t_cost,
                )
            )

    # 3. Location changes
    location_changes: List[VersionDiffLocationChange] = []
    base_loc_days: Dict[str, Set[int]] = {}
    base_loc_scenes: Dict[str, int] = {}
    if base.solution and base.solution.days:
        for d in base.solution.days:
            for loc in d.locations:
                base_loc_days.setdefault(loc, set()).add(d.day_number)
            for sc in d.scenes:
                base_loc_scenes[sc.location] = base_loc_scenes.get(sc.location, 0) + 1

    target_loc_days: Dict[str, Set[int]] = {}
    target_loc_scenes: Dict[str, int] = {}
    if target.solution and target.solution.days:
        for d in target.solution.days:
            for loc in d.locations:
                target_loc_days.setdefault(loc, set()).add(d.day_number)
            for sc in d.scenes:
                target_loc_scenes[sc.location] = target_loc_scenes.get(sc.location, 0) + 1

    all_locs = sorted(list(set(base_loc_days.keys()) | set(target_loc_days.keys())))
    for loc in all_locs:
        b_days = sorted(list(base_loc_days.get(loc, set())))
        t_days = sorted(list(target_loc_days.get(loc, set())))
        b_sc_count = base_loc_scenes.get(loc, 0)
        t_sc_count = target_loc_scenes.get(loc, 0)
        if b_days != t_days or b_sc_count != t_sc_count:
            location_changes.append(
                VersionDiffLocationChange(
                    location=loc,
                    days_before=b_days,
                    days_after=t_days,
                    scenes_count_before=b_sc_count,
                    scenes_count_after=t_sc_count,
                )
            )

    # 4. Day-by-Day scene and status changes
    day_changes: List[VersionDiffDayChange] = []
    base_day_map = {d.day_number: d for d in (base.solution.days if base.solution else [])}
    target_day_map = {d.day_number: d for d in (target.solution.days if target.solution else [])}
    max_num_days = max(
        max(base_day_map.keys(), default=0),
        max(target_day_map.keys(), default=0)
    )

    for d_num in range(1, max_num_days + 1):
        b_day = base_day_map.get(d_num)
        t_day = target_day_map.get(d_num)

        b_sc_ids = [s.scene_id for s in (b_day.scenes if b_day else [])]
        t_sc_ids = [s.scene_id for s in (t_day.scenes if t_day else [])]

        added = [s for s in t_sc_ids if s not in b_sc_ids]
        removed = [s for s in b_sc_ids if s not in t_sc_ids]

        is_dark_b = b_day.is_dark_day if b_day else False
        is_dark_t = t_day.is_dark_day if t_day else False

        dur_b = b_day.total_duration_minutes if b_day else 0
        dur_t = t_day.total_duration_minutes if t_day else 0

        locs_b = b_day.locations if b_day else []
        locs_t = t_day.locations if t_day else []

        if b_sc_ids != t_sc_ids or is_dark_b != is_dark_t or dur_b != dur_t or locs_b != locs_t:
            day_changes.append(
                VersionDiffDayChange(
                    day_number=d_num,
                    is_dark_before=is_dark_b,
                    is_dark_after=is_dark_t,
                    dark_reason_before=b_day.dark_day_reason if b_day else None,
                    dark_reason_after=t_day.dark_day_reason if t_day else None,
                    scenes_before=b_sc_ids,
                    scenes_after=t_sc_ids,
                    scenes_added=added,
                    scenes_removed=removed,
                    duration_before=dur_b,
                    duration_after=dur_t,
                    locations_before=locs_b,
                    locations_after=locs_t,
                )
            )

    # 5. Dark days
    base_dark = set(base.dark_days)
    target_dark = set(target.dark_days)
    dark_days_added = sorted(list(target_dark - base_dark))
    dark_days_removed = sorted(list(base_dark - target_dark))

    # 6. Generate human-readable summary
    summary_parts = []
    if cost_delta != 0:
        sign = "+" if cost_delta > 0 else "-"
        summary_parts.append(f"Budget: {sign}${abs(cost_delta):,}")
    if moves_delta != 0:
        summary_parts.append(f"Company Moves: {moves_delta:+d}")
    if hold_days_delta != 0:
        summary_parts.append(f"Hold Days: {hold_days_delta:+d}")
    if actor_changes:
        summary_parts.append(f"{len(actor_changes)} actor schedule changes")
    if location_changes:
        summary_parts.append(f"{len(location_changes)} location schedule shifts")
    if day_changes:
        summary_parts.append(f"{len(day_changes)} days affected")
    if dark_days_added:
        summary_parts.append(f"Dark Days added: {dark_days_added}")
    if dark_days_removed:
        summary_parts.append(f"Dark Days removed: {dark_days_removed}")

    summary_text = " | ".join(summary_parts) if summary_parts else "No operational differences between versions."

    return VersionDiffResult(
        base_version_id=base.version_id,
        base_label=base.label,
        target_version_id=target.version_id,
        target_label=target.label,
        cost_delta=cost_delta,
        moves_delta=moves_delta,
        hold_days_delta=hold_days_delta,
        turnaround_delta=turnaround_delta,
        actor_changes=actor_changes,
        location_changes=location_changes,
        day_changes=day_changes,
        dark_days_added=dark_days_added,
        dark_days_removed=dark_days_removed,
        summary_text=summary_text,
    )
