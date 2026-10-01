# Phase 1, Step 1: Tool Profiles and Overlap Map

> Part of the Claude Code plugin evaluation (see `day0-summary.md`).
> Covers: what each tool is, how it works, install methods, maintainer and release cadence, cost and risk notes,
> and the **ECC ↔ Matt Pocock overlap map**.
> Sources: ECC source code v2.2.2 (downloaded 2026-09-29), ECC README, Matt Pocock skills repo (cloned 2026-09-29, v1.2.3),
> Graphify README, Helios workflow doc v1.1.2.
> Numbers marked **(static)** come from reading the code. They are estimates to be confirmed by measurement in Step 2.

---

## 0. The three tools in one picture

They are not three versions of the same thing. They sit at different layers:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PROCESS: "in what order do we work?"                                     │
│   Matt Pocock skills ........ grill → spec → tickets → TDD → review      │
│   ECC (part of it) .......... plan → tdd-workflow → code-review          │
├──────────────────────────────────────────────────────────────────────────┤
│ GUARDRAILS + AUTOMATION: "what happens automatically on every action?"   │
│   ECC hooks ................. GateGuard, config protection, format/      │
│                               typecheck on stop, session memory, ...     │
│   Matt Pocock ............... (none by default; 2 optional setup skills) │
├──────────────────────────────────────────────────────────────────────────┤
│ KNOWLEDGE: "what does the agent know?"                                   │
│   ECC ....................... 292 skills, 68 agents, rule packs          │
│                               (Go, React, Postgres, security, ...)       │
│   Graphify .................. a map (graph) of *this* codebase           │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Matt Pocock (MP)** is a small, opinionated *process*.
- **ECC** is a large *toolbox* that includes its own process, an automation layer (hooks) and a knowledge catalog. It overlaps with MP on process, and adds layers MP doesn't have.
- **Graphify** is a *retrieval index* for one codebase. It doesn't compete with either; it could sit under both.

This is why the evaluation question is "which layers do we want, and from which tool?" rather than "which tool wins?".

---

## 1. Matt Pocock skills (baseline, current Helios workflow)

