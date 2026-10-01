# Claude Code Plugin Evaluation: ECC, Matt Pocock Skills & Graphify

**For:** Helios development team · **Author:** Hezki (technical research intern) · **Date:** 2026-10-01
**Status:** final. Controlled case study (n = 1 per cell); see §11 Limitations.
**Evidence repo:** `hezkiawan/claude-code-evaluation-demo` (run branches `run/<RUN-ID>`) + `claude-code-eval/` notebook (prompts, checkers, run cards, scores).

---

## TL;DR

| Question | Answer |
|---|---|
| **Q1** Which workflow: Matt Pocock (MP), ECC or a mix? | **Default: plain Claude Code** for small, clear tickets. **Recommended pilot for feature work: "MP thinks, ECC builds"** (MP grill → spec → tickets; ECC plan → TDD → review). Alternative: MP + a few copied ECC reviewer files. |
| **Q2** Which ECC parts are worth taking? | **Worth it:** the build workflow (`/ecc:plan` → `tdd-workflow` → `/ecc:code-review`) + the rules (tailored). **Not proven:** GateGuard (34 blocks, no visible benefit), "proactive" agents (never fired), per-laptop memory, the 290-skill catalog (~14% relevant). |
| **Q3** Does Graphify pay off, at what repo size? | **No, not at our scale and not for a Go backend today.** On a 1,258-file Go + TS repo: same accuracy, no reliable saving, slower when relied on; graph **misses most calls to Go methods** ("who calls this?" → "nobody"). Don't adopt; re-test on triggers (§10.4). |

**Key facts behind it**
- **All setups produced correct code** on both tasks (incl. a hidden race condition). Plugins don't buy correctness at this ticket size; they buy **process, edge-case quality, tests, docs**.
- **Plain Claude Code: 5–10× cheaper, 3–6× faster**, but guesses silently and leaves latent bugs.
- **ECC beat MP on most metrics:** usage **26% vs 41%**, time **60 vs 81 min**, questions **4 vs 26**, frontend tests **41 vs 25**, input validation **2/2 vs 1/2**.
- **MP wins on thinking:** product questions that changed the outcome, spec reviewer fixed subtle bugs, most robust frontend state, spec + tickets + glossary left in the repo, tiny context cost, safe install.
- **Graphify:** plain Claude answered all 3 navigation questions perfectly (23/23) in < 4 min each; Graphify added setup, 47 MB of generated files, 75 s updates, and misleading empty "affected" results.

---

## 1. Background & goal

### 1.1 Context
- Helios team adopted a Claude Code workflow (Helios doc **v1.1.2**) built on **Matt Pocock's skills**; team currently piloting it.
- Team lead asked: **explore and evaluate two Claude Code plugins, Everything Claude Code (ECC) and Graphify**, and **recommend a workflow**: "maybe just ECC, or just Matt Pocock, or some stuff in ECC could be added… you evaluate, explore and decide."
- Stack: **Next.js** web, **Go** backend, **PostgreSQL**; Kouventa chats on **Firestore**. Company plan: Claude Code Enterprise (usage limits matter). Tests run on a **Pro** plan.

### 1.2 Goal
Evaluate with evidence, not opinion, then give the team **one recommended workflow + what to install + when to use what**.

### 1.3 Research questions
| ID | Question |
|---|---|
| Q1 | Which workflow (MP, ECC, combination) gives the best quality for the cost and friction? |
| Q2 | Which ECC components are worth adopting? |
| Q3 | Does Graphify pay off, and on what repo size? |

### 1.4 Constraints
- Pro plan usage limits → **1 run per setup per task**.
- Limited time → small, controlled tasks; no access to the real Helios codebase (intern) → purpose-built test bed + an open-source repo.
- Priority: **don't mislead**. Every claim below is tied to a measurement, a file, or marked as untested.

---

## 2. The tools at a glance

Not three versions of one thing; they work at **different layers**:

| Layer | Question it answers | Matt Pocock | ECC | Graphify |
|---|---|---|---|---|
| **Process** | In what order do we work? | ✅ grill → spec → tickets → TDD → review | ✅ plan → TDD → review | – |
| **Guardrails / automation** | What runs automatically on every action? | – (none by default) | ✅ hooks: GateGuard, config protection, format/typecheck, session memory | ⚠️ hooks only nudge Claude toward the graph |
| **Knowledge** | What does the agent know? | Small: glossary + ADRs in repo | ✅ 292 skills, 68 agents, rule packs (Go, React, security …) | ✅ map (graph) of *this* codebase |
| **Size / footprint** | | ~24 skills, +0.5k context | Huge catalog, +13.7k context | 47 MB generated files per repo |

→ The real question is **"which layers do we want, from which tool?"**, not "which tool wins?".

---

## 3. Matt Pocock skills (baseline: current Helios workflow)

### 3.1 What it is
- ~24 engineering + productivity **skills** (Markdown playbooks) forming one opinionated workflow.
- Repo `github.com/mattpocock/skills`, MIT, single maintainer. Tested **v1.2.3**.
- **Skills only:** no hooks, no agents installed, no always-on rules. Context cost **+0.5k tokens** (measured).

### 3.2 Install / set up (as tested)
```bash
npx skills@latest add mattpocock/skills      # choose: project scope, Claude Code, skills
/setup-matt-pocock-skills                    # once per repo: issue tracker, labels, docs layout
```
- Tracker used in tests: **local markdown** (issues = files under `.scratch/<feature>/`), to keep runs isolated. Helios doc uses GitHub Issues.
- Alternative: Claude Code plugin `mattpocock-skills` (managed). **Pick one**, not both (duplicates every skill).

### 3.3 How it works
| Step | Command | What happens |
|---|---|---|
| Plan | `/grill-with-docs <feature>` | **Interviews you** one question at a time until requirements are settled; writes `CONTEXT.md` (glossary) + ADRs |
| Spec | `/to-spec` | Writes a spec (user stories, decisions) to the tracker |
| Tickets | `/to-tickets` | Slices spec into **vertical-slice** tickets |
| Build | `/implement <ticket>` (one per session, `/clear` between) | Runs `/tdd` (tests **only at pre-agreed public seams**) then `/code-review` |
| Review | (inside `/implement`) | **2 reviewer subagents per ticket:** Standards + Spec; fixes findings itself |
| Hygiene | `/handoff`, `/clear` | Hand-off note in the repo; small sessions |

