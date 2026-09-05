# Persistent Memory: StripBoard Optimizer
> **Project ID:** `P-CINEMA-HACK-3.1`  
> **Target Track:** IBM / Confluent Track  
> **Current Phase:** Full Feature Implementation & Deep Domain Integration Completed

---

## 📌 Implementation & Build Progress Tracker

| Milestone | Deliverable | Status | Key Artifacts / Notes |
| :--- | :--- | :---: | :--- |
| **Milestone 1** | Mathematical Formulation & CP-SAT Modeling | 🟢 Completed | Exact binary decision variables $X_{s,d}$, DOOD hold span logic, intra-day moves, turnaround |
| **Milestone 2** | Backend Implementation & Clean Rebuild | 🟢 Completed | High-performance FastAPI backend; hardest parts unmocked |
| **Milestone 3** | Google Gemini Multi-Agent Layer | 🟢 Completed | `google-genai` SDK (`gemini-3.5-flash`); instant template fallback; dedicated memo endpoint |
| **Milestone 4** | IBM / Confluent Kafka Event Mesh | 🟢 Completed | Resilient hybrid client with 5-topic event schema (`production.scene.catalog`, etc.) |
| **Milestone 5** | FastAPI Gateway & WebSockets | 🟢 Completed | REST routes + `/ws/events` real-time push; configurable port (default `8090`) |
| **Milestone 6** | Interactive React Stripboard & DOOD UI | 🟢 Completed | Hollywood color-coded strips, DOOD matrix, Chaos Drawer, Financial HUD, Memo Modal |
| **Milestone 7** | Custom Production Importer (JSON + CSV) | 🟢 Completed | UI Modal (`ImportModal.tsx`) with JSON & CSV tabs; `/api/production/import-csv` live |
| **Milestone 8** | Multi-Disruption Batch Staging | 🟢 Completed | Chaos Drawer supports staging multiple disruptions simultaneously before single re-solve |
| **Milestone 9** | 20-Day Indie Feature Scale Preset | 🟢 Completed | 40 scenes, 10 actors, 8 locations, 20 days (`neon_horizon_20d.json`); 1-click UI switcher |
| **Milestone 10**| Configurable Penalties & Permit Lead Times | 🟢 Completed | Custom SAG turnaround penalty and permit lead-time ("frozen horizon") support in solver |
| **Milestone 11**| Infeasibility Diagnostics & Arbitration | 🟢 Completed | Identifies capacity overloads and deadlocked constraints; provides actionable recovery advice |
| **Milestone 12**| Automated Test Suite | 🟢 Completed | 16/16 unit and integration tests passing in ~13s |

---

## 📝 Comprehensive Domain & Architectural FAQ Log

### 1. CSV / Excel Breakdown Importer Timeline
- **Status:** **Fully Implemented & Live.**
- **Details:** 
  - Standard spreadsheet breakdown sheets (Final Draft Tagger, Gorilla Scheduling, StudioBinder) can now be imported directly via `POST /api/production/import-csv` and via the "CSV / Spreadsheet" tab in `ImportModal.tsx`.
  - Supports automatic column normalization (`scene_number`, `slugline`, `setting`, `location`, `pages_eighths`, `est_shoot_minutes`, `cast_names`, `description`).
  - Auto-infers actor roster and talent rates if not explicitly specified.

### 2. Multi-Scenario Comparison vs. Single Optimum
- **Algorithmic Nature:** For any specific set of constraints, Google OR-Tools CP-SAT computes the exact **global mathematical optimum** (minimizing talent hold days, company moves, and union turnaround violations).
- **Executive Production Workflow:** When disruptions strike, line producers test multiple alternative strategies:
  - *Option A:* Freeze locked scenes and add 1 recovery day.
  - *Option B:* Pay SAG-AFTRA turnaround penalties to shoot Day 3 at night.
  - *Option C:* Relocate to an indoor soundstage.
- **Engine Support:** Because re-solves execute in $<200$ms, the system enables instantaneous scenario branching and side-by-side metric comparison.

### 3. Company Moves: Intra-day vs. Inter-day
- **Intra-Day Move (High Cost / High Friction):**
  - Moving the entire 150-person crew, grip trucks, cameras, catering, and generators mid-day during shooting hours (e.g. 1:00 PM).
  - Burns 3 to 4 hours of daylight, destroys set momentum, and costs $15,000–$50,000 per move in lost productivity.
  - Modeled in CP-SAT as $\sum_{d} \max(0, |\text{Locations}(d)| - 1)$.