| Item | Detail |
|---|---|
| What it is | ~24 engineering and productivity skills forming one workflow: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` (+`/tdd`) → `/code-review` |
| Repo / maintainer | github.com/mattpocock/skills, Matt Pocock (single maintainer; AI Hero), MIT |
| Version / cadence | v1.2.3 (last commit 2026-09-18). 6 releases (1.0.0 → 1.2.3); about 15 commits in the last month |
| Mechanisms | **Skills only.** No hooks, no agents, no always-loaded rules. Two optional *misc* skills can *set up* hooks on request (`git-guardrails-claude-code`, `setup-pre-commit`). |
| Persistent state | In the **repo**: `CONTEXT.md` (glossary), `docs/adr/`, `docs/agents/issue-tracker.md`; work items in the **issue tracker** (GitHub Issues in the Helios setup) |
| Install | (a) `npx skills@latest add mattpocock/skills` (editable copies, project or global); (b) Claude Code plugin `mattpocock-skills` (managed, read-only bundle). "Pick one: installing both leaves you with every skill twice." Then run `/setup-matt-pocock-skills` once per repo. |
| Context cost (static) | Skill descriptions about **1k tokens** (engineering + productivity). Skill bodies load only when used. |
| Philosophy | Human-in-the-loop, issue-centric, small sessions (`/clear` + `/handoff`), tests only at **pre-agreed public seams**, vertical slices |

---

## 2. Everything Claude Code (ECC), the main subject

### 2.1 Identity

| Item | Detail |
|---|---|
| What it claims | "Harness-native agent operating system": skills, agents, hooks, rules and MCP conventions for Claude Code, Codex, Cursor, OpenCode, Gemini, Kimi and more |
| Repo | github.com/affaan-m/ECC (the task brief's `affaan-m/ecc` redirects here). npm: `ecc-universal`. Claude plugin id: `ecc@ecc` |
| Maintainer | **Affaan Mustafa, single maintainer** (README: "a single maintainer ships weekly across 7 harnesses"). MIT license. |
| Business model | OSS is free; **ECC Pro** is a hosted GitHub App for private repos ($19/seat/month); sponsors include CodeRabbit, Greptile, Moonshot/Kimi and others |
| Version | **2.2.2 (2026-09-15)** |
| Release cadence | 1.8.0 (Mar 4) → 1.9.0 (Mar 20) → 1.10.0 (Apr 5) → 2.0.0-rc.1 (Apr 28) → 2.0.0 (Jun 9) → 2.2.0 (Aug 25) → 2.2.2 (Sep 15). Roughly a release every 2–6 weeks, plus continuous commits to `main`. 2.2.0 alone changed **530 files in 108 commits** since 2.1.0. |
| Scope of catalog | **68 agents, 292 skills, 94 commands** (legacy shims), 23 hook registrations (~40 individual hook behaviours via dispatchers), rule packs for 21 languages or frameworks |

### 2.2 How it works: five mechanisms

| Mechanism | What it is | When it costs context | How it's triggered |
|---|---|---|---|
| **Skills** (292) | Markdown playbooks, e.g. `tdd-workflow`, `security-review`, `golang-testing` | Name + description of *every* installed skill is listed to the model; body loads only when used (average body ≈ 9k chars) | Model decides from the description, or you invoke it |
| **Agents** (68) | Sub-agents with their own prompt, e.g. `planner`, `code-reviewer`, `go-reviewer`, `security-reviewer` | Descriptions listed; each run is a separate context (costs usage when used) | Delegated by commands, skills or the model |
| **Commands** (94) | Slash entry points: `/ecc:plan`, `/ecc:code-review`, `/ecc:security-scan`, `/ecc:save-session` … | Listed like skills | You type them |
| **Hooks** (23 registrations) | Node.js scripts that Claude Code runs **automatically** on events (before/after every tool call, at stop, at session start) | Some inject text into context (SessionStart memory, GateGuard demands, warnings) | Automatic, can block actions |
| **Rules** | Always-on guidance files (`rules/common` + language packs) | `common` is always loaded (~18k chars ≈ **4.6k tokens**, static). Language packs are **path-scoped** (load only when matching files are touched) | Automatic |

Two things that are easy to miss:
- **The plugin does not install rules.** Claude Code plugins can't ship rules, so they must be copied by hand into `~/.claude/rules/ecc/` or `.claude/rules/ecc/`.
- **The plugin installs the entire catalog.** Selective installs (`--skills`, `--profile minimal`) only exist on the manual/npx installer path, not the `/plugin install` path.

### 2.3 Hook inventory (what runs automatically)

Profiles: `minimal` / `standard` (default) / `strict`, set during setup or with `ECC_HOOK_PROFILE`. Individual hooks can be disabled with `ECC_DISABLED_HOOKS`.

| When | Hook | What it does | Profile | Can block? |
|---|---|---|---|---|
| Before **Edit/Write** | **GateGuard fact-force** | Blocks the *first* edit to each file and demands facts (importers, affected API, data schemas, quote of the instruction) before allowing it | standard | **Yes**. This is the "repeated write denials" seen in the pilot |
| Before **Bash** (destructive) | GateGuard (bash) | Demands target list + rollback plan for destructive commands; routine commands: quote the instruction once per session | standard | Yes |
| Before Bash | block-no-verify | Blocks `git commit --no-verify` and similar | standard | Yes |
| Before Bash | commit-quality, git-push-reminder, tmux reminders | Commit message and quality checks, reminders | standard | Some |
| Before Edit/Write | **config-protection** | Blocks edits to linter/formatter configs ("fix the code, not the config") | standard | Yes |
| Before Write | doc-file-warning | Warns about non-standard doc files | standard | No |
| Before Edit/Write | suggest-compact | Suggests compaction at intervals | standard | No |
| Before any tool | observe (continuous learning) | Records tool use observations for "instinct" learning | standard | No (async) |
| Before any tool | mcp-health-check | Blocks calls to unhealthy MCP servers | standard | Yes |
| After Edit/Write | design-quality-check, quality-gate, console-log warn, edit accumulator | Post-edit checks and warnings | standard | No |
| After any tool | context monitor, metrics bridge, activity tracker, learning observe | Telemetry into local files | standard/minimal | No |
| **Stop** (end of each reply) | **format + typecheck** | Runs Prettier/Biome + `tsc` on edited JS/TS files (timeout up to 300 s) | standard | Reports issues |
| Stop | console.log check, session-end save, evaluate-session, cost-tracker, desktop-notify | Housekeeping, memory persistence | mixed | No |
| **SessionStart** | **session-start bootstrap** | **Injects the previous session summary, learned "instincts" and learned skills into context** (capped at 8k chars by default) | all | No |
| PreCompact | pre-compact | Saves state before compaction | standard | No |

### 2.4 State ECC writes *outside* the repo (important)

| Location | What |
|---|---|
| `~/.claude/session-data/` | Session summaries (`/save-session`, stop hook), **re-injected at the next SessionStart** |
| `~/.claude/skills/learned/` | Skills "learned" from past sessions |
| `~/.local/share/ecc-homunculus/` | Continuous-learning observations and instincts, per project |
| `~/.gateguard/` | GateGuard per-session state |

> **For the experiment:** ECC *remembers across sessions*. Run 2 of an ECC chef could receive memories from run 1, which is contamination.
> **Fix for Step 2:** clear these four folders before every ECC run, so each run starts as a first-time install.
> **For the team:** the memory is per-developer and lives on the laptop, not in the repo. That's different from MP, whose memory (`CONTEXT.md`, ADRs, issues) is shared through git.

### 2.5 How much of ECC is relevant to Helios (Go + Next.js/React/TS + Postgres/Firestore)

Hand-picked from the 292 skills and 68 agents. About **40 items (~14% of the catalog)** are directly relevant:

| Area | ECC components |
|---|---|
| Go | skills `golang-patterns`, `golang-testing`; agents `go-reviewer`, `go-build-resolver`; commands `/go-review`, `/go-build`, `/go-test`; rules `golang` |
| Next.js / React / TS | skills `react-patterns`, `react-testing`, `react-performance`, `nextjs-turbopack`, `frontend-patterns`, `frontend-a11y`, `accessibility`, `design-system`; agents `react-reviewer`, `typescript-reviewer`, `react-build-resolver`, `a11y-architect`; rules `typescript`, `react`, `web` |
| Backend / API / DB | skills `api-design`, `backend-patterns`, `error-handling`, `postgres-patterns`, `database-migrations`; agent `database-reviewer` |
| Testing | skills `tdd-workflow`, `e2e-testing`, `verification-loop`, `browser-qa`; agents `tdd-guide`, `e2e-runner`, `pr-test-analyzer` |
| Security | skills `security-review`, `security-scan` (AgentShield), `safety-guard`, `gateguard`; agent `security-reviewer`; hooks config-protection, block-no-verify |
| Workflow / context | `/ecc:plan`, `/ecc:code-review`, `/save-session`, `/resume-session`, `context-budget`, `strategic-compact`, `architecture-decision-records`, `codebase-onboarding`, `git-workflow` |

The rest covers other stacks (Django, Laravel, Spring, Swift, Kotlin, Rust, C++, Flutter …) and non-coding domains (marketing, investor outreach, homelab networking, prediction markets, logistics, video, healthcare …).

**Context cost of the full catalog (static):** skill names + descriptions alone total about **94k chars ≈ 23.5k tokens** if every entry were listed. Claude Code caps how much of the skill list it shows, which is likely why the pilot measured only about **+6k tokens** at session start (with "399 skills listed"). Step 2 will measure this properly with `/context`.

### 2.6 Install methods (Claude Code)

| Method | Command | Scope | What you get | Notes |
|---|---|---|---|---|
| **Guided setup** (recommended by ECC) | `npx ecc-universal@2.2.2 setup` | user / **project** / local | Full `ecc@ecc` plugin + chosen hook profile | Pinned to a release. Non-interactive: `--claude-scope project --claude-hooks standard` |
| Native plugin commands | `/plugin marketplace add https://github.com/affaan-m/ECC` → `/plugin install ecc@ecc` | chosen in `/plugin` UI | Full plugin | Marketplace points at the repo, so you get **whatever is on `main` at install time** (not pinned) |
| Low-context / no hooks | `npx ecc-universal@2.2.2 install --profile minimal --target claude` | user | Rules, agents, commands, quality workflows, **no hooks** | Manual install path |
| Selective | `./install.sh --target claude --skills tdd-workflow,security-review` or `consult "<topic>"` | user, or `claude-project` target | Only chosen skills or capabilities | Best fit for "cherry-pick" (C3) |
| Manual copy | copy `agents/*.md`, `skills/<name>/`, `rules/<lang>/` into `.claude/…` | project or user | Exactly what you copy | Hooks must **not** be copied by hand (paths need rewriting by the installer) |
| Rules (any method) | copy `rules/common` + a language pack into `.claude/rules/ecc/` | project or user | Always-on guidance | Required separately even with the plugin |