- **Knowledge lives in the repo** (spec, tickets, `CONTEXT.md`, ADRs) → shared through git.
- Cost driver: **per-ticket reviewer subagents (Opus-level)** + multiple sessions → cost scales with ticket count.

---

## 4. Everything Claude Code (ECC)

### 4.1 What it is
- Claims to be a "harness-native agent operating system": skills, agents, hooks, rules and conventions for Claude Code (and Codex, Cursor, Gemini, …).
- Repo `github.com/affaan-m/ECC` (brief's `affaan-m/ecc` redirects). npm `ecc-universal`. Plugin id `ecc@ecc`. MIT.
- **Single maintainer** (Affaan Mustafa); commercial upsell (ECC Pro GitHub App, $19/seat/month).
- Tested **v2.2.2** (2026-09-15). **Very fast churn:** release every 2–6 weeks; 2.2.0 alone changed **530 files / 108 commits**.
- Catalog: **68 agents, 292 skills, 94 commands, 23–24 hook registrations**, rule packs for 21 languages/frameworks. **~40 items (~14%) relevant** to our stack.

### 4.2 Install / set up (as tested, and problems hit)
```bash
# inside Claude Code, project scope
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc            # choose "Project"
```
**Rules are NOT installed by the plugin** (plugins can't ship rules) → copy by hand and commit:
```powershell
# from the plugin cache into the repo
Copy-Item -Recurse "$HOME\.claude\plugins\cache\ecc\ecc\2.2.2\rules\common"     .claude\rules\ecc\common
Copy-Item -Recurse "$HOME\.claude\plugins\cache\ecc\ecc\2.2.2\rules\golang"     .claude\rules\ecc\golang
Copy-Item -Recurse "$HOME\.claude\plugins\cache\ecc\ecc\2.2.2\rules\typescript" .claude\rules\ecc\typescript
Copy-Item -Recurse "$HOME\.claude\plugins\cache\ecc\ecc\2.2.2\rules\react"      .claude\rules\ecc\react
```
**Problems hit (all reproducible):**
| Problem | Cause | Fix |
|---|---|---|
| `npx ecc-universal@2.2.2 setup` → `ETARGET` | README pins a version **not published on npm** (latest published: 2.2.1) | Use the `/plugin` commands above |
| Windows: "Plugin ecc not cached" | Broken plugin cache, long paths | `/plugin uninstall ecc@ecc` → delete `~/.claude/plugins/cache/ecc` → `git config --global core.longpaths true` → reinstall |
| `/plugin` installs whatever is on `main` | Marketplace = the repo, not a release | Record installed version; upgrade on purpose |
| Whole catalog installed | Selective install (`--profile minimal`, `--skills …`) only exists on the npx/manual path | Accept, or copy files manually (Path 1) |

### 4.3 How it works: five mechanisms
| Mechanism | What | Context cost | Triggered by |
|---|---|---|---|
| **Skills** (292) | Markdown playbooks (`tdd-workflow`, `security-review`, `golang-testing` …) | Name + description of every skill listed each turn; body loads when used | Model picks from description, or you invoke |
| **Agents** (68) | Subagents with own prompt (`planner`, `code-reviewer`, `go-reviewer`, `security-reviewer` …). Reviewer agents run on **Sonnet** | Separate context when run | Commands, skills, or the model |
| **Commands** (94) | Slash entry points: `/ecc:plan`, `/ecc:code-review`, `/ecc:security-scan` … | Listed | You type |
| **Hooks** (23–24) | Node scripts Claude Code runs **automatically** before/after tool calls, on stop, on session start; **can block** actions | Some inject text | Automatic |
| **Rules** | Always-on guidance; `common` always loaded (~**4.6k tokens**), language packs path-scoped | Every turn | Automatic |

**Measured start-of-session context:** stock 34.6k → **ECC 48.3k (+13.7k tokens every turn)**, 306 skill entries listed, 24 hooks.

**Most useful skills for our stack** (Go + Next.js/React/TS + Postgres)
| Skill | What it does | Used / seen in tests? |
|---|---|---|
| **`tdd-workflow`** | Failing test first → smallest fix → green → refactor; 80%+ coverage (unit, integration, E2E); accepts a `*.plan.md` | ✅ **Core of ECC build**; 21% of ECC usage |
| **`security-review`** | Checklist for auth, user input, secrets, API endpoints | ❌ Not invoked |
| `golang-patterns` / `golang-testing` | Idiomatic Go; table-driven tests, subtests, fuzzing, coverage | Loaded on demand |
| `react-patterns` / `react-testing` | Hooks, server/client boundaries, Suspense; RTL + Vitest/Jest + MSW | Loaded on demand |
| `frontend-patterns` | React/Next.js state, performance, UI practices | Loaded on demand |
| `api-design` / `backend-patterns` / `error-handling` | REST naming, status codes, pagination; server patterns; typed errors (Go/TS) | Loaded on demand |
| `postgres-patterns` / `database-migrations` | Query/schema/index design; safe, reversible migrations | Not relevant to test tasks (Firestore) |
| `verification-loop` | 6-phase check of a session: build, types, lint, tests + coverage, security | Not invoked |
| `e2e-testing` | Playwright patterns, page objects, flaky-test handling | Not invoked |
| `context-budget` | Audits what's eating the context window (agents, skills, MCP, rules) | Not invoked; cheap, useful |
| `codebase-onboarding` | Generates an onboarding guide: architecture map, entry points | Not invoked |

**Most useful agents** (subagents with own context; model per agent file)
| Agent | Model | What it does | Used in tests? |
|---|---|---|---|
| `planner` | Opus | Plans complex features/refactors | ❌ (`/ecc:plan` runs inline by default) |
| `code-reviewer` | Sonnet | Quality, security, maintainability review | ❌ Never fired on its own |
| **`go-reviewer`** | Sonnet | Idiomatic Go, concurrency, error handling, performance | ❌ (candidate add-on, Path 1) |
| **`typescript-reviewer`** | Sonnet | Type safety, async correctness, web security | ❌ (candidate add-on) |
| **`react-reviewer`** | Sonnet | Hook correctness, render performance, server/client boundaries | ❌ (candidate add-on) |
| **`security-reviewer`** | Sonnet | Vulnerability detection + fixes (user input, auth, secrets) | ❌ **Never ran** |
| `database-reviewer` | Sonnet | PostgreSQL queries, schema, security | ❌ |
| `tdd-guide` | Sonnet | Enforces tests-first | ❌ |
| `go-build-resolver` / `build-error-resolver` | Sonnet | Fixes Go / TS build and type errors | ❌ |
| `architect` | Opus | System design, scalability decisions | ❌ |

⚠️ Many agent descriptions say "Use **PROACTIVELY**", but **0 subagents were launched in both ECC runs**: in practice you must ask for them by name.

### 4.4 The build workflow (ECC README "Building a feature")
| Step | You type | What ECC does |
|---|---|---|
| 1 Plan | `/ecc:plan <feature>` (or a PRD/spec file path) | Restates requirements, maps existing patterns with file:line refs, **lists risks with severity**, phased plan, asks few questions or offers defaults, **waits for approval** |
| 2 Build | "Yes, proceed. Implement it using the tdd-workflow skill." | **Strict TDD:** failing test → commit → smallest fix → green → refactor; targets **80%+ coverage** (unit + integration + E2E); evidence report |
| 3 Review | `/ecc:code-review` | Security + quality review, severity CRITICAL/HIGH/MEDIUM by its rules. Docs say "uncommitted changes or a PR"; **in 2.2.2 runs it reviewed the committed branch correctly** |
| 4 Fix | "Fix the CRITICAL and HIGH issues." | Fixes; asks before MEDIUM items |

### 4.5 What runs automatically (hooks, standard profile)
| When | Hook | Effect | Blocks? |
|---|---|---|---|
| Before Edit/Write | **GateGuard** | **Denies the first edit of each file** until Claude states facts (importers, affected API, schemas, quote of instruction), then allows retry | **Yes** |
| Before Bash | GateGuard (bash), block-no-verify, commit-quality | Destructive commands need target list + rollback; blocks `--no-verify` | Yes |
| Before Edit/Write | config-protection | Blocks edits to linter/formatter configs | Yes |
| After Edit/Write | quality-gate, console.log warn, design check | Warnings | No |
| Stop (each reply) | format + typecheck | Prettier/Biome + `tsc` on edited JS/TS | Reports |
| SessionStart | session bootstrap | **Injects previous session summary + learned "instincts"** (≤ 8k chars) | No |
| Any tool | observe / metrics | Telemetry to local files | No |

Control: `ECC_HOOK_PROFILE=minimal|standard|strict`; `ECC_DISABLED_HOOKS=<ids>`; `ECC_SESSION_START_CONTEXT=off`.

### 4.6 State ECC writes outside the repo (per laptop)
| Path | What |
|---|---|
| `~/.claude/session-data/` | Session summaries, **re-injected next session** |
| `~/.claude/skills/learned/` | "Learned" skills |
| `~/.local/share/ecc-homunculus/` | Continuous-learning observations |
| `~/.gateguard/` | GateGuard session state |

→ ECC **remembers across sessions, per developer, not via git** (unlike MP's repo files). Cleared before every ECC test run to avoid contamination.

### 4.7 ECC vs MP overlap (summary)
| Phase | MP | ECC | Relation |
|---|---|---|---|
| Planning | `/grill-with-docs` (interviews you) | `/ecc:plan` (proposes, you approve) | Overlap, different style |
| Spec/tickets | `/to-spec`, `/to-tickets` (tracker) | `plan-prd`, `epic-decompose` | Overlap |
| TDD | `/tdd`: tests at agreed seams only | `tdd-workflow`: 80%+ coverage all layers | **Conflict** → pick one |
| Review | `/code-review`: Standards + Spec | `/ecc:code-review`: security + quality | Overlap, different focus |
| Stack/security reviewers | none | `go-reviewer`, `typescript-reviewer`, `react-reviewer`, `security-reviewer` | **ECC adds** |
| Guardrails | none (opt-in setup skills) | GateGuard, config-protection, format/typecheck | **ECC adds** |
| Memory | repo files (shared) | laptop files (automatic) | Different philosophy |

---

## 5. Graphify

### 5.1 What it is
- Builds a **knowledge graph of one codebase** (functions, classes, files + calls/imports/references between them) that the agent queries **instead of grepping and opening many files**.
- Pitch: smaller, relevant context → fewer tokens, better navigation on big repos.
- Repo `github.com/Graphify-Labs/graphify`; PyPI `graphifyy`. Tested **0.9.67**. Commercial hosted version in early access.

### 5.2 Install / set up (as tested)
```powershell
uv tool install graphifyy==0.9.67      # or pipx
cd <repo>
graphify update .                       # build code graph (tree-sitter, no LLM, free)
graphify claude install                 # connect to Claude Code (project)
```
`graphify claude install` writes:
- **`CLAUDE.md` `## graphify` section:** "For codebase questions, first run `graphify query "<question>"`… use `graphify path` for relationships and `graphify explain` for focused concepts… after modifying code, run `graphify update .`"
- **`.claude/settings.json` PreToolUse hooks:** matcher `Bash|Grep` → `graphify hook-guard search`; matcher `Read|Glob` → `graphify hook-guard read`. Default = soft nudge; `--strict` blocks the first raw read until a query ran.

Optional: `graphify hook install` (git hooks: rebuild on commit/checkout, merge driver for `graph.json`); `graphifyy[sql]` extra for `.sql` files; `graphifyy[mcp]` MCP server.

### 5.3 How it works
| Stage | What |
|---|---|
| Detect | Classifies files; skips unsupported (e.g. Dockerfile, LICENSE) |
| Extract (code) | **tree-sitter AST**, local, deterministic, parallel workers, cached → nodes (functions, methods, types, files) + edges (`calls`, `imports`, `references`, `method`, `contains` …), tagged **EXTRACTED** or **INFERRED** |
| Extract (docs/PDF/images) | **Semantic pass with an LLM** (costs usage; pilot build ~235k tokens). **Not used in our test** |
| Cluster | Community detection (Leiden/Louvain) → groups of related code, named by hub node or by LLM (`graphify label`) |
| Output | `graphify-out/graph.json` (graph), `graph.html` (interactive viz; > 5,000 nodes → aggregated community view), `GRAPH_REPORT.md`, `manifest.json`, `cache/` |
| Query | `query "<text>"` (keyword-seeded BFS over the graph), `explain <node>` (node + its connections), `path A B`, `affected <node>` (reverse dependencies), `god-nodes`, `benchmark` |

### 5.4 Vendor evidence (read critically)
- README benchmarks = **conversational-memory** benchmarks (LOCOMO, LongMemEval), not coding agents in a repo.
- Built-in `graphify benchmark` measures token reduction vs reading the **entire corpus**; no coding agent does that (Claude greps + opens a few files) → **unfair baseline**. Our test uses plain Claude Code as the baseline.

---

## 6. Evaluation A: Workflows (Stock vs Matt Pocock vs ECC)

### 6.1 Test bed: `mini-kouventa`
- Purpose-built Kouventa-like app: **Go (net/http) + Firestore** backend, **Next.js 14 / React / Tailwind** frontend, inbox UI, frontend design-system rules file.
- Every run starts from the same clean commit **`eval-base-v2`** (`c4a1e0a`) in its own **git worktree** (`run/<RUN-ID>` branches).

### 6.2 Setups ("chefs")
| ID | Setup | Workflow followed (its own documented one) |
|---|---|---|
| **C0** | Plain Claude Code | Paste prompt |
| **C1** | MP skills (project scope, local-markdown tracker) | `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` per ticket (`/clear` between) |
| **C2** | ECC 2.2.2 plugin (project, standard hooks, rules common+golang+typescript+react) | `/ecc:plan` → `tdd-workflow` → `/ecc:code-review` → fix CRITICAL/HIGH |

### 6.3 Tasks
| Task | Type | Traps |
|---|---|---|
| **F1 Internal Room Notes** | Routine, **fully specified** ticket: API + tabbed UI + validation | Input validation, tabs |
| **F2 Room Claiming + SLA** | Tricky, **realistic thin product ticket** (v2) | **Race condition** (2 agents claim at once), live SLA badge, nested-button HTML, product rules not spelled out |

### 6.4 Method & fairness
- **Constants:** Opus 5.5, medium effort, auto mode, frozen prompts, same machine; questions answered **only from a fixed answer sheet** ("product owner"); no hints/fixes by tester; ECC memory cleared before ECC runs; plugins project-scope only; global config audited.
- **Correctness:** automated API checkers: **F1 14 checks; F2 11 checks incl. 10 agents claiming the same room simultaneously × 5 rooms**. Checkers validated against correct + deliberately buggy mock servers first. 7-point UI checklist per task (incl. two-tab conflict).
- **Cost/friction:** usage % of 5-h window, active time (transcript), tokens, tool calls, questions, replies, permission prompts, subagents, GateGuard blocks, tests, commits, start-up context.
- **Code review** of all 6 branches afterwards (`docs/code-analysis.md`).
- **Disclosed deviations:** F2 prompt rewritten to v2 before any F2 run; F2 checker made storage-agnostic before first use; in F2-C2, ECC's 2 "open questions with defaults" weren't answered (1 UI behaviour affected).

### 6.5 Results

**Per run**
| | F1 C0 | F1 C1 | F1 C2 | F2 C0 | F2 C1 | F2 C2 |
|---|---|---|---|---|---|---|
| API checker | 14/14 | 14/14 | 14/14 | 11/11 | 11/11 | 11/11 |
| Race test | n/a | n/a | n/a | ✅ | ✅ | ✅ |
| UI checklist | 7/7 | 7/7 | 7/7 | 7/7 | 7/7 | 7/7 |
| **Usage (% of 5-h)** | **+3** | **+24** | **+16** | **+2** | **+17** | **+10** |
| Active time (min) | 12.5 | 47.1 | 39.0 | 6.1 | 34.3 | 20.9 |
| Output tokens | 17k | 85k | 91k | 16k | 60k | 62k |
| Tool calls | 22 | 111 | 78 | 15 | 90 | 64 |
| Questions to dev | 0 | 16 | 2 | 0 | 10 | 2 |
| Permission prompts | 11 | 52 | 32 | 13 | 35 | 19 |
| Sessions | 1 | 4 | 1 | 1 | 3 | 1 |
| Reviewer subagents | 0 | 6 | 0 | 0 | 4 | 0 |
| GateGuard blocks | – | – | 16 | – | – | 18 |
| Frontend tests | 3 | 17 | 20 | 6 | 8 | 21 |
| Commits | 0 | 4 | 8 (TDD) | 0 | 2 | 5 (TDD) |

**Totals (both tasks)**
| | Stock | Matt Pocock | ECC |
|---|---|---|---|
| Usage | **5%** | 41% | 26% |
| Active time | **18.6 min** | 81.4 min | 59.9 min |
| Questions / replies | 0 / 0 | 26 / 4 | 4 / 2 |
| Permission prompts | 24 | 87 | 51 |
| Frontend tests | 9 | 25 | **41** |
| Start-up context | 34.6k | +0.5k | **+13.7k** |

**Where usage went** (Claude Code `/usage` insights, last 24 h, all runs; categories overlap, so shares don't sum to 100%)
| Driver | Share of usage | Meaning |
|---|---|---|
| Subagent-heavy sessions | **51%** | Sessions that launched subagents (mostly MP reviewers) |
| ECC plugin (all skills/agents/hooks) | 26% | of which **`tdd-workflow` 21%** |
| MP `/implement` | 18% | Per-ticket build sessions |
| MP `code-review` subagents | 15% | 2 Opus-level reviewers per ticket |
| Sessions > 150k context | 18% | Long sessions re-send big context each turn |

**Code analysis (all 6 branches)**
| Aspect | Stock | MP | ECC |
|---|---|---|---|
| Correctness | = | = | = |
| **Room-ID validation** (encoded `/` → other Firestore path) | 1/2 | 1/2 (missed F2; reviewers didn't flag) | **2/2** |
| **Data consistency** (F2 `waitSeconds` vs `slaBreached`) | ✗ | ✓ reviewer fixed it | ✓ by design |
| **Product rule** (badge only on unassigned rooms) | ✗ guessed | **✓ asked** | ✗ used default (protocol miss) |
| **Frontend state** (stale-tab reload; two claims at once) | ✗ both | **✓ neither** | ✗ both (found, rated MEDIUM, not fixed) |
| **Test depth** | validation only | HTTP layer F1; rules only F2 | **HTTP both + DB tests (F1)** |
| Artifacts | none | spec, tickets, `CONTEXT.md` | TDD evidence report |

---

## 7. Analysis A & recommendation (Q1, Q2)

### 7.1 Findings
1. **Correctness isn't the differentiator.** Opus 5.5 handled a specified ticket and a hidden race condition with no plugin. Value is **edge-case quality, process, docs**.
2. **Stock = efficiency benchmark** (5% total) but **guesses silently** + **latent bugs** (data inconsistency, 2 frontend state bugs, missing ID validation in F1).
3. **ECC = stronger builder:** cheaper + faster than MP, least developer time, strict TDD, most tests, most consistent input validation (likely from always-on security rules + TDD edge-case habit).
4. **MP = stronger thinker:** surfaced product decisions (only setup to get the badge rule right), Spec reviewer fixed subtle bugs, best frontend state, documented decisions in the repo. But **grilled 16 questions even on a fully specified ticket**.
5. **Each covers the other's failure mode:** MP's seam choice left F2's HTTP/DB untested + missed an input check; ECC's rule-driven review left real UI bugs as MEDIUM and rated style (50-line functions) HIGH.
6. **ECC's automation layer didn't earn its keep:** GateGuard **34 blocks, 0 observed prevented mistakes**; "MUST BE USED / PROACTIVELY" agents **never fired** (0 subagents). Value came from **workflow + rules**, not hooks/catalog.
7. **Workflow shape drives cost more than plugin size:** ECC's +13.7k/turn mattered less than MP's multiple sessions + per-ticket Opus reviewers.

### 7.2 Head to head: MP vs ECC
| Dimension | Winner | Evidence |
|---|---|---|
| Correctness | Tie | 14/14 + 11/11 both |
| Usage / speed | **ECC** | 26% vs 41%; 60 vs 81 min |
| Developer interruptions | **ECC** | 4 vs 26 questions; 51 vs 87 prompts |
| Tests / TDD evidence | **ECC** | 41 vs 25 FE tests; RED→GREEN commits |
| Input / security validation | **ECC** | 2/2 vs 1/2 |
| Requirement discovery | **MP** | Questions that changed the outcome |
| Subtle-bug fixing (spec fidelity) | **MP** | waitSeconds/breach, trim mismatch fixed |
| Frontend state robustness | **MP** | 0 vs 2 known bugs |
| Shared knowledge in repo | **MP** | spec, tickets, glossary |
| Context overhead / install risk | **MP** | +0.5k vs +13.7k; skills vs plugin + hooks + churn |

### 7.3 Strengths & weaknesses
| | ✅ Strengths | ❌ Weaknesses | Best for |
|---|---|---|---|
| **Plain Claude Code** | Correct both tasks; 5–10× cheaper; minutes not tens of minutes; no setup; lists "decisions you may want to change"; tests unprompted | Guesses product rules; no plan/spec/review/commits; fewest tests; latent bugs | Small, clear, low-risk tickets |
| **Matt Pocock** | Requirement discovery; spec + vertical-slice tickets; Spec + Standards review that fixes; robust FE state; knowledge in git; +0.5k context; simple install | Most expensive (41%) + slowest; most interaction (26 Qs, 87 prompts); grills even when clear; seam choice can skip layers; missed a validation; left spec/glossary uncommitted | Unclear/product-heavy tickets; multi-session features |
| **ECC** | Plan with risks; strict TDD; most tests incl. HTTP + DB; consistent input validation; low developer time; honest open-issues list | +13.7k context/turn; 306 skills listed, ~14% relevant; GateGuard friction; proactive agents don't fire; review severity follows style rules; laptop memory; fragile install; single maintainer, 500+ files/release | Clear tickets where correctness, security, test depth matter |

### 7.4 Corrections made during the evaluation (transparency)
- Pilot finding "`/ecc:code-review` reviews nothing after commits" **not reproduced** in 2.2.2.
- The `%2F` security fix came from ECC's **TDD flow with rules loaded**; ECC's `security-reviewer` agent **never ran**.
- An earlier draft favoured MP because of the prior Helios recommendation; **data showed ECC's build workflow was cheaper overall** → rewritten neutrally.

### 7.5 Options considered
| Option | Verdict |
|---|---|
| A. Plain Claude Code only | **Default for small, clear tickets** |
| B. MP only (current Helios doc) | Acceptable, not best-evidenced |
| C. ECC only (full plugin) | Viable, loses MP's thinking strengths |
| D. **Path 1: MP + copied ECC reviewer files** | **Alternative** (low risk) |
| E. **Path 2: MP thinks, ECC builds** | **Recommended pilot** |
| F. Both full packages side by side | **Not recommended** (two planners, conflicting TDD, two reviews, hooks affect MP sessions) |

### 7.6 Recommended pilot: Path 2 "MP thinks, ECC builds"
**Flows**
| Ticket | Flow |
|---|---|
| Trivial / small + clear | Plain Claude Code (optionally built-in plan mode, Shift+Tab; untested) |
| Clear feature | `/ecc:plan <feature>` → approve → "Implement it using the tdd-workflow skill" → `/ecc:code-review` → fix |
| Unclear feature | `/grill-with-docs` → `/to-spec` → `/ecc:plan Implement the spec in .scratch/<feature>/spec.md` → TDD → review → fix |
| > 1 session | … `/to-tickets` → per ticket: `/ecc:plan Implement ticket .scratch/<feature>/issues/<n>.md` → TDD → review → `/handoff` + `/clear` |

**Review rule (from evidence):** fix all CRITICAL/HIGH **and every MEDIUM that describes wrong behaviour**; style-only findings optional.

**Install**
- **MP thinking skills only** (project scope): `grill-with-docs`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `handoff`, `setup-matt-pocock-skills` (+ optional `ask-matt`, `prototype`). **Not** `tdd`, `implement`, `code-review` (ECC covers; avoids the TDD conflict).
- **ECC plugin** (project scope) via `/plugin` (§4.2). Record version (tested 2.2.2); upgrade deliberately.
- **ECC rules** `common`, `golang`, `typescript`, `react` → `.claude/rules/ecc/`, committed. **Tailor** `common/coding-style.md` (50-line limit) and `common/testing.md` (80% coverage) to team norms; they drove both strictness and style-first severity.
- Decide in pilot: GateGuard keep vs `ECC_DISABLED_HOOKS`; `ECC_SESSION_START_CONTEXT=off` for predictability.

**Pros:** each tool used for its proven strength; usage/dev time between ECC-only and MP-only; keeps ticket flow + docs; strongest tests + validation observed.
**Cons/risks:** **combination never run** (spec → `/ecc:plan` handoff designed for, untested); ECC operational cost (+13.7k/turn, hooks running third-party code, laptop memory, churn, Windows install issues); review needs the behaviour-fix rule; two convention sources (MP skills + ECC rules) to keep consistent.

### 7.7 Alternative: Path 1 "MP + ECC security add-ons"
- Current Helios workflow + small-ticket fast path (skip `/to-tickets` if it fits one session) + explicit security review for risky changes: *"Use the security-reviewer agent to review this branch against main."*
- Install: MP skills (Helios doc) + copied ECC files (v2.2.2): `agents/security-reviewer.md`, `go-reviewer.md`, `typescript-reviewer.md` (+ `react-reviewer.md`), `skills/security-review/`, `skills/context-budget/`; optional `rules/common/security.md`. **No plugin, no hooks.**
- ✅ Lowest adoption risk; +0.5k context; known workflow; ECC reviewers on Sonnet (cheaper). ❌ Highest usage + interaction; keeps MP's test-depth gap; uses ECC's **least** proven part (security agent never ran), not its most proven (build workflow).

### 7.8 Q2 answer: which ECC parts
| ECC component | Verdict | Why |
|---|---|---|
| `/ecc:plan` | **Take** | Risks with severity, pattern mapping, few questions |
| `tdd-workflow` | **Take** | Most tests, HTTP + DB layers, visible RED→GREEN; main usage driver (21%) |
| `/ecc:code-review` | **Take, with behaviour-fix rule** | Reviewed full branch; severity follows rules |
| Rules (common/golang/typescript/react) | **Take, tailored** | Likely source of consistent validation; style rules over-weight severity |
| Stack reviewers (`go-`, `typescript-`, `react-reviewer`) | Optional | Plausible gap-fillers; not exercised in runs |
| `security-reviewer` / `security-review` | Optional, **untested** | Never ran |
| GateGuard | **Doubtful** | 34 blocks, no observed benefit; disable if friction > value |
| Proactive agents | No value observed | Never fired |
| Session memory / continuous learning | Not recommended for team | Per-laptop, automatic, not reviewable/shared |
| Rest of catalog (~86%) | Irrelevant | Other stacks/domains; costs context |

---

## 8. Evaluation B: Graphify

### 8.1 Test bed: `usememos/memos`
- Open-source notes app pinned at commit **`a80576a`** (2026-09-28).
- **Go backend (~100k hand-written lines), React/TypeScript frontend, PostgreSQL/MySQL/SQLite drivers, 1,258 code files** (~10–20× mini-kouventa). Close to Helios stack.
- Why not mini-kouventa: too small; Claude finds anything in a few searches, a map can't help (also seen in the pilot).

### 8.2 Why questions, not a feature build
Graphify only affects the **"finding your way"** part of feature work, not code writing. Questions isolate that part; a full build buries it under coding noise and costs 5–40% usage per run.

### 8.3 Questions (answer keys verified against source; kept outside the repo)
| ID | Type | Question (short) | Key items |
|---|---|---|---|
| GQ1 | **Trace a flow** | Create memo from web UI → API → handler → store → DB | 8 |
| GQ2 | **Find a rule** | Where is memo read access (public/protected/private/space) decided, single + list | 6 |
| GQ3 | **Blast radius** | What must be updated/re-tested if `Store.ApplyMemoMutation` signature changes | 9 |

### 8.4 Conditions
| ID | Setup |
|---|---|
| **G0** | Clean clone, plain Claude Code |
| **G1** | Separate clone + code-only graph + `graphify claude install` (default, as vendor recommends) |
| **G2** | G1 + forcing sentence: "Use the graphify knowledge graph as your main source: run graphify explain, graphify path or graphify affected … only use grep or read files to verify" (best case) |

Same constants: Opus 5.5, medium, auto mode, fresh session per question, **0 interventions** in all 9 runs. Measured: recall vs key, wrong claims (extras spot-checked), output tokens, tool calls, Claude working time, usage %, graphify commands used. Extras named in answers spot-checked against source: **all real**.

### 8.5 Results

**Totals (3 questions)**
| Condition | Recall | Wrong | Output tokens | Tool calls | Working time | Usage |
|---|---|---|---|---|---|---|
| **G0 plain** | **23/23** | 0 | 16,967 | 38 | ~5.6 min | ~4% |
| **G1 default** | **23/23** | 0 | 15,589 (−8%) | 26 | ~4.1 min | ~6% |
| **G2 forced** | **23/23** | 0 | 17,036 (±0%) | 38 | **~7.8 min** | ~3% |

Per question output tokens (G0 / G1 / G2): GQ1 7,845 / 6,607 / 6,451 · GQ2 5,399 / 4,647 / 4,492 · GQ3 3,723 / 4,335 / **6,093**. Usage moves in 1% steps; treat as "small in all".

**What the graph did**
| Run | Graph commands | Outcome |
|---|---|---|
| GQ1-G1 | `query` ×1 | "Graph is noisy here; I'll go to source directly." (mostly test files) |
| GQ2-G1 | `query` ×1 | 2,097 nodes matched → "too broad; narrowing with grep" |
| GQ3-G1 | `explain` ×2 (right command, right node) | Showed only what the function calls, **not its callers**; Claude noticed + grepped |
| GQ1-G2 | `explain` ×8, `query` ×1 | "No edge across the interface dispatch"; "almost no call edges on the TS side"; filled by reading |
| GQ2-G2 | `explain` ×7, `query` ×1 | **Best showing:** "from the helpers onward, the graph's call edges matched the source"; missed GetMemo/ListMemos → access helpers |
| GQ3-G2 | `explain` ×3, `affected` ×3 | `affected` → **no callers** (real: 3 direct, 6 indirect); same answer via grep at **+64% tokens, ~3× time** vs G0 |

**Build & upkeep (user laptop, Windows)**
| Item | Measured |
|---|---|
| Install | Smooth. 4 `.sql` files skipped until `graphifyy[sql]` installed |
| First build | **98 s** → 13,142 nodes, 56,194 edges, 322 communities, **47 MB** (`graph.json` ~26 MB); no LLM, no usage |
| Update after **1-line** change | **75 s**; re-parsed **716 of 1,258** files; communities 322 → 303, **158 renamed** |
| Staleness | Graph wrong after every change until rebuilt; team must commit 47 MB generated files or rebuild per machine (+ optional git hooks) |

---

## 9. Analysis B & recommendation (Q3)

### 9.1 Findings
1. **No accuracy gain:** plain Claude already perfect (23/23, < 4 min per question) → no headroom.
2. **No reliable cost gain:** G1's −8% came from runs where Claude **ignored** the graph → run-to-run variation. When Claude **relied** on it (G2): same tokens, **~40% more time**; GQ3 +64% tokens.
3. **Default setup gets ignored:** `CLAUDE.md` makes Claude run `graphify query` first; keyword search returns hundreds–thousands of nodes (many tests) → Claude falls back to grep.
4. **Dangerous gap for "what breaks?":** `graphify affected` on `ApplyMemoMutation` → **nothing affected** (real: 9 functions/endpoints). Claude verified; **a developer reading the graph directly would not**.
5. **Where it works:** `graphify explain <exact plain function>` (e.g. `CheckMemoReadContext`) → excellent one-call summary of definition + callers with line numbers. Requires knowing the name.

### 9.2 Root cause (measured on `graph.json`)
- Go **methods** (`func (s *APIV1Service) checkMemoReadAccess`) average **0.21 incoming call edges**; plain Go **functions 1.83** (~9× more). Calls like `s.method(...)` / `s.Store.Method(...)` mostly **not linked**.
- Example: `checkMemoReadAccess` = **10** production call sites → graph shows **0**. `Store.ApplyMemoMutation` = 3 → graph 0; `path CreateMemo → ApplyMemoMutation` = no path.
- memos: **3,924 methods vs 2,468 functions**. Service-style Go (handlers/stores as struct methods), **same pattern as Helios backend** → graph blind exactly where business logic lives.
- Pilot (mini-kouventa) also saw: missed JSX render edges; agent read files anyway; Graphify git hook leaked into a "stock" run.

### 9.3 Q3 answer by repo size
| Repo | Verdict | Evidence |
|---|---|---|
| Small (mini-kouventa) | **No** | Nothing to save; pilot agent read files anyway |
| ~1,000–1,500 files, ~100k Go lines (memos) | **No** | Tested: same accuracy, no reliable saving, slower when relied on, Go method calls missing |
| Much larger / many services | **Unknown, not tested** | Grep gets costlier as repos grow; could help **if** Go call resolution improves |

### 9.4 Recommendation
- **Don't add Graphify** to the Helios workflow now: setup + 47 MB generated files + update step after every change + risk of misleading empty "affected" answers, **no measured benefit**.
- **Optional personal use:** build locally, `graphify explain <function>` as a quick lookup for plain functions, **always verify with search**. `graph.html` = nice onboarding picture of codebase shape (not evaluated as a tool).
- **Re-test triggers (any one):**
  - Release notes say Go method / struct-field calls resolved → re-run `graphify affected store_store_applymemomutation` on memos @ `a80576a`; should list 3 callers.
  - Helios grows to many services where Claude's searches visibly slow down or miss things.
  - Team wants a codebase visual for onboarding.

---

## 10. Final recommendation (all tools)

### 10.1 One-page answer
| Use | When | Tooling |
|---|---|---|
| **Plain Claude Code** + good `CLAUDE.md` | **Default.** Small, clear, low-risk tickets | Nothing to install |
| **ECC build** (plan → TDD → review) | Clear tickets where **correctness, security, tests** matter | ECC plugin (project) + tailored rules |
| **MP thinking** (grill → spec → tickets) | **Unclear / product-heavy** tickets; features > 1 session | MP thinking skills only |
| MP thinking **then** ECC build | Unclear **and** risky features | Both, as Path 2 |
| ~~Graphify~~ | Not now | Re-test on triggers |
| ~~Both full packages~~ | Never | Conflicting TDD/review/planning |

### 10.2 Decision guide for developers
**Step 1: classify the ticket**
| Question | If yes → |
|---|---|
| Is it trivial (typo, copy change, one-line fix)? | **Plain Claude Code**, stop here |
| Can you answer "what exactly should happen when…?" for every case? | Ticket is **clear** |
| Does it touch **input, IDs/paths, auth, secrets, money or concurrency**? | Mistakes are **costly** |
| Will it take more than one Claude session? | Ticket is **large** |

**Step 2: pick the workflow**
| Ticket | Mistakes cheap | Mistakes costly |
|---|---|---|
| **Clear** | **Plain Claude Code** | **ECC build:** `/ecc:plan` → TDD → `/ecc:code-review` → fix |
| **Unclear** | **MP** `/grill-with-docs` → `/to-spec`, then build (plain or ECC) | **MP** grill → spec, then **ECC build**; fix **all** behaviour findings |
| **Large** (any) | MP `/to-tickets`, then one build per ticket + `/handoff` + `/clear` | Same, with ECC build per ticket |

**Rules of thumb**
| # | Rule |
|---|---|
| 1 | **Start plain.** Most tickets don't need a workflow |
| 2 | Unsure what should happen → **grill first** |
| 3 | Risky area → **TDD + review; fix every behaviour finding**, whatever its severity label |
| 4 | Won't fit one session → **slice into tickets** |

### 10.3 Adoption pilot: trying it on real work before rolling out
**Why:** our tests used a small test app and one run each. Before changing the team's workflow, check that Path 2 works on **real Helios tickets**.

**Setup**
| Item | Plan |
|---|---|
| Who | 1–2 developers |
| How long | 2 weeks |
| What | Path 2 (§7.6) installed in one Helios repo, project scope |
| Comparison (optional) | Repeat one ticket with Path 1 (§7.7) |

**Pick at least one ticket of each kind**
| Ticket kind | Example | Flow to use |
|---|---|---|
| Clear, low-risk | Small UI change | Plain Claude Code |
| Unclear / product-heavy | Feature with open product questions | MP grill → spec → ECC build |
| Security-sensitive | Endpoint taking user input or IDs | ECC build, fix all behaviour findings |
| Multi-session | Feature too big for one session | MP tickets → ECC build per ticket |

**Record for every ticket** (copy into a simple sheet)
| Metric | How |
|---|---|
| Usage | `/usage` % before and after |
| Time | Start and end time |
| Interruptions | Questions Claude asked + permission prompts |
| Review | Findings found, and how many fixed |
| Bugs after merge | Found in QA or later |
| Worth it? | Developer rating 1–5 |

**Success = all of these**
| # | Criterion |
|---|---|
| 1 | No more bugs than the current workflow |
| 2 | Usage fits the team's Enterprise limits at normal ticket volume |
| 3 | Review catches ≥ 1 real issue per feature ticket, and behaviour findings get fixed |
| 4 | Developers rate unclear/risky tickets ≥ 4/5 (watch for grilling fatigue) |

**After the pilot:** success → update Helios doc to v1.2 (§10.4) and roll out. Not met → fall back to Path 1 or plain Claude Code + MP, depending on what failed.

### 10.4 Changes to Helios workflow doc (v1.1.2 → v1.2)
| Section | Change |
|---|---|
| Core philosophy | "Match the workflow to the ticket. Plain Claude Code is the default." |
| New entry step | Decision guide (§10.2) before Phase 1 |
| Phase 1 Planning | Grill only unclear tickets; clear → straight to `/ecc:plan` |
| Phase 3 Implementation | Path 2: `/ecc:plan` on spec/ticket → `tdd-workflow`; Path 1: `/implement` + fast path |
| Review | Fix all behaviour findings regardless of label; security review for risky changes |
| Token optimization | Measured overhead per setup; cost drivers (reviewer subagents, TDD skill, ticket count); avoid always-on plugins you don't use |
| Artifacts | Commit spec, tickets, `CONTEXT.md`; commit tailored ECC rules; pin plugin versions |
| Installation | Path 2 install list (§7.6), project scope, rules copy, Windows fix |
| Tools not adopted | Graphify: not adopted; re-test triggers (§9.4) |

### 10.5 Risks & mitigations (Path 2)
| Risk | Mitigation |
|---|---|
| ECC updates change behaviour (500+ files/release) | Record version; upgrade on purpose; re-check after |
| Install failures (unpublished npm version; Windows cache) | `/plugin` commands; cache fix (§4.2) |
| Hooks run third-party code on every action | Review `hooks/hooks.json` once; disable unwanted via `ECC_DISABLED_HOOKS`; project scope |
| +13.7k context per turn | Accept for feature work; short sessions (`/clear`, `/handoff`); plain Claude for small tickets |
| Real bugs left as MEDIUM | Team rule: fix behaviour findings regardless of label |
| Rule conflicts (80% coverage, 50-line limit) | Tailor committed rules |
| Per-laptop memory leaking between tasks | `/clear` between tasks; `ECC_SESSION_START_CONTEXT=off` |
| Grilling fatigue | Grill only unclear tickets |

### 10.6 Cost estimates (F2-sized feature, Pro 5-h window)
| Option | Usage | Basis |
|---|---|---|
| Plain Claude Code | ~2–3% | Measured |
| ECC build only | ~10–16% | Measured |
| Path 2, unclear ticket | ~15–20% | Estimate (MP planning share + ECC build) |
| MP full (Path 1) | ~17–24% | Measured (+ security review ~1–3%, est.) |
| Graphify navigation questions | ~1–2% each, all conditions | Measured; no saving |
Enterprise limits differ from Pro; **ratios** carry over.

---

## 11. Limitations
- **n = 1** per cell; one model (Opus 5.5, medium). Controlled case study, not a statistical benchmark; small token/time differences within normal variation.
- **Workflows:** one small test bed; F2 harder **and** less specified than F1 (effects not separable); answer sheet as product owner; **Path 1 and Path 2 never run as combinations**; ECC `security-reviewer`, built-in plan mode, ECC without GateGuard **not tested**; GateGuard not tested against deliberately bad prompts; F2-C2 open questions unanswered (protocol miss) and MEDIUM findings unfixed by protocol; human effort measured as questions/prompts, not minutes; code review not blind.
- **Graphify:** one repo, 3 questions; code-only mode (LLM extraction for docs/PDFs untested); default soft hooks (`--strict` untested, wouldn't fix missing edges); Windows only; G0 already perfect, so accuracy gains on harder questions can't be shown.

---

## 12. Appendix

### 12.1 Evidence index
| What | Where |
|---|---|
| Workflow run cards + raw rows | `runs/F1-C0 … F2-C2/runcard.md`, `results.csv` |
| Code of every workflow run | branches `run/<RUN-ID>` in `hezkiawan/claude-code-evaluation-demo` |
| Code analysis | `docs/code-analysis.md` |
| Tool profiles + overlap map | `docs/phase1-tool-profiles.md` |
| Run protocol | `docs/run-protocol.md` |
| Prompts, answer sheets, checkers | `prompts/`, `acceptance/` |
| Workflow recommendation (detailed) | `docs/recommendation.md` |
| Graphify questions + keys, protocol | `prompts/G-queries.md`, `docs/graphify-protocol.md` |
| Graphify runs + scoreboard | `runs/GQ*-G*/` (answer, stats, notes), `runs/G-scores.md` |
| Graphify findings (detailed) | `docs/graphify-findings.md` |
| Transcript counter | `tools/transcript-stats.mjs` (tool calls, tokens, skills, subagents, GateGuard denials, graphify commands, working time) |

### 12.2 Glossary
| Term | Meaning |
|---|---|
| Skill | Markdown playbook Claude loads when relevant |
| Agent / subagent | Separate Claude instance with its own prompt + context |
| Hook | Script Claude Code runs automatically on events; can block actions |
| Rule | Always-on guidance file in `.claude/rules/` |
| GateGuard | ECC hook that blocks the first edit of each file until facts are stated |
| Grilling | MP's one-question-at-a-time requirements interview |
| TDD | Test-driven development: failing test first, then code |
| Vertical slice | Ticket delivering a thin end-to-end piece of a feature |
| Knowledge graph | Graphify's map of code entities + relationships |
| Recall | Answer-key items correctly named ÷ total |
| Worktree | Separate checkout of the same git repo, one per run |
| Usage % | Share of Claude's 5-hour usage window consumed |