- **Inter-Day Move (Overnight Window):**
  - Moving between wrap on Day 1 (e.g. 7:00 PM) and call time on Day 2 (7:00 AM).
  - Occurs during the standard 12-hour crew turnaround window. Logistics trucks drive overnight while crew sleeps; call sheets simply direct crew to Location B the next morning. It does not eat daytime shooting hours.

### 4. 20-Day Production Scale & Industry Standards
- **Feature Film Dataset:** `neon_horizon_20d.json` features 20 shoot days, 40 scenes across 8 distinct locations, and 10 cast members (principals, supporting, day players).
- **Navbar Switcher:** Users can toggle seamlessly between "5-Day Sprint" (demo mode) and "20-Day Feature" (real-world scale).
- **CP-SAT Scalability:** Solves a 20-day, 40-scene feature film schedule in ~5 seconds with zero company moves and 100% union compliance.

### 5. What is "Direct Drag-and-Drop Manual Strip Moving on the Canvas"?
- In classic physical production offices, 1st ADs physically arrange colored cardboard strips on a wooden stripboard mounted on the wall.
- In software like Movie Magic Scheduling, users manually drag strips between day separator dividers.
- In our autonomous engine, CP-SAT computes the ideal baseline automatically. When human ADs manually drag a strip, they create a **Hard Lock Constraint** ($X_{s, d} = 1$), and the engine re-solves all remaining strips around that human directive.

### 6. SAG-AFTRA & International Union Penalty Rates
- Under SAG-AFTRA Basic Agreement Rule 14-A, forced call turnaround violations incur daily scale penalties per affected performer ($1,000–$5,000+).
- In the UK (Equity), Canada (ACTRA), Australia (MEAA), or non-union regional productions, these rates vary.
- **Configurability:** The solver now accepts custom `w_turnaround` penalty weights, and `UnionComplianceAgent` dynamically audits penalties against user-specified union thresholds.

### 7. Simultaneous Multi-Disruption Chaos (Actors + Locations)
- Real-world production crises are compound (e.g., Lead actor quarantine on Day 2 *and* Warehouse District flooded on Day 1).
- **Enhanced Chaos Drawer:** Users can stage multiple disruptions into a batch queue before firing a unified re-solve request (`POST /api/schedule/disrupt-batch`).

### 8. Infeasibility Arbitration & Bottleneck Diagnostics
- If conflicting constraints make a schedule mathematically impossible, rather than failing silently, the solver executes an infeasibility diagnostic:
  - Compares total scene minutes vs total shooting day capacity.
  - Pinpoints deadlocked scenes where all possible days are eliminated.
  - Generates actionable arbitration advice (e.g., expand shoot by 1 day, grant permit waiver, or pay overtime buyout).

### 9. Permit Lead Time ("Frozen Horizon")
- Municipal film offices require 24 to 96 hours notice to issue exterior filming permits.
- The solver incorporates `permit_lead_days`. If a disruption occurs today, immediate upcoming days cannot be rescheduled to unpermitted public locations.

---

## 🔒 Security, Privacy & Confidentiality Architecture (HIGHEST PRIORITY)

Film studios and talent agencies guard actor contract rates with extreme confidentiality. 

### Multi-Tier Defense Strategy:
1. **Pseudonymization for Cloud LLM (Gemini):**
   - Before prompt creation, actors' real names and salaries are replaced with pseudonyms:
     - `Sarah Vance` $\rightarrow$ `Talent_Alpha`
     - `$15,000/day` $\rightarrow$ `Compensation_Tier_1 (Scale 5)`
   - Gemini drafts the memorandum using pseudonyms and relative tiers.
   - The browser UI locally decrypts `Talent_Alpha` back to `Sarah Vance`.
   - **Result:** Zero real names and zero dollar figures are ever transmitted to Gemini or third-party cloud logs.
2. **Normalized Relative Weights for CP-SAT:**
   - The mathematical solver operates purely on integer tier weights ($1, 2, 3, 5$), producing the identical optimal sequence without needing true bank payroll numbers.
3. **Role-Based Access Control (RBAC):**
   - **UPM / Producer View:** Full financial DOOD and dollar hold costs.
   - **1st AD / Director View:** Stripboard and schedule data with financial columns completely redacted.
   - **Crew View:** Daily call sheets and sluglines only.
4. **On-Premise / Private VPC Deployment:**
   - Google OR-Tools CP-SAT executes 100% locally inside the studio's private firewall or VPC with zero external cloud dependencies.