Profiles for the installer path: `minimal` (no hooks), `core`, `developer`, `security`, `research`, `full`.
**Don't stack methods** (plugin + full manual install duplicates everything). Uninstall: `/plugin uninstall ecc@ecc` and `npx ecc-universal@2.2.2 uninstall`.

### 2.7 Risk and adoption notes (for the "Risk" dimension)

1. **Executable code on every tool call.** Standard profile runs Node hook scripts before and after nearly every action. That's powerful, but it's third-party code with the same permissions as the developer.
2. **Unpinned updates.** The native `/plugin` path installs from `main`. Very high churn (500+ files per minor release) means behaviour can change between installs. Pin with `ecc-universal@<version>` in team docs.
3. **Unpinned `npx` inside commands**, e.g. `/security-scan` runs `npx ecc-agentshield` without a version. ECC's own reviewer flagged this in the pilot.
4. **Single maintainer, with a commercial upsell.** Bus-factor and roadmap risk (same bus factor as MP, but a much larger surface).
5. **Global, per-developer memory** (§2.4): not shared via git, and it may contain code snippets or session content.
6. **Known gotcha:** `/ecc:code-review` (local mode) reviews **only uncommitted changes** (`git diff HEAD`). After ECC's TDD flow commits, the review sees nothing. This is what happened in the pilot. MP's `/code-review` reviews against a fixed point (branch, merge-base), so it works on committed work.
7. **Two different `/security-*` things:** `/security-scan` (AgentShield) scans *agent configuration* (hooks, permissions, MCP, secrets in `.claude/`). The `security-review` skill and `security-reviewer` agent review *application code*. Don't confuse them in the recommendation.

