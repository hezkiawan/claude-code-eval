# Evaluation & Recommendation: Matt Pocock Skills vs Everything Claude Code (ECC)

**For:** Helios development team · **Author:** Hezki (technical research intern) · **Date:** 2026-09-30
**Scope:** Q1 (which workflow) and Q2 (which ECC parts) of the Claude Code plugin evaluation. Graphify (Q3) is reported separately.
**Status:** final for Q1/Q2, based on 6 controlled runs + code review of all run branches. Controlled case study (n = 1 per cell; see §9).

---

## 0. Executive summary

**The question.** Should the team use Matt Pocock's skills (current Helios workflow), Everything Claude Code (ECC), parts of both, or neither?

**What we found.**
1. **All three setups (plain Claude Code, Matt Pocock, ECC) produced correct, tested code on both tasks**, including a hidden race condition. Neither plugin is needed *for correctness* on tickets of this size.
2. **Plain Claude Code was 5–10× cheaper and 3–6× faster**, but it guesses silently and leaves latent bugs; it has the weakest quality around the edges.
3. **ECC beat Matt Pocock on most measured metrics**: lower usage (26% vs 41% of a 5-hour Pro window across both tasks), faster (60 vs 81 min), fewer questions to the developer (4 vs 26), fewer permission prompts, more tests, visible TDD, and the most consistent input/security validation.
4. **Matt Pocock's unique strengths are thinking and knowledge:** it asks the product questions that matter, its Spec reviewer caught and fixed subtle bugs, it produced the most robust frontend state handling, and it leaves a spec, tickets and a glossary in the repo. It is also far simpler and safer to install.
5. **ECC's costs are operational:** a large always-on plugin (+13.7k context tokens every turn, 306 skills of which ~14% are relevant), automatic hooks (GateGuard blocked 34 actions with no visible benefit), rule-driven review severity, per-laptop memory, fragile installation and very fast churn.

**Recommendation.**
- **Default:** plain Claude Code (with a good `CLAUDE.md`) for small, clear tickets.
- **Recommended for feature work (pilot): Path 2, "Matt Pocock thinks, ECC builds".** Matt Pocock's planning skills (grill → spec → tickets, glossary) feed ECC's build workflow (plan → TDD → review). It combines each tool's proven strength.
- **Alternative: Path 1, "Matt Pocock with ECC security add-ons".** The current Helios workflow plus a few ECC reviewer files. Lower adoption risk, higher usage, weaker test depth.
- **Not recommended:** installing both full packages side by side (they compete), or the full ECC plugin without accepting its operational costs.

---

## 1. Question and scope

| ID | Question | Answered here? |
|---|---|---|
| Q1 | Which workflow gives the best quality for the cost and friction: Matt Pocock, ECC, or a combination? | **Yes** |
| Q2 | Which individual ECC components are worth adopting? | **Yes** (from normal runs; GateGuard not tested against deliberately bad prompts) |
| Q3 | Does Graphify pay off, and on what size of repo? | No, separate report |

Team context: Next.js + Go + PostgreSQL (Firestore for Kouventa chats); Claude Code Enterprise subscription (usage limits matter); currently piloting the Matt Pocock workflow (Helios doc v1.1.2).

---

## 2. Method

