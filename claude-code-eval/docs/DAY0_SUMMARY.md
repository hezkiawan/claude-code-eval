# Claude Code Plugin Evaluation — Day 0 Summary

> **Purpose:** record of everything decided and built on Day 0 (setup), so the work can be resumed at any time,
> by me or by an AI assistant, without the original conversation.
> Last updated: 2026-09-29.

---

## 1. The assignment

- **Who:** Hezki, web developer intern at Helios, working as a "technical researcher" (research, then present to the team; no changes to the company codebase).
- **Company product:** Kouventa, an enterprise omnichannel customer-support platform (Meta Business API; WhatsApp/Instagram/Messenger in one agent workspace).
- **Team stack:** Next.js (web), Go (backend), PostgreSQL; Kouventa chats use Firestore.
- **Previous task (done):** recommended an agentic-coding workflow built on the **Matt Pocock skills**. Documented in *AI-Assisted Software Development Workflow for Helios Developers v1.1.2*. The team is currently trying it.
- **Current task:** explore and evaluate two Claude Code plugins the team lead found, then recommend what to use:
  - **Everything Claude Code (ECC):** https://github.com/affaan-m/ecc. A large toolbox of agents, skills, hooks and rules ("OS for agentic coding").
  - **Graphify:** https://github.com/Graphify-Labs/graphify. Turns a project into a queryable knowledge graph; claims better codebase understanding and token savings.
- **Team lead's direction:** "The recommendation could be just ECC, just Matt Pocock, or some ECC parts added, etc. You evaluate, explore and decide. Give us the recommended workflow and your evaluation of these tools."
- **Final output:** a presentation that explains, demonstrates, evaluates and recommends, plus an updated workflow doc (v1.2).
- **Constraint:** Claude Code **Pro plan** (subscription, no API key). Usage limits apply, roughly 2 full feature runs per 5-hour window.

## 2. Research questions

| ID | Question |
|---|---|
| **Q1 Workflow** | Which gives the best quality for the cost and friction: **A** Matt Pocock only, **B** ECC only, or **C** Matt Pocock + selected ECC parts? |
| **Q2 ECC parts** | Which individual ECC components are worth adopting, even if the full plugin isn't? |
| **Q3 Graphify** | Does Graphify pay off, and on what size or kind of repo? |

Every activity must feed Q1, Q2 or Q3.

## 3. The method (the "cooking contest")

Give the **same task** to Claude Code under **different setups** ("chefs"), from the **same starting code**, and measure every result **the same way**. Only the setup changes, so differences can be attributed to the setup.

### Configurations ("chefs")
| ID | Setup |
|---|---|
| **C0** | Stock Claude Code (reference point) |
| **C1** | Matt Pocock skills |
| **C2** | Full ECC |
| **C3** | Matt Pocock + selected ECC parts (defined in Phase 1) |
| **G** | Graphify (tested separately for Q3, on a large repo) |

Plugins and skills are installed **per run folder only (project scope)**, never globally.

### Tasks
| Task | Type | What it measures |
|---|---|---|
| **F1 Internal Room Notes** | Routine, fully specified, few traps | The extra **cost** of each chef on everyday work, and code quality |
| **F2 Room Claiming + SLA** | Tricky, with hidden traps | Whether planning, TDD and review **catch real bugs** |

**Why F2:** it's Kouventa's core "Agent Queue Management & Room Assignment" workflow. It has three traps: (1) two agents claiming the same room at once, where the correct fix needs a Firestore transaction; (2) an SLA badge that must appear without a refresh; (3) a Claim button nested inside a clickable tile, which is invalid HTML. Presentation framing: *"Two agents grab the same customer. Does the customer get two agents replying?"*

**Why F1 too:** most real tickets are routine. F1 shows the day-to-day price of each tool. The pilot's stock Notes implementation already scored 14/14 on the F1 checker, so F1 differences will mostly be cost, tests and code quality.

### Run plan
- **Core:** 2 tasks × 4 chefs × 1 run = **8 runs** (about 2 days on Pro).
- **If time allows:** a second run of F2 for each chef = 12 runs.
- **Order:** F1 first (simpler; practice for the routine), alternating chefs (C0, C1, C2, …) rather than all runs of one chef in a row.
- **Model:** **Opus 5.5, medium effort**, for every run.