---

## 3. Graphify (brief; evaluated separately for Q3)

| Item | Detail |
|---|---|
| What it is | Builds a **knowledge graph** of a project (`graphify-out/graph.json`, `graph.html`, `GRAPH_REPORT.md`) that the agent can query (`graphify query`, `path`, `explain`) instead of grepping and reading files |
| How | **Code:** tree-sitter AST, local, deterministic, no LLM, free. **Docs/PDFs/images/video:** semantic pass using the assistant's model (costs usage; this was the pilot's 235k-token build). Edges are tagged `EXTRACTED` or `INFERRED`. |
| Claude Code integration | Skill + `CLAUDE.md` section + **PreToolUse hook** that *nudges* the agent toward `graphify query` before search/read. `--strict` blocks the first raw source read per session. Optional MCP server (`graphifyy[mcp]`). |
| Keeping it fresh | `graphify hook install` → rebuild on commit/checkout (AST only, free); run `graphify update .` after `git pull`. `graphify-out/` is meant to be committed. |
| Install | `uv tool install graphifyy` (or pipx) → `graphify install` (user) or `graphify install --project` (repo) |
| Maintainer | Graphify-Labs; commercial hosted version (graphify.com) in early access |
| Evidence caveat | README benchmarks (LOCOMO, LongMemEval) are **conversational-memory** benchmarks, not "fewer tokens when coding in a repo". The token-saving claim is exactly what Q3 must test, on a large repo. |
| Pilot notes | Misses JSX render edges; indexed its own config; on the small repo the agent read files anyway; the Graphify git hook leaked into a "stock" run |

---

## 4. Overlap map: ECC ↔ Matt Pocock, by Helios lifecycle phase

Legend: 🟰 **Overlap** (both do it) · ⚔️ **Conflict** (both do it *differently*, stacking would confuse the agent) · ➕ **Gap filler** (ECC adds something MP lacks) · 🅼 **MP-only**