| Item | Detail |
|---|---|
| Test bed | `mini-kouventa`: Go (net/http) + Firestore backend, Next.js 14 / React / Tailwind frontend, Kouventa-style inbox with a design-system rules file. Every run started from the same clean commit (`eval-base-v2`) in its own git worktree |
| Setups | **C0** plain Claude Code · **C1** Matt Pocock skills (project scope; local-markdown issue tracker) · **C2** ECC 2.2.2 plugin (project scope, standard hooks, rules `common` + `golang` + `typescript` + `react`) |
| Workflows | Each setup followed **its own documented workflow**. C0: paste the prompt. C1: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` per ticket (`/clear` between). C2: `/ecc:plan` → `tdd-workflow` → `/ecc:code-review` → fix CRITICAL/HIGH (ECC README "Building a feature") |
| Tasks | **F1 Internal Room Notes**: routine, **fully specified** ticket (API + tabbed UI + validation). **F2 Room Claiming + SLA**: tricky, written as a **realistic, thinner product ticket**; hidden traps: two agents claiming at once (race condition), live SLA badge, nested-button HTML |
| Constants | Opus 5.5, medium effort, auto mode, frozen prompts, fixed "product owner" answer sheet, same machine, ECC memory cleared before ECC runs |
| Correctness | Automated API checkers: 14 checks (F1); 11 checks (F2), incl. **10 agents claiming the same room simultaneously × 5 rooms**. 7-point UI checklist per task (incl. a two-tab conflict test) |
| Other metrics | Usage % of the 5-hour limit, active time (transcript span), tool calls, questions asked, human replies, permission prompts, subagents, skills used, GateGuard blocks, tests written and passing, commits, context size at start, review findings |
| Code review | All six run branches were diffed and read after the runs (§3.5, `docs/code-analysis.md`) |

**Fairness measures:** same start commit, per-run worktrees, plugins at project scope only, global Claude config audited and cleaned, answer sheet for every question, no hints or fixes by the tester, checkers validated against correct and deliberately buggy mock servers before use.

**Protocol deviations (disclosed):** F2's prompt was rewritten to a realistic ticket (v2) before any F2 run; the F2 checker was made storage-agnostic before first use; in F2-C2, ECC's two "open questions with defaults" weren't answered from the answer sheet (one UI behaviour affected).

---

## 3. Results

### 3.1 Run metrics

| | F1 C0 | F1 C1 | F1 C2 | F2 C0 | F2 C1 | F2 C2 |
|---|---|---|---|---|---|---|
| API checker | **14/14** | **14/14** | **14/14** | **11/11** | **11/11** | **11/11** |
| Race test (10 agents × 5 rooms) | n/a | n/a | n/a | ✅ 1 winner each | ✅ | ✅ |
| UI checklist | 7/7 | 7/7 | 7/7 | 7/7 | 7/7 | 7/7 |
| **Usage (% of 5-h limit)** | **+3%** | **+24%** | **+16%** | **+2%** | **+17%** | **+10%** |
| Active time | 12.5 min | 47.1 min | 39.0 min | 6.1 min | 34.3 min | 20.9 min |
| Output tokens | 17k | 85k | 91k | 16k | 60k | 62k |
| Cache-read tokens | 1.0M | 8.2M | 9.7M | 1.0M | 5.7M | 4.9M |
| Tool calls | 22 | 111 | 78 | 15 | 90 | 64 |
| Questions to the developer | 0 | 16 | 2 | 0 | 10 | 2 |
| Developer replies | 0 | 2 | 2 | 0 | 2 | 0 |
| Permission prompts | 11 | 52 | 32 | 13 | 35 | 19 |
| Sessions | 1 | 4 | 1 | 1 | 3 | 1 |
| Reviewer subagents | 0 | 6 | 0 | 0 | 4 | 0 |
| GateGuard blocks | n/a | n/a | 16 | n/a | n/a | 18 |
| Frontend tests | 3 | 17 | 20 | 6 | 8 | 21 |
| Commits | 0 | 4 | 8 (TDD) | 0 | 2 | 5 (TDD) |
| Lines added (excl. lockfiles) | 479 | 1,477 | 1,339 | 420 | 920 | 756 |

**Totals across both tasks:**

| | Stock | Matt Pocock | ECC |
|---|---|---|---|
| Usage | **5%** | 41% | 26% |
| Active time | **18.6 min** | 81.4 min | 59.9 min |
| Questions / replies | 0 / 0 | 26 / 4 | 4 / 2 |
| Permission prompts | 24 | 87 | 51 |
| Frontend tests | 9 | 25 | **41** |

### 3.2 Cost before any work (context at session start)
| Stock | Matt Pocock | ECC |
|---|---|---|
| 34.6k tokens | 35.1k (**+0.5k**) | 48.3k (**+13.7k**; 306 skills listed, 24 hooks) |

The start-up context is re-sent (cached) on every turn, so ECC's overhead grows with session length. Despite this, **ECC runs were cheaper than Matt Pocock runs**, because MP's workflow uses several sessions and two Opus-level reviewer subagents per ticket.

### 3.3 Where the usage goes (Claude Code `/usage` insights, 24 h, all runs)
| Driver | Share |
|---|---|
| Subagent-heavy sessions | 51% |
| ECC plugin (all its skills/agents/hooks) | 26%, of which `/ecc:tdd-workflow` 21% |
| MP `/implement` | 18% |
| MP `code-review` subagents | 15% |
| Sessions > 150k context | 18% |

MP's cost scales with **ticket count** (F1: 3 tickets → +24%; F2: 2 tickets → +17%).

### 3.4 What each setup did differently (behaviour)
- **Planning.** Stock: none, just builds. MP: interviews (16 and 10 questions), then writes a spec (31 user stories in F2) and vertical-slice tickets; asks the developer to agree test seams. ECC: restates requirements, maps existing patterns with file:line references, lists risks (race condition = HIGH, nested button = MEDIUM), asks 2 questions or offers defaults, waits for approval.
- **Building.** Stock: direct, tests included unprompted. MP: `/implement` per ticket with `/tdd`; checked its own tests by deliberately breaking behaviours. ECC: strict TDD, failing-test commits before feature commits, evidence report; fixed a flaky test.
- **Reviewing.** MP: two reviewers per ticket (Standards + Spec), fixes findings itself. ECC: one review of the whole branch (correctly including committed work), severity by its rules, asks before fixing MEDIUM items.
- **Automation.** ECC's GateGuard blocked the first edit of files 16–18 times per run; Claude always resolved it itself. **ECC's "MUST BE USED / PROACTIVELY" agents never fired on their own** (0 subagents in both ECC runs).

### 3.5 Code analysis (all six branches; details in `docs/code-analysis.md`)

| Aspect | Stock | Matt Pocock | ECC |
|---|---|---|---|
| Correctness (checkers) | = | = | = |
| **Room-ID validation** (encoded `/` could address another Firestore path) | 1 of 2 runs | 1 of 2 (missed in F2; its reviewers didn't flag it) | **2 of 2**, most thorough |
| **Data consistency** (F2: `waitSeconds` vs `slaBreached`) | ✗ can store 300 s *and* "breached" | ✓ reviewer found and fixed exactly this | ✓ avoided by design |
| **Product rule** (badge only on unassigned rooms) | ✗ guessed | ✓ asked | ✗ used its default (protocol miss) |
| **Frontend state** (stale tab reload; two claims at once) | ✗ both bugs | **✓ neither** (request counter, per-room in-flight set) | ✗ both (found by review, rated MEDIUM, not fixed under our protocol) |
| **Test depth** (backend layers covered) | validation only | HTTP layer in F1; rules only in F2 (seam choice) | **HTTP layer both tasks + emulator-gated DB tests (F1)** |
| Extra artifacts | none | spec, tickets, `CONTEXT.md` glossary | TDD evidence report |

---

## 4. Analysis

### 4.1 Key findings
1. **Correctness is not the differentiator.** Modern Claude Code (Opus 5.5) handled a well-specified ticket and a hidden race condition without any plugin. The value of a workflow is in **quality around the edges, process and documentation**, not "making it work".
2. **Stock is the efficiency benchmark** (5% total usage) but **guesses silently** (product-rule miss) and leaves **latent bugs** (data inconsistency, two frontend state bugs, missing ID validation in F1).
3. **ECC is the stronger *builder*.** Cheaper and faster than MP, less developer time, strict TDD, most tests, most consistent input validation. Its always-loaded security rules and TDD edge-case habit are the likely cause.
4. **Matt Pocock is the stronger *thinker*.** It surfaces product decisions (the only setup that asked about, and got right, the badge rule; hid the chat composer on the Notes tab so notes can't be sent to customers), its Spec reviewer fixes subtle bugs, and it documents decisions in the repo. But on a fully specified ticket it still asked 16 questions, which is overhead.
5. **Each tool has a failure mode the other covers.** MP's seam discipline left F2's HTTP and database layer untested and missed an input check; ECC's rule-driven review left real UI bugs as MEDIUM and let style issues (50-line functions) become HIGH.
6. **ECC's automation layer didn't earn its keep in these runs.** GateGuard: 34 blocks, no observed prevented mistake. Proactive agents: never fired. The value came from the **workflow** (plan → TDD → review) and the **rules**, not the hooks or the catalog.
7. **Workflow shape drives cost more than plugin size.** ECC's +13.7k context per turn mattered less than MP's multiple sessions and per-ticket reviewer subagents.

### 4.2 Head to head: Matt Pocock vs ECC

| Dimension | Winner | Evidence |
|---|---|---|
| Correctness | Tie | 14/14 + 11/11 both |
| Usage / cost | **ECC** | 26% vs 41% total |
| Speed | **ECC** | 60 vs 81 min |
| Developer time and interruptions | **ECC** | 4 vs 26 questions; 51 vs 87 permission prompts |
| Test volume and TDD evidence | **ECC** | 41 vs 25 frontend tests; RED→GREEN commits |
| Input / security validation | **ECC** | ID validation 2/2 vs 1/2; security bug fixed |
| Requirement discovery | **MP** | Product questions that changed the outcome |
| Spec fidelity and subtle-bug fixing | **MP** | Trim mismatch, waitSeconds/breach mismatch fixed |
| Frontend state robustness | **MP** | No known bugs vs 2 (partly our protocol) |
| Shared knowledge in the repo | **MP** | Spec, tickets, glossary vs TDD report |
| Context overhead | **MP** | +0.5k vs +13.7k tokens |
| Adoption and maintenance risk | **MP** | Skills only vs plugin + hooks + churn |

### 4.3 Strengths and weaknesses

**Plain Claude Code**
- ✅ Correct on both tasks; 5–10× cheaper; minutes instead of tens of minutes; no setup; honest "decisions you may want to change" lists; wrote tests unprompted.
- ❌ Guesses product decisions; no plan, spec, review or commits; fewest tests; latent bugs found in code review.
- **Best for:** small, clear, low-risk tickets.

**Matt Pocock skills**
- ✅ Requirement discovery through grilling; spec and vertical-slice tickets; Spec + Standards review that fixes what it finds (incl. subtle bugs); robust frontend state; glossary and specs shared through git; tiny context overhead; simple installation (skills only).
- ❌ Most expensive (41% usage for 2 tasks) and slowest; most developer interaction (26 questions, 87 prompts); grills even when nothing is open; test seams can leave whole layers untested; missed an input-validation check; left spec and glossary uncommitted.
- **Best for:** unclear or product-heavy tickets; features larger than one session; teams that value shared documentation.

**Everything Claude Code**
- ✅ Efficient build workflow: plan with risks, strict TDD, most tests (incl. HTTP and DB layers), consistent input validation, security fix; little developer time; review covers committed work; honest open-issues lists.
- ❌ +13.7k context every turn; 306 skills listed, ~14% relevant; GateGuard friction (34 blocks, no visible benefit); proactive agents don't fire; review severity follows its style rules (50-line limit = HIGH, real UI bugs = MEDIUM); per-developer memory outside the repo; installation problems observed (README pins an unpublished npm version; broken plugin cache on Windows needed a clean reinstall); single maintainer; 500+ files changed per release.
- **Best for:** clear tickets where correctness, security and test depth matter.

### 4.4 Corrections made during the evaluation (for transparency)
- **Pilot finding not reproduced:** in the pilot, `/ecc:code-review` "reviewed nothing" after ECC committed. In ECC 2.2.2 it reviewed the committed branch correctly.
- **Security attribution corrected:** the `%2F` security fix came from ECC's TDD implementation with its rules loaded. ECC's dedicated `security-reviewer` agent **never ran** in any test.
- **Bias corrected:** an earlier draft kept Matt Pocock as the base because of the previous Helios recommendation, and argued against ECC's TDD with an unfair cost comparison. The data shows ECC's build workflow was cheaper overall.

---

## 5. Recommendation

### 5.1 Options considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Plain Claude Code only** | Cheapest, fastest, correct in tests, no setup | Guesses; latent bugs; no reviews or docs | **Default for small, clear tickets** |
| **B. Matt Pocock only** (current Helios doc) | Best thinking and docs; simple install; team already piloting | Most expensive and interactive; weaker test depth; missed validation | Acceptable, but not best-evidenced |
| **C. ECC only** (full plugin) | Best builder metrics | Operational costs; no requirement discovery; rule-driven review | Viable, but loses MP's strengths |
| **D. Path 1: MP + ECC security add-ons** | Low adoption risk; tidy ticket flow; adds security review | Highest usage; keeps MP's test-depth gap; ECC's strongest part (building) not used; security agent untested | **Alternative** |
| **E. Path 2: MP thinks, ECC builds** | Each tool's proven strength; less developer time and usage than MP; keeps spec, tickets, glossary | Needs the ECC plugin and its operational costs; combination untested | **Recommended pilot** |
| F. Both full packages side by side | none beyond D/E | Two planners, two TDD philosophies, two reviews; ECC hooks and rules affect MP sessions; highest context | **Not recommended** |

### 5.2 Default for every ticket: start plain
- Trivial or small and clear ticket → plain Claude Code with the team's `CLAUDE.md`. Optionally use Claude Code's built-in plan mode (Shift+Tab) first (not tested here).
- Escalate to a workflow only when the ticket is unclear, large, or risky.

### 5.3 Recommended: Path 2, "Matt Pocock thinks, ECC builds"

**Flows**

| Ticket | Flow |
|---|---|
| Clear feature | `/ecc:plan <feature>` → approve → "Implement it using the tdd-workflow skill" → `/ecc:code-review` → fix findings (see review rule) |
| Unclear feature | `/grill-with-docs <feature>` → `/to-spec` → `/ecc:plan Implement the spec in .scratch/<feature>/spec.md` → `tdd-workflow` → `/ecc:code-review` → fix |
| Larger than one session | …→ `/to-spec` → `/to-tickets` → per ticket: `/ecc:plan Implement ticket .scratch/<feature>/issues/<n>.md` → `tdd-workflow` → review → `/handoff` + `/clear` |
| Trivial | plain Claude Code |

**Review rule (from the evidence):** fix all CRITICAL/HIGH findings **and every MEDIUM finding that describes wrong behaviour**; treat pure style findings as optional.

**What to install**
- **Matt Pocock, thinking skills only** (`npx skills@latest add mattpocock/skills`, project scope; select): `grill-with-docs`, `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `handoff`, `setup-matt-pocock-skills` (+ optional `ask-matt`, `prototype`). **Not** `tdd`, `implement`, `code-review`: ECC covers those, so nothing clashes.
- **ECC plugin**, project scope: `/plugin marketplace add https://github.com/affaan-m/ECC` → `/plugin install ecc@ecc` (choose Project). Record the installed version (tested: 2.2.2) and upgrade deliberately.
- **ECC rules** (the plugin can't install them): copy `common`, `golang`, `typescript`, `react` from the installed plugin into `.claude/rules/ecc/` and commit them. **Tailor them:** edit `common/coding-style.md` (50-line function limit) and `common/testing.md` (80% coverage) to what the team actually wants. These rules drove both ECC's strictness and its style-first review severity.

**Configuration choices (untested options, decide in the pilot)**
- GateGuard: keep (as tested) or disable via `ECC_DISABLED_HOOKS` if the friction isn't worth it (34 blocks, no visible benefit in our runs).
- ECC session memory lives on each laptop (`~/.claude/session-data`, `~/.local/share/ecc-homunculus`). Keep, or turn off start-of-session injection with `ECC_SESSION_START_CONTEXT=off` for predictability. Shared knowledge stays in MP's spec, tickets and `CONTEXT.md`.

**Pros**
- Uses each tool for what it proved best at: MP for requirements and knowledge, ECC for building and testing.
- Expected usage and developer time between ECC-only and MP-only: grilling only when needed, a single build session, no per-ticket double reviewer.
- Keeps the tidy, ticket-based, documented flow the team liked in the Helios workflow.
- Strongest test depth and input validation observed.

**Cons and risks**
- **The combination was never run.** Handoff from an MP spec into `/ecc:plan` is designed for (ECC's plan accepts a requirements file) but untested.
- **Operational cost of the ECC plugin:** +13.7k context per turn, hooks running code on each action, per-laptop memory, fast release churn, single maintainer, installation problems seen on Windows.
- ECC's review needs the "fix behaviour bugs regardless of severity" rule, or real bugs can stay.
- Two sources of conventions (MP skills + ECC rules) the team must keep consistent.

### 5.4 Alternative: Path 1, "Matt Pocock with ECC security add-ons"

**Flow:** the current Helios workflow (grill → spec → tickets → `/implement` with `/tdd` + `/code-review`), plus a small-ticket fast path (skip `/to-tickets` when it fits one session), plus an explicit security review for risky changes: *"Use the security-reviewer agent to review this branch against main."*

**What to install:** Matt Pocock skills as in the Helios doc, plus copied ECC files (pinned v2.2.2): `agents/security-reviewer.md`, `agents/go-reviewer.md`, `agents/typescript-reviewer.md` (+ `react-reviewer.md`), `skills/security-review/`, `skills/context-budget/`. Optionally `rules/common/security.md` (the input-validation checklist). No ECC plugin, hooks or other rules.

**Pros:** lowest adoption risk (plain files, no hooks, no plugin); +0.5k context; continues the workflow the team already knows; ECC reviewer agents run on Sonnet (cheaper than MP's Opus-inherited reviewers).
**Cons:** the most expensive option in usage and developer interaction; keeps MP's test-depth gap; uses ECC's *least* proven component (the security agent never ran in our tests) and not its most proven one (the build workflow).

### 5.5 Decision guide for developers

```
                         Mistakes are cheap              Mistakes are costly
                      ┌───────────────────────────┬──────────────────────────────────────┐
  Ticket is clear     │  Plain Claude Code        │  ECC build: /ecc:plan → TDD → review │
                      ├───────────────────────────┼──────────────────────────────────────┤
  Ticket is unclear   │  MP grill → spec, then    │  MP grill → spec, then ECC build,    │
                      │  build (plain or ECC)     │  fix all behaviour findings          │
                      └───────────────────────────┴──────────────────────────────────────┘
  Bigger than one session → MP /to-tickets + /handoff, one ECC build per ticket
  Trivial → plain Claude Code
```

Rules of thumb:
1. **Start plain.** Most tickets don't need a workflow.
2. **Can't answer "what exactly should happen when…?"** → grill first.
3. **Touches input, IDs/paths, auth, secrets, money or concurrency?** → TDD + review, fix every behaviour finding.
4. **Won't fit in one session?** → slice into tickets.

---

## 6. Adoption plan

**Pilot (2 weeks, 1–2 developers)**
- Tickets: at least one clear/low-risk, one unclear/product-heavy, one security-sensitive, and one multi-session feature.
- Run Path 2 as recommended; optionally repeat one ticket with Path 1 for comparison.
- Record per ticket: usage %, time, questions and replies, permission prompts, review findings (and whether fixed), bugs found after merge, developer satisfaction (1–5: "was the process worth it?").

**Success criteria**
- No regression in correctness vs current practice.
- Usage within the team's Enterprise limits at normal ticket volume.
- Review catches at least one real issue per feature-sized ticket, and behaviour findings get fixed.
- Developers rate the process ≥ 4/5 for unclear or risky tickets (grilling fatigue is the main risk to watch).

**Changes to the Helios workflow doc (v1.1.2 → v1.2)**

| Section | Change |
|---|---|
| Core philosophy | "Match the workflow to the ticket. Plain Claude Code is the default." |
| New entry step | The decision guide (§5.5) before Phase 1 |
| Phase 1 (planning) | Grilling for unclear tickets; clear tickets go straight to `/ecc:plan` |
| Phase 3 (implementation) | Path 2: `/ecc:plan` on the spec/ticket → `tdd-workflow`; Path 1: unchanged `/implement` + fast path |
| Review | Fix all behaviour findings regardless of severity label; optional security review for risky changes |
| Token optimization (§10) | Measured overhead per setup; cost drivers (reviewer subagents, TDD skill, ticket count); avoid always-on plugins you don't use |
| Artifacts (§4) | Commit spec, tickets and `CONTEXT.md` with the code; commit tailored ECC rules; pin plugin versions |
| Installation (§2) | Path 2 install lists (§5.3), incl. project-scope plugin and rules copy |

---

## 7. Risks and mitigations (Path 2)

| Risk | Mitigation |
|---|---|
| ECC plugin updates change behaviour (500+ files per release) | Record the version; upgrade on purpose, not automatically; re-check after upgrades |
| Installation failures (unpublished npm version; Windows plugin cache) | Use the `/plugin` commands; on "not cached" errors: uninstall, delete `~/.claude/plugins/cache/ecc`, `git config --global core.longpaths true`, reinstall |
| Hooks execute third-party code on every action | Review `hooks/hooks.json` once; disable unwanted hooks via `ECC_DISABLED_HOOKS`; keep project scope |
| Context cost (+13.7k per turn) | Accept for feature work; keep sessions short (`/clear`, `/handoff`); plain Claude Code for small tickets |
| Real bugs left as MEDIUM | Team rule: fix behaviour findings regardless of label |
| Rule conflicts (ECC 80% coverage / 50-line limit vs team norms) | Tailor the copied rules; they're committed to the repo |
| Per-laptop memory leaking between tasks | `/clear` between tasks; optionally `ECC_SESSION_START_CONTEXT=off` |
| Grilling fatigue | Grill only unclear tickets |

---

## 8. What each option costs (estimates for an F2-sized feature, Pro 5-hour window)

| Option | Estimated usage | Basis |
|---|---|---|
| Plain Claude Code | ~2–3% | Measured |
| ECC build only (clear ticket) | ~10–16% | Measured |
| Path 2, unclear ticket (grill + spec + ECC build) | ~15–20% | Estimate: MP planning share + ECC build |
| Matt Pocock full (Path 1) | ~17–24% | Measured (+ security review ~1–3%, estimated) |

Enterprise limits differ from Pro; the **ratios** are what carry over.

---

## 9. Limitations
- **n = 1** per setup per task, one small repo, one model (Opus 5.5, medium). A controlled case study, not a statistical benchmark.
- F2 was both **harder and less specified** than F1; the effects can't be separated.
- The answer sheet acted as product owner; real developers may answer grilling differently.
- **Neither Path 1 nor Path 2 was run as a combination**; both are assembled from observed component behaviour.
- ECC's `security-reviewer` agent, Claude Code's built-in plan mode, and ECC with GateGuard disabled were **not tested**.
- GateGuard and ECC's guard hooks were only observed in normal runs, not against deliberately bad prompts (Q2 mini-test, optional).
- In F2-C2, ECC's open questions weren't answered (protocol miss), and ECC's MEDIUM findings weren't fixed because of our protocol; a real developer would likely have fixed them.
- Human effort was measured as questions, replies and permission prompts, not minutes of attention.
- The code analysis was not blind (setups were known to the reviewer).

## 10. Open items
- **Graphify (Q3)**: separate evaluation on a large repository.
- Optional **Q2 GateGuard mini-test** (3 bad prompts, stock vs ECC).
- Optional **Path 2 validation run** in this test bed (F2 with an unclear-ticket flow).

## 11. Evidence index
- Run cards: `runs/F1-C0`, `F1-C1`, `F1-C2`, `F2-C0`, `F2-C1`, `F2-C2` (`runcard.md`); raw rows: `results.csv`
- Code analysis: `docs/code-analysis.md`; setup overhead: `docs/phase1-overhead.md`
- Tool profiles and overlap map: `docs/phase1-tool-profiles.md`; protocol: `docs/run-protocol.md`
- Prompts and answer sheets: `prompts/`; checkers: `acceptance/`; transcript counter: `tools/transcript-stats.mjs`
- Code of every run: branches `run/<RUN-ID>` in `hezkiawan/claude-code-evaluation-demo`
