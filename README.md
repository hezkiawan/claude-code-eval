# claude-code-eval

Evaluation notebook for the **Claude Code plugin evaluation** for the Helios team:
**Everything Claude Code (ECC)**, **Matt Pocock skills** and **Graphify**, compared against plain Claude Code.

- **Full report:** [docs/EVALUATION-REPORT.md](docs/EVALUATION-REPORT.md)
- **Test bed app (mini-kouventa) + code of every run:** [hezkiawan/claude-code-evaluation-demo](https://github.com/hezkiawan/claude-code-evaluation-demo) (branches `run/<RUN-ID>`)

Author: Hezki (technical research intern) · Sept–Oct 2026 · Controlled case study (n = 1 per setup).

---

## Research questions and answers

| # | Question | Answer |
|---|---|---|
| Q1 | Which workflow: Matt Pocock, ECC or a mix? | Default: **plain Claude Code**. For feature work, pilot **"Matt Pocock thinks, ECC builds"** |
| Q2 | Which parts of ECC are worth taking? | The **build workflow** (`/ecc:plan` → `tdd-workflow` → `/ecc:code-review`) + **tailored rules**. Not GateGuard, auto-memory or most of the catalog |
| Q3 | Does Graphify pay off, at what repo size? | **No, not at our scale.** Same accuracy, no saving; its graph misses most Go method calls. Don't adopt; re-test on triggers |

---

## What's in this repo

| Path | Contents |
|---|---|
| [`docs/EVALUATION-REPORT.md`](docs/EVALUATION-REPORT.md) | **Main report**: background, tools, both evaluations, analysis, recommendation |
| [`docs/recommendation.md`](docs/recommendation.md) | Detailed workflow evaluation and recommendation (Q1, Q2) |
| [`docs/graphify-findings.md`](docs/graphify-findings.md) | Detailed Graphify evaluation (Q3) |
| [`docs/code-analysis.md`](docs/code-analysis.md) | Code review of all 6 workflow runs |
| [`docs/phase1-tool-profiles.md`](docs/phase1-tool-profiles.md) | Tool profiles + ECC ↔ Matt Pocock overlap map |
| [`docs/run-protocol.md`](docs/run-protocol.md) | How each setup was run (workflow per setup, rules) |
| [`docs/graphify-protocol.md`](docs/graphify-protocol.md) | How the Graphify test was run |
| [`prompts/`](prompts/) | Frozen ticket prompts + answer sheets (F1, F2) and Graphify questions with answer keys (`G-queries.md`) |
| [`acceptance/`](acceptance/) | Automated API checkers (F1: 14 checks, F2: 11 checks incl. race test) + UI checklists |
| [`runs/`](runs/) | One folder per run: run cards (F1/F2), Graphify answers + stats (GQ*), `G-scores.md` scoreboard |
| [`results.csv`](results.csv) | Raw metrics per workflow run |
| [`rubric.md`](rubric.md) | Scoring rubric |
| [`tools/transcript-stats.mjs`](tools/transcript-stats.mjs) | Counts tool calls, tokens, skills, subagents, GateGuard blocks, Graphify commands and working time from a Claude Code session transcript |

---

## Evaluation A: workflows (mini-kouventa)

| Setup | Workflow |
|---|---|
| **C0** plain Claude Code | Paste the ticket |
| **C1** Matt Pocock skills | `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` per ticket |
| **C2** ECC 2.2.2 | `/ecc:plan` → `tdd-workflow` → `/ecc:code-review` → fix CRITICAL/HIGH |

Tickets: **F1 Room Notes** (fully specified) and **F2 Claim + SLA** (realistic, hidden race condition).
Same model (Opus 5.5, medium), auto mode, frozen prompts, fixed answer sheet, one git worktree per run.

| Totals (both tickets) | Plain | Matt Pocock | ECC |
|---|---|---|---|
| Checkers passed | all | all | all |
| Usage (% of 5-h Pro limit) | 5% | 41% | 26% |
| Active time | 18.6 min | 81.4 min | 59.9 min |
| Questions to developer | 0 | 26 | 4 |
| Frontend tests | 9 | 25 | 41 |

## Evaluation B: Graphify (usememos/memos @ `a80576a`)

3 navigation questions (trace a flow, find a rule, blast radius) × 3 setups: **G0** plain, **G1** Graphify default, **G2** Graphify forced.

| Setup | Recall | Output tokens | Working time |
|---|---|---|---|
| G0 plain | 23/23 | 16,967 | ~5.6 min |
| G1 Graphify default | 23/23 | 15,589 | ~4.1 min |
| G2 Graphify forced | 23/23 | 17,036 | ~7.8 min |

The memos clones and generated graphs are **not** in this repo (third-party code, 47 MB generated output). To reproduce:
```bash
git clone https://github.com/usememos/memos.git && cd memos && git checkout a80576a
uv tool install graphifyy==0.9.67
graphify update .            # build the graph (code-only, no LLM)
graphify claude install      # G1/G2 only
```

---

## Reproducing a workflow run

1. Clone the test bed and create a worktree from the right start point:
   ```bash
   git clone https://github.com/hezkiawan/claude-code-evaluation-demo.git mini-kouventa
   cd mini-kouventa
   git worktree add ../runs/<RUN-ID> -b run/<RUN-ID> <eval-base-v2 | base-C1 | base-C2>
   ```
2. Copy `serviceAccountKey.json` (backend) and `.env.local` (frontend) into the run folder. Never commit them.
3. Follow [`docs/run-protocol.md`](docs/run-protocol.md) for the setup's workflow; answer questions only from the answer sheet.
4. Check the result:
   ```bash
   cd acceptance && npm install
   node f1-notes-acceptance.mjs --key <path/to/serviceAccountKey.json> [--api http://localhost:8080]
   node f2-claim-acceptance.mjs --key <path/to/serviceAccountKey.json> [--api http://localhost:8080]
   ```
5. Measure the session:
   ```bash
   node tools/transcript-stats.mjs ~/.claude/projects/<folder>/<session>.jsonl
   ```

---

## Limitations
n = 1 per setup; one model; one small test app and one open-source repo; the recommended combination was not run as a whole. See §11 of the [report](docs/EVALUATION-REPORT.md).
