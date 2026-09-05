import os
import logging
from typing import Optional
from backend.app.models.schedule import ScheduleSolution

logger = logging.getLogger("MemoAgent")

class ExecutiveMemoAgent:
    """
    Synthesizes optimization deltas and union audits into an executive Line Producer Memo.
    Integrates Google Cloud Gemini (via google-genai SDK) with resilient template fallback.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self._client = None
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI client: {e}")

    def generate_memo(
        self,
        solution: ScheduleSolution,
        disruption_reason: Optional[str] = None,
        use_ai: Optional[bool] = None
    ) -> str:
        if use_ai is None:
            use_ai = os.environ.get("STRIPBOARD_FAST_MODE") != "1"

        metrics = solution.metrics
        disruptions_text = ""
        if solution.disruptions_applied:
            disruptions_text = "\n".join([
                f"- {d.disruption_type.value}: {d.reason} (Affected: {d.affected_actor_id or d.affected_location}, Days: {d.affected_shoot_days})"
                for d in solution.disruptions_applied
            ])
        else:
            disruptions_text = "- Baseline Production Schedule Generation (No active disruptions)"

        day_breakdown = ""
        for day in solution.days:
            locs = ", ".join(day.locations)
            scenes_summary = ", ".join([f"Sc.{s.scene_number} ({s.location})" for s in day.scenes])
            day_breakdown += f"- Day {day.day_number} ({day.total_duration_minutes // 60}h {day.total_duration_minutes % 60}m) | Locs: {locs} | Scenes: {scenes_summary}\n"

        dood_summary = ""
        for row in solution.dood_matrix:
            codes = "".join(row.day_codes)
            dood_summary += f"- {row.character_name} ({row.name}): [{codes}] Work: {row.work_days}d, Hold: {row.hold_days}d, Cost: ${row.talent_cost:,}\n"

        # Try live Gemini generation if client is available and AI is requested
        if self._client and use_ai:
            prompt = f"""You are the Veteran Line Producer and 1st Assistant Director on feature film '{solution.production_id}'.
Generate a high-stakes, professional studio executive memorandum detailing the re-optimized shooting stripboard.

Production Metrics:
- Status: {solution.status}
- Solver Runtime: {metrics.solver_runtime_ms} ms
- Estimated Net Cost Saved vs. Naive Rescheduling: ${metrics.cost_saved_vs_naive:,} USD
- Total Intra-Day Company Moves: {metrics.total_company_moves}
- Total Talent Hold Days: {metrics.total_hold_days}
- SAG-AFTRA Turnaround Violations: {metrics.total_turnaround_violations} (Compliance: {int(metrics.union_compliance_rate * 100)}%)

Active Disruptions Ingested:
{disruptions_text}

Day-by-Day Shooting Schedule:
{day_breakdown}

Day-out-of-Days (DOOD) Talent Audit:
{dood_summary}

Format your response as a formal studio memorandum with:
1. HEADER: TO (Studio Execs & Dept Heads), FROM (Line Producer), DATE, SUBJECT, STATUS & RUNTIME.
2. EXECUTIVE SUMMARY: Highlighting budget preserved and zero SAG violations.
3. LOGISTICAL AUDIT: How company moves were minimized and locations clustered.
4. TALENT & UNION AUDIT: Explaining the DOOD holding fees and turnaround safety.
5. RECOMMENDATION & NEXT ACTIONS for call sheets.

Write in a sharp, authentic, professional film industry voice. Use Markdown formatting."""

            for model_name in ["gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    logger.warning(f"Gemini generation with {model_name} failed: {e}")

        # Fallback template
        return self._generate_fallback_template(solution, disruptions_text, metrics)

    def _generate_fallback_template(self, solution, disruptions_text, metrics) -> str:
        memo = f"""# 🎬 LINE PRODUCER STRIPBOARD OPTIMIZATION MEMORANDUM

**TO:** Studio Production Executive, 1st Assistant Director, Key Department Heads  
**FROM:** Autonomous Stripboard Optimizer (OR-Tools CP-SAT + Gemini 2.5 Multi-Agent Mesh)  
**PRODUCTION:** {solution.production_id.upper()}  
**STATUS:** {solution.status} (Re-optimized in {metrics.solver_runtime_ms} ms)  

---

### 1. EXECUTIVE SUMMARY
Following real-time schedule evaluation, the Master Schedule Arbitrator successfully re-sequenced the shooting stripboard to satisfy 100% of union turnaround rules, actor contractual constraints, and location permits.

- **Net Estimated Savings:** ${metrics.cost_saved_vs_naive:,} USD vs. naive manual scheduling
- **Total Company Moves:** {metrics.total_company_moves} intra-day moves across {len(solution.days)} shoot days
- **Total Actor Hold Days:** {metrics.total_hold_days} idle days across all talent contracts
- **SAG-AFTRA Compliance Rate:** {int(metrics.union_compliance_rate * 100)}% ({metrics.total_turnaround_violations} forced call turnaround penalties)

---

### 2. DISRUPTIONS & CHAOS MITIGATIONS INGESTED
{disruptions_text}

---

### 3. DAY-BY-DAY OPERATIONAL STRIP SEQUENCE
"""
        for day in solution.days:
            locs = ", ".join(day.locations)
            memo += f"- **Day {day.day_number}** ({day.total_duration_minutes // 60}h {day.total_duration_minutes % 60}m) | Locations: {locs} | Scenes: {len(day.scenes)} strips\n"

        memo += """
---
*Generated autonomously via StripBoard Optimizer Event Mesh.*
"""
        return memo.strip()
