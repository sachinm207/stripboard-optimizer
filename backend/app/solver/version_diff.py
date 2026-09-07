from typing import List, Dict, Set
from backend.app.models.version import (
    ConstraintVersion,
    ConstraintDiffResult,
    ActorBlackoutDiff,
    LocationBlackoutDiff,
    ChaosDisruptionDiff,
)

def compute_constraint_diff(
    base: ConstraintVersion,
    target: ConstraintVersion,
    actors_map: Dict[str, str] = None
) -> ConstraintDiffResult:
    if actors_map is None:
        actors_map = {}

    # 1. Company Preplanned Dark Days Diff
    base_dark = set(base.dark_days or [])
    target_dark = set(target.dark_days or [])
    dark_added = sorted(list(target_dark - base_dark))
    dark_removed = sorted(list(base_dark - target_dark))

    # 2. Actor Preplanned Off Days Diff
    actor_diffs: List[ActorBlackoutDiff] = []
    base_actors = base.actor_blackouts or {}
    target_actors = target.actor_blackouts or {}
    all_actor_ids = sorted(list(set(base_actors.keys()) | set(target_actors.keys())))

    for act_id in all_actor_ids:
        b_days = set(base_actors.get(act_id, []))
        t_days = set(target_actors.get(act_id, []))
        added = sorted(list(t_days - b_days))
        removed = sorted(list(b_days - t_days))
        if added or removed:
            actor_name = actors_map.get(act_id, act_id)
            actor_diffs.append(
                ActorBlackoutDiff(
                    actor_id=act_id,
                    actor_name=actor_name,
                    added_off_days=added,
                    removed_off_days=removed,
                )
            )

    # 3. Location Preplanned Off Days Diff
    location_diffs: List[LocationBlackoutDiff] = []
    base_locs = base.location_blackouts or {}
    target_locs = target.location_blackouts or {}
    all_locs = sorted(list(set(base_locs.keys()) | set(target_locs.keys())))

    for loc in all_locs:
        b_days = set(base_locs.get(loc, []))
        t_days = set(target_locs.get(loc, []))
        added = sorted(list(t_days - b_days))
        removed = sorted(list(b_days - t_days))
        if added or removed:
            location_diffs.append(
                LocationBlackoutDiff(
                    location=loc,
                    added_off_days=added,
                    removed_off_days=removed,
                )
            )

    # 4. Sudden Chaos Off Days & Disruptions Diff
    chaos_diffs: List[ChaosDisruptionDiff] = []
    base_alerts = {a.alert_id: a for a in (base.active_disruptions or [])}
    target_alerts = {a.alert_id: a for a in (target.active_disruptions or [])}

    for a_id, alert in target_alerts.items():
        if a_id not in base_alerts:
            chaos_diffs.append(
                ChaosDisruptionDiff(
                    alert_id=alert.alert_id,
                    disruption_type=alert.disruption_type,
                    affected_days=alert.affected_shoot_days,
                    reason=alert.reason,
                    change_type="added",
                )
            )

    for a_id, alert in base_alerts.items():
        if a_id not in target_alerts:
            chaos_diffs.append(
                ChaosDisruptionDiff(
                    alert_id=alert.alert_id,
                    disruption_type=alert.disruption_type,
                    affected_days=alert.affected_shoot_days,
                    reason=alert.reason,
                    change_type="removed",
                )
            )

    total_changes = (
        len(dark_added) + len(dark_removed) +
        len(actor_diffs) + len(location_diffs) +
        len(chaos_diffs)
    )

    summary_parts = []
    if dark_added:
        summary_parts.append(f"Company Off Days added: {dark_added}")
    if dark_removed:
        summary_parts.append(f"Company Off Days removed: {dark_removed}")
    if actor_diffs:
        summary_parts.append(f"{len(actor_diffs)} actor off-day changes")
    if location_diffs:
        summary_parts.append(f"{len(location_diffs)} location off-day changes")
    if chaos_diffs:
        summary_parts.append(f"{len(chaos_diffs)} sudden chaos adjustments")

    summary_text = " | ".join(summary_parts) if summary_parts else "No hard constraint differences between versions."

    return ConstraintDiffResult(
        base_version_id=base.version_id,
        base_label=base.label,
        target_version_id=target.version_id,
        target_label=target.label,
        dark_days_added=dark_added,
        dark_days_removed=dark_removed,
        actor_blackouts_diff=actor_diffs,
        location_blackouts_diff=location_diffs,
        chaos_disruptions_diff=chaos_diffs,
        total_changes_count=total_changes,
        summary_text=summary_text,
    )
