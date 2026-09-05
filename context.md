# Project Context: StripBoard Optimizer (`P-CINEMA-HACK-3.1`)

> **Challenge:** [Devpost Agentic Cinema: The Blockbuster Hackathon](https://agentic-cinema.devpost.com/)  
> **Official Resources:** [https://agentic-cinema.devpost.com/resources](https://agentic-cinema.devpost.com/resources)  
> **Official Rules:** [https://agentic-cinema.devpost.com/rules](https://agentic-cinema.devpost.com/rules)  
> **Submission Deadline:** **September 9, 2026 @ 2:00 PM PDT**  
> **Target Partner Track:** **IBM / Confluent Track** ($7,500 1st / $4,500 2nd / $3,000 3rd)  
> **Portfolio Parent Context:** [`../context.md`](file:///home/sachinm/development/agentic-cinema-devpost/context.md) | Master Memory: [`../memory.md`](file:///home/sachinm/development/agentic-cinema-devpost/memory.md)

---

## 🏆 Devpost Hackathon Master Context & Requirements

### The Core Challenge
Build a functional, production-ready AI agent or multi-agent network—powered by **Gemini and Google Cloud Agent Builder / Vertex AI / Python GenAI SDK**—that integrates a Partner Entity's product or MCP server to solve critical bottlenecks across the entertainment and media value chain.

### Mandatory Devpost Submission Checklist
1. **Hosted Application URL:** A working, live-hosted project that judges can access and test.
2. **The 3-Minute Trailer (Demo Video):**
   - Public YouTube or Vimeo video (under 3 minutes).
   - Demonstrates the live functioning agent as built (actual product workflow).
   - English audio or English subtitles.
3. **Open-Source Code Repository:**
   - Public GitHub, GitLab, or Bitbucket repository.
   - **Crucial Rule:** Must demonstrate **actual runtime use** of Google Cloud (Gemini / ADK) AND IBM / Confluent Kafka (imported and executed in code, not just named in README).
   - Must include an OSI-approved open-source license file visible at the top of the repository.
4. **Devpost Track Selection:** Select **IBM Track** on the submission form.

### Official Judging Criteria (Equal Weight)
- **Technological Implementation:** How well is the project built, and how effectively does it use Google Cloud and IBM / Confluent Kafka as part of the solution?
- **Design:** Does the project deliver a complete, coherent product experience—not just a technical proof of concept?
- **Potential Impact:** Does the project solve a real problem for a real audience with credible cost/time savings?
- **Quality of the Idea:** Creative, non-obvious use of Google Cloud and Partner services with genuine understanding of the entertainment problem space.

---

## 🎬 1. The Core Vision & Film Industry Problem
- **User Persona:** Line Producers, Unit Production Managers (UPM), 1st Assistant Directors, Studio Production Executives.
- **The Real-World Film Problem:** The **One-Liner Schedule / Stripboard** is the master calendar that determines which scenes shoot on which day over a 60-to-120-day production. Creating this schedule is an **NP-hard combinatorial optimization problem**:
  1. *Actor Availability:* Lead Actor A only available Weeks 1–3; Actor B unavailable Mondays; Actor C cannot shoot nights.
  2. *SAG-AFTRA Union Turnaround Rules:* Actors must have **12 hours of rest** between wrap time and call time the next morning. If violated, the studio pays massive punitive penalties ("Forced Calls").
  3. *Day-out-of-Days (DOOD) Holding Costs:* If an actor works Monday (Day 1) and Friday (Day 5), the studio must pay them for Tuesday, Wednesday, and Thursday as "Hold Days" even though they don't shoot!
  4. *Location & Setup Grouping:* Moving a 150-person crew ("Company Move") costs $50,000 and wastes 4 hours. All scenes in the same location must cluster.
  5. *Day vs. Night Sequencing:* Moving from night shoots back to day shoots requires a 36-hour weekend turnaround.
- **The Production Catastrophe:** Whenever an unexpected disruption occurs (actor gets sick, weather storm, permit revoked), the Line Producer spends **3 sleepless days manually rearranging colored strips on a board**, often producing sub-optimal schedules costing **$150,000 to $500,000 in unnecessary hold fees and union penalties**.
- **The Solution:** **StripBoard Optimizer** is an autonomous event-driven constraint-solving engine powered by **Confluent Kafka event streaming** and **Google OR-Tools CP-SAT heuristics**. When a disruption occurs, the system ingests the event and re-optimizes a 60-day schedule in under 3 seconds, finding the mathematically optimal sequence that minimizes budget penalties while satisfying 100% of union and actor availability constraints.

---

## ⚡ 2. Technical Stack & Architecture
- **Event Mesh:** Confluent Kafka (topics: `production.scene.catalog`, `actor.contract.constraints`, `schedule.disruption.alert`, `schedule.recalculated.solution`).
- **Optimization Engine:** Python Google OR-Tools (CP-SAT Solver) / Mixed-Integer Linear Programming (MILP) heuristic layer.
- **Agent Framework:** IBM watsonx / Google Cloud ADK multi-agent orchestrator.
- **Frontend:** Interactive Gantt / Stripboard visualizer (React + D3.js or Tailwind table) showing day-by-day scene strips, actor DOOD grids, and real-time cost meters.

---

## 🤖 3. Multi-Agent Orchestration Architecture
1. **Union Compliance & Labor Rules Agent:** Enforces SAG-AFTRA, DGA, and IATSE rules (12-hour rest periods, 6-day work weeks, golden hour overtime penalties).
2. **Actor Availability & DOOD Minimizer Agent:** Tracks actor contractual start/end dates, travel days, and penalizes schedules that create idle hold days ("Hold Fees").
3. **Location & Logistics Cluster Agent:** Minimizes costly company moves by clustering all interior/exterior scenes by location and permit windows.
4. **Master Schedule Arbitrator (OR-Tools Solver Agent):** Translates multi-agent constraints into mathematical objective functions, executes CP-SAT, and publishes optimized schedule alternatives to Kafka.