### Metrics per run
| Metric | Source |
|---|---|
| Usage % of the 5-hour limit (before/after) | `/usage` |
| Tokens (input/output/cache), tool calls, files read, duration | `tools/transcript-stats.mjs` on the session `.jsonl` log |
| Context overhead at start | `/context` |
| Correctness, backend | Acceptance checker script (F1: /14, F2: /11) |
| Correctness, UI | Manual UI checklist (/7 each) |
| Code quality | `rubric.md` (/20), scored blind in a fresh session given only the diff |
| Friction | Count of replies typed + permission approvals |
| Behaviour | Wrote tests? Tests pass? Commits? Questions asked? |

### Run routine (every run)
1. **Prepare:** `git worktree add ../runs/<RUN-ID> -b run/<RUN-ID> eval-base-v2` (inside `mini-kouventa`). Copy in `backend/serviceAccountKey.json` + `frontend/.env.local`, run `npm ci` in `frontend`, install the chef's tools in that folder only, and verify with `/plugin`, `/mcp` and `/hooks`. Note usage % and take a `/context` screenshot.
2. **Cook:** paste the frozen prompt (with the chef's entry command). Answer only from the answer sheet and tally each reply. Don't help.
3. **Measure:** `/usage` → exit → transcript stats → start backend → acceptance checker → UI checklist → (rubric, can be batched later).
4. **Record:** fill `runs/<RUN-ID>/runcard.md`, add a row to `results.csv`, then commit and push the run branch from the run folder.

Run ID format: `<task>-<config>-r<n>`, e.g. `F1-C2-r1`.

**Graphify exception:** Graphify runs use a **separate full clone**, not a worktree, because `graphify hook install` writes to `.git/hooks`, which all worktrees share.

---

## 4. What was done on Day 0

### 4.1 Pilot analysed and archived
The pilot (first attempt) was treated as exploration. Problems found:
- **Contaminated "stock" run:** `temp/notes-stock` contained `graphify-out/cache/last_query_stamp`, so Graphify was active during the "stock" Notes run. The likely cause is a Graphify git hook in `.git/hooks`, shared by every branch of that clone.
- **Unequal foundations:** stock and ECC built Notes on top of *different* Assign implementations; ECC had also installed its own test setup (Vitest).
- `main` contained committed `frontend/coverage/` output (from the ECC branch) and a commented-out, invalid-JSON `.claude/settings.json`.
- No test setup in the base, so configurations did not start equal.
- The Phase B stock/ECC write-ups looked copy-pasted; `/ecc:code-review` reviewed only uncommitted changes (the feature was already committed); a third-party usage monitor mixed sessions; each run was done once, in a fixed order.

**Pilot observations kept as hypotheses to confirm or reject:** ECC enforces TDD with atomic RED→GREEN commits but costs roughly 3–5× more usage on the feature task; GateGuard adds friction (repeated write denials); full ECC adds about 6k tokens of context overhead and lists 399 skills at start; Graphify misses JSX render edges and indexed its own config; on a small repo, Graphify saves nothing (the agent reads files anyway).

### 4.2 Repo reset (`mini-kouventa` = https://github.com/hezkiawan/claude-code-evaluation-demo)
Done by Claude Code using `RESET_PROMPT.md`, with manual approval for the destructive steps (auto mode blocked the force-push; the fix was to switch out of auto mode and approve once).

- All 6 old branches archived as **tags on GitHub**:

  | Tag | Old branch | Commit |
  |---|---|---|
  | `pilot/main` | main | 787834e |
  | `pilot/test-baseline` | test/baseline (stock Assign) | 78061d1 |
  | `pilot/eval-graphify` | eval/graphify | b28bcfd |
  | `pilot/eval-everything-claude-code` | eval/everything-claude-code (ECC Assign) | d5058e9 |
  | `pilot/temp-notes-stock` | temp/notes-stock (stock Notes) | 7472e95 |
  | `pilot/temp-notes-ecc` | temp/notes-ecc (ECC Notes) | 79f3b59 |

- New base built from `5809b00` ("set up basely dummy app", the last commit with no agent-written code) plus one setup commit:
  - `.claude/settings.json` **deleted** (no permission rules; the deny rules had broken auto mode).
  - `.gitignore`: added `coverage/` and `graphify-out/`.
  - Frontend test setup: Vitest 3, jsdom, Testing Library, `npm test`, and one smoke test (`frontend/__tests__/smoke.test.tsx`).
  - Neutral `CLAUDE.md` (stack, commands, "follow the design system rules", "don't commit secrets").
  - Kept: `.claude/rules/frontend-design-system.md`, `frontend-design-reference/`.
- **`main` = tag `eval-base-v2` = `c4a1e0a88ae26b3daba9ff88380d04c3e16d496f`.** Only branch on GitHub: `main`.
- Verified: go build / vet / test, typecheck, `npm test`, `npm run build`, and a fresh-clone test all pass.
- Known harmless notes: `.gitignore` uses CRLF line endings; npm 11 skipped postinstall scripts (esbuild, protobufjs, @firebase/util), and build and tests pass anyway.

### 4.3 What `eval-base-v2` contains (the "kitchen")
- **Backend (Go, net/http, Firestore):** `GET /api/health`, `GET /api/rooms?status=`, `POST /api/rooms` (new rooms are always `idle`). Files: `backend/main.go`, `backend/handlers/rooms.go`.
- **Frontend (Next.js 14, React 18, Tailwind):** sidebar chat list with platform tabs (All/WhatsApp/Livechat), status tabs (Assigned/Idle/Bot/Closed) and a new-room form; chat window with live Firestore messages (`rooms/{id}/messages`) and sending.
- **Not present:** assigning/claiming (so the Assigned tab is always empty), notes, SLA, auth or agent identity.

### 4.4 Global Claude Code setup audited
- Backup of `~/.claude` made at `C:\Users\Public.LAPTOP-G67OHE29\claude-backup-2026-09-29`.
- Found: `gopls-lsp` plugin (user scope), user-scope `playwright` MCP, ECC leftovers (`pluginConfigs."ecc@ecc"`, ECC marketplace, ECC installed for another project folder only), Graphify CLI on PATH (`~/.local/bin/graphify.exe` v0.9.67). No global Graphify skill, no global hooks, no Matt Pocock skills.
- Decision: the Graphify CLI on PATH is harmless without its skill or hook. Remove `playwright` MCP (user scope) and disable `gopls-lsp` for clean runs, *or* keep them identical for every run and note that in the write-up.

### 4.5 Evaluation notebook repo (`claude-code-eval`, private, separate from mini-kouventa)
Kept separate so Claude Code **cannot read the checkers or answer sheets during runs**. Never copy these files into a run folder.

```
eval-workspace/
├── mini-kouventa/          # the kitchen (main = eval-base-v2)
├── runs/                   # one worktree per run (created from mini-kouventa)
└── claude-code-eval/       # the judge's notebook (own private GitHub repo)
    ├── README.md  testbeds.md  observations.md  results.csv  rubric.md
    ├── prompts/
    │   ├── F1-notes-spec.md      F1-answer-sheet.md
    │   └── F2-claim-spec.md      F2-answer-sheet.md
    ├── acceptance/
    │   ├── package.json  lib/db.mjs  lib/args.mjs   (npm install once)
    │   ├── f1-notes-acceptance.mjs   F1-ui-checklist.md
    │   ├── f2-claim-acceptance.mjs   F2-ui-checklist.md
    │   └── seed-room.mjs             (create a room "N minutes old", for F2 UI checks and demos)
    ├── tools/transcript-stats.mjs
    ├── runs/_TEMPLATE/runcard.md
    └── archive/pilot-v1/           (pilot documentation)
```

**Commands** (Windows: quote any path containing spaces):
```powershell
# F1 checker (run's backend must be running)
node ".\claude-code-eval\acceptance\f1-notes-acceptance.mjs" [http://localhost:8080]
# F2 checker (needs the Firebase key to read/seed Firestore)
node ".\claude-code-eval\acceptance\f2-claim-acceptance.mjs" --key "PATH\serviceAccountKey.json" [--api http://localhost:8080]
# Seed an old room (F2 UI check / demo)
node ".\claude-code-eval\acceptance\seed-room.mjs" --key "PATH\serviceAccountKey.json" --minutes 6 --name "Old customer"
# Transcript stats (newest log: see command below)
node ".\claude-code-eval\tools\transcript-stats.mjs" "PATH\session.jsonl"
Get-ChildItem "$HOME\.claude\projects" -Recurse -Filter *.jsonl | Sort-Object LastWriteTime -Descending | Select-Object -First 1 FullName
```

### 4.6 Validation of the measuring tools
| Tool | Result |
|---|---|
| F1 checker vs mock servers | Correct 14/14; buggy (wrong status, byte-counting) caught |
| **F1 checker vs real Go + Firestore** (pilot `pilot/temp-notes-stock`) | **14/14**, so the checker works end to end, and stock already nailed F1's backend in the pilot |
| F2 checker vs mock servers | Correct 11/11; buggy read-then-write backend caught (**up to 10 "winners" per room** in the race test) |
| F2 seed script vs real Firestore | ✅ "Old customer" created |
| Transcript stats script | ✅ tested on a real Claude Code log (in the sandbox) |
| Practice run DRY-C0 | Opus 5.5 medium; answered the routes question correctly; `/usage` showed 9% |

---

## 5. Frozen task prompts (full text lives in `prompts/`)

**F1 (Notes):** POST/GET `/api/rooms/{id}/notes`; notes in `rooms/{roomId}/notes`; content is required, trimmed, 1–500 Unicode characters; `isImportant` is an optional boolean (default false); 201 on create; GET is newest first; 404 for a missing room; errors use `{"error": ...}`. UI: Chat/Notes tabs in the chat window, yellow banner for important notes, inline form, error display, design system.

**F2 (Claim + SLA):** `POST /api/rooms/{id}/claim` with `{"agentName"}`; only one agent may own a room (claiming an assigned or closed room fails; never two owners); store the agent and claim time; SLA breached if waiting more than 5 min since creation; claiming a breached room is allowed but the breach is recorded. UI: Claim button on unassigned tiles, red "SLA breached" badge that appears without refresh, claimed room moves to the Assigned tab with the agent name, hardcoded "Agent Demo", design system.

Deliberately **not** in either prompt: tests, commits, and (for F2) the words "race condition", "concurrency" or "transaction". These are observed behaviours.

---

## 6. Open items before Phase 1
- [ ] Transcript counter practice on the DRY-C0 session log.
- [ ] Remove the practice worktree: `git worktree remove ../runs/DRY-C0 --force` then `git branch -D run/DRY-C0` (inside `mini-kouventa`).
- [ ] Global cleanup decision: remove `playwright` MCP (`claude mcp remove playwright -s user`) and disable `gopls-lsp`, or keep them for all runs and document it.
- [ ] "Stock proof" screenshots: in an empty folder, `claude` → `/plugin`, `/mcp`, `/hooks`, `/context`.
- [ ] Fill `README.md` (questions, configs, model) and `testbeds.md` (mini-kouventa @ `eval-base-v2` = c4a1e0a).

## 7. What comes next
| Phase | What | Output |
|---|---|---|
| **1 Explore** (next) | How to install C1 (Matt Pocock) and C2 (ECC) in one run folder only; `/context` overhead per configuration; tool profiles; ECC vs Matt Pocock overlap map; read ECC's hooks; decide the ECC picks for **C3** | "What is it" slides, C3 definition |
| 2 Workflow runs | 8 core runs (F1 and F2 × C0–C3) | Answer to Q1 |
| 3 Graphify | Pick a large open-source Go + Postgres repo (candidates: Mattermost, Listmonk), write 5 questions + answer keys, stock vs Graphify | Answer to Q3 |
| 4 ECC part tests | GateGuard with deliberately bad prompts, `/security-scan`/AgentShield, `/code-review` on a correctly scoped diff, `/save-session` vs `/handoff` | Answer to Q2 |
| 5 Synthesis | Results table, decision matrix, Adopt/Trial/Assess/Hold verdict per tool, workflow doc v1.2, limitations | The recommendation |
| 6 Deck | Slides, recorded demos (F2 two-tab demo, checker scoreboard, cost chart, side-by-side UI screenshots) | The presentation |

## 8. Rules to remember
1. Every run starts from `eval-base-v2`, never from another run's branch.
2. Install plugins in the run folder only; verify with `/plugin` before each run.
3. Same model and effort for every run (Opus 5.5, medium).
4. Answer the agent only from the answer sheet.
5. Never put checkers or answer sheets inside `mini-kouventa` or a run folder.
6. Don't edit a frozen prompt after the first recorded run. If a change is unavoidable, bump the version and note it.
7. Record everything in the run card and `results.csv` right after each run; note anything surprising in `observations.md`.
8. Graphify runs use a separate full clone, not a worktree.