| Lifecycle phase (Helios doc) | Matt Pocock | ECC equivalent | Relationship | Notes |
|---|---|---|---|---|
| 0. Setup and intake | `/setup-matt-pocock-skills`, `/triage` | guided setup; `epic-*` commands (GitHub epic sync); `/jira` | 🅼 mostly | ECC has no triage state machine; its epic commands are a different, heavier model |
| 1. Planning (standard) | `/grill-with-docs` (interview, writes `CONTEXT.md` + ADRs) | `/ecc:plan` (restate → risks → phased plan → wait for confirm), `planner` agent | 🟰 | Different style: MP *interviews you*; ECC *proposes a plan* and asks for approval. MP persists knowledge in the repo, ECC in a plan file. |
| 1. Planning (foggy/large) | `/wayfinder` (decision tickets on the tracker) | `blueprint`, `plan-prd`, `prp-plan`, `plan-canvas` | 🟰 | ECC's are plan documents, not tracker-driven |
| 1. Exploration | `/prototype` | *(none equivalent)* | 🅼 | |
| 2. Spec and tickets | `/to-spec`, `/to-tickets` (issue tracker) | `plan-prd`, `epic-decompose` | 🟰 | MP is issue-tracker-centric (fits the Helios doc's "No code without an issue") |
| 3. Implementation | `/implement #id` | `orch-add-feature`, `feature-dev`, direct prompting after `/ecc:plan` | 🟰 | |
| 3. TDD | `/tdd`: test **only at pre-agreed public seams**, vertical slices, no internal mocking | `tdd-workflow` + `tdd-guide` agent: **80%+ coverage across unit, integration and E2E**; `rules/common/testing.md` requires the same | ⚔️ **Conflict** | Opposite testing philosophies. Both skills trigger on "build a feature test-first", so with both installed the agent may pick either. Choose one. |
| 4. Review | `/code-review`: two parallel axes (Standards + Spec vs ticket), against a fixed point (branch/merge-base) | `/ecc:code-review` (uncommitted changes or a PR), `code-reviewer` agent | ⚔️ / 🟰 | Same name, different scope. ECC's local mode misses committed work (§2.7). MP checks against the spec; ECC checks security and quality. |
| 4. Stack-specific review | *(none)* | `go-reviewer`, `react-reviewer`, `typescript-reviewer`, `database-reviewer` agents | ➕ | Candidate add-on: deep Go and React review knowledge MP doesn't have |
| Bugs | `/diagnosing-bugs` (hypothesis → failing regression test) | `tdd-workflow` bug mode, `/build-fix`, `build-error-resolver`, `go-build-resolver` | 🟰 / ➕ | ECC's build-fixers are narrower (compile/build errors) and could complement |
| Merge conflicts | `/resolving-merge-conflicts` | *(none)* | 🅼 | |
| Architecture | `/improve-codebase-architecture`, `codebase-design`, ADRs via `domain-modeling` | `architect`, `code-architect` agents; `architecture-decision-records`; `/refactor-clean` | 🟰 | Both write ADRs to `docs/adr/`, so running both could create two ADR styles |
| Context / session hygiene | `/clear` + `/handoff` (file in repo, shared) | `/save-session` + `/resume-session` (global `~/.claude/session-data`), SessionStart auto-injection, `strategic-compact`, `context-budget` | 🟰 / ➕ | `context-budget` (audits what's eating context) is a genuine gap filler. Auto-memory is a different philosophy (automatic vs explicit). |
| Learning over time | *(none; knowledge goes to `CONTEXT.md`/ADRs)* | continuous learning, instincts, `/learn`, `/evolve` | ➕ (risky) | Per-developer, global, automatic. Hard to review; not shared with the team. |
| Git safety | optional `git-guardrails-claude-code` (sets up blocking hooks) | hooks: block-no-verify, git-push-reminder, GateGuard (bash), `safety-guard` skill | 🟰 / ➕ | ECC's are on by default; MP's is opt-in |
| Code quality automation | optional `setup-pre-commit` (Husky) | Stop hook: format + `tsc`; config-protection; console.log checks; quality-gate | ➕ | Runs automatically inside the agent loop |
| "Think before editing" guard | *(none)* | **GateGuard** fact-forcing | ➕ (high friction) | Main Q2 test candidate: does it prevent real mistakes, or just add denials? |
| App security review | *(none)* | `security-review` skill, `security-reviewer` agent | ➕ | Also relevant to the separate security-audit task |
| Agent config security | *(none)* | `/security-scan` (AgentShield) | ➕ | Audits `.claude/`, hooks, MCP, secrets |
| Stack knowledge | *(none; relies on the model + `CLAUDE.md`)* | `golang-*`, `react-*`, `postgres-patterns`, `api-design` skills; `golang`/`typescript`/`react`/`web` rules | ➕ | Value unproven: modern models already know Go and React well; the rules also cost context |

### 4.1 What the map tells us (preliminary, to be confirmed by Phase 2 and 4 runs)

- **The process layers overlap heavily.** Planning, spec, implementation and review exist in both. Running both processes at once gives the agent two competing playbooks.
- **There is one real conflict: TDD philosophy.** MP tests at agreed seams; ECC demands 80% coverage across all test types. A combined setup must pick one.
- **ECC's unique value is in the layers MP doesn't cover:** automatic guardrails (hooks), stack-specific reviewers, security review, and context auditing.
- So the most plausible **C3** is: *keep the MP process, and add a small set of ECC gap-fillers*. Candidates:

| Candidate for C3 | Why | Risk |
|---|---|---|
| `go-reviewer` + `typescript-reviewer`/`react-reviewer` agents | Deep stack review MP lacks | Overlaps MP `/code-review`; use as an extra reviewer |
| `security-review` skill (+ `security-reviewer` agent) | App security MP lacks; F2 has a real concurrency and security angle | Extra usage per review |
| config-protection + block-no-verify hooks | Cheap, rarely triggered, prevent "weaken the linter" and "skip hooks" shortcuts | Hooks require the installer path |
| `context-budget` skill | Measures context bloat, cheap | Low impact on code quality |
| GateGuard (maybe) | Could force investigation before edits | High friction in the pilot; decided by the Q2 test |

  Explicitly **not** for C3: `tdd-workflow` (conflicts with MP `/tdd`), `/ecc:plan` (duplicates grilling + spec), `/ecc:code-review` (duplicates MP's, with a scope gotcha), `/save-session` + continuous learning (duplicates `/handoff`; global memory).
  The final C3 is decided in **Step 3**, after Step 2 measures what each piece costs in context.

---

## 5. Consequences for Step 2 (installing the chefs)

| Chef | Install plan (project scope only) | Hygiene |
|---|---|---|
| **C0** | Nothing | Verify `/plugin`, `/mcp`, `/hooks` are empty |
| **C1 MP** | `npx skills@latest add mattpocock/skills` → **project** scope, Claude Code, all engineering + productivity skills → `/setup-matt-pocock-skills` | **Open decision:** issue tracker. GitHub Issues (as the Helios doc says) means runs create issues on the mini-kouventa repo, **and later runs could see earlier runs' issues**, which is contamination. MP's setup supports a **local-markdown tracker** out of the box (issues as files under `.scratch/<feature>/` in the repo). Each run folder then has its own issues, so runs stay isolated. Recommended for the experiment; document it as a deviation from the Helios setup. |
| **C2 ECC** | `npx ecc-universal@2.2.2 setup` → **project** scope, **standard** hooks; copy `rules/common` + `rules/golang` + `rules/typescript` + `rules/react` into `.claude/rules/ecc/` of the run folder | **Before every ECC run, clear** `~/.claude/session-data`, `~/.claude/skills/learned`, `~/.local/share/ecc-homunculus`, `~/.gateguard` |
| **C3** | MP as C1 + the ECC picks via the selective installer / manual copy | As C1 and C2 |

Measurements in Step 2, per chef: `/context` at session start (total, skills, rules, hooks), list of what's installed, and a note of anything written outside the run folder.

---

## 6. Presentation hooks from this step

- **"Three layers" diagram** (§0): explains in one slide why these tools aren't directly comparable.
- **"ECC in numbers"**: 68 agents / 292 skills / 94 commands / 23 hooks, and **~14% relevant to our stack**.
- **"What runs automatically"**: a short version of the hook table (§2.3). Teams are usually surprised by this.
- **"Where ECC keeps memory"** (§2.4): on your laptop, not in the repo. A good discussion point.
- **Overlap map** (§4): colour-coded, the bridge to the recommendation.
