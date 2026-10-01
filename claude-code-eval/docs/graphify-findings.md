# Graphify evaluation (Q3): findings

**Question (Q3):** Does Graphify pay off for Claude Code, and on what repo size?
**Short answer:** **Not on repos the size of ours, and not for a Go backend today.** On a real Go + TypeScript repo about 10–20× the size of mini-kouventa, Graphify did not make Claude more accurate, did not reliably make it cheaper, and its call graph misses most calls to Go methods, so "who calls this?" answers from the graph alone would be wrong. **Recommendation: don't adopt now; re-test only if a trigger below appears.**

Tool: Graphify 0.9.67 (`pip/uv graphifyy`), code-only mode (tree-sitter, no LLM). Claude Code v2.1.285, Opus 5.5, medium effort, auto mode, Pro plan. Date: 2026-10-01. Raw data: `runs/GQ*-G*/` and `runs/G-scores.md`.

---

## 1. What Graphify is (in one paragraph)
Graphify parses a codebase into a "knowledge graph" (functions, classes, files and the calls/imports between them) saved in `graphify-out/`. `graphify claude install` adds a `## graphify` section to `CLAUDE.md` telling Claude to run `graphify query` / `explain` / `path` before searching files, plus two PreToolUse hooks that nudge Claude toward the graph whenever it is about to search or read. The pitch: Claude reads a small, relevant subgraph instead of grepping and opening many files, saving tokens and improving navigation on big repos.

## 2. How we tested it
- **Repo:** `usememos/memos` pinned at commit `a80576a`: Go backend (~100k hand-written lines), React/TypeScript frontend, PostgreSQL/MySQL/SQLite drivers, 1,258 code files. Chosen because it is open source, realistic, and close to the Helios stack; mini-kouventa is too small for a map to matter.
- **3 read-only questions**, each the "navigation" moment of real feature work, with answer keys verified against the source (`prompts/G-queries.md`):
  - GQ1 **trace a flow** (create memo: UI → API → handler → store → DB), 8 key items
  - GQ2 **find a rule** (who may read a memo; single fetch + listing), 6 key items
  - GQ3 **blast radius** (what is affected by changing `Store.ApplyMemoMutation`), 9 key items
- **3 conditions**, each question in a fresh session, no human help (0 interventions in all 9 runs):
  - **G0:** plain Claude Code, clean clone
  - **G1:** Graphify installed exactly as its docs recommend (graph + `CLAUDE.md` + hooks)
  - **G2:** G1 + one sentence forcing Claude to use `graphify explain/path/affected` as its main source (Graphify's best case)
- **Measured:** recall vs key, wrong claims (extras spot-checked against the source), output tokens, tool calls, Claude working time, usage %, graphify commands used.

Why questions and not a feature build: Graphify only affects the "finding your way" part of feature work. Questions isolate that part; a full build would bury it under coding noise and cost 5–40% usage per run.

## 3. Results

| Condition | Recall | Wrong claims | Output tokens | Tool calls | Working time | Usage |
|---|---|---|---|---|---|---|
| **G0 plain** | **23/23** | 0 | 16,967 | 38 | ~5.6 min | ~4% |
| **G1 Graphify default** | **23/23** | 0 | 15,589 (−8%) | 26 | ~4.1 min | ~6% |
| **G2 Graphify forced** | **23/23** | 0 | 17,036 (±0%) | 38 | ~7.8 min | ~3% |

Per question (output tokens; G0 / G1 / G2): GQ1 7,845 / 6,607 / 6,451 · GQ2 5,399 / 4,647 / 4,492 · GQ3 3,723 / 4,335 / 6,093.
Usage % moves in 1% steps and one G1 run straddled a usage-window reset, so treat usage as "small in all conditions".

**What happened in each Graphify run:**
| Run | Graph use | Outcome |
|---|---|---|
| GQ1-G1 | `query` ×1 | "Graph is noisy here; I'll go to source directly." Query returned mostly test files. Answer came from reading source. |
| GQ2-G1 | `query` ×1 | Query matched 2,097 nodes: "too broad; narrowing with grep". Answer from search + reading. |
| GQ3-G1 | `explain` ×2 (right command, right node) | Graph showed only what the function calls, **not its callers**. Claude noticed and grepped. |
| GQ1-G2 | `explain` ×8, `query` ×1 | Graph named the nodes, but "no edge across the interface dispatch" (handler → store → driver) and "almost no call edges on the TS side". Filled by reading. |
| GQ2-G2 | `explain` ×7, `query` ×1 | Best showing: "from the helpers onward, the graph's call edges matched the source", but it missed GetMemo/ListMemos → their access helpers, and `path` found no link to the SQL predicate. |
| GQ3-G2 | `explain` ×3, `affected` ×3 | `affected` returned **no callers** (real answer: 3 direct, 6 indirect). Same correct answer via grep, at **+64% output tokens and ~3× the time** of G0. |

**Reading the numbers honestly:**
- Accuracy: identical (perfect) everywhere. Plain Claude already answers these in under ~4 minutes each, so there was no accuracy headroom for Graphify to win.
- Cost: G1's small saving comes from runs where Claude **ignored** the graph, so it is run-to-run variation, not a Graphify effect. When Claude actually relied on the graph (G2), it cost the same or more and took longer.
- Safety: Claude never trusted the graph blindly; it always noticed the gaps and verified. A developer reading `graphify affected` output directly would not get that safety net: for GQ3 the graph says **nothing is affected**.

## 4. Why the graph has gaps (measured)
Counted directly on the memos `graph.json`:
- Go **methods** (functions with a receiver, e.g. `func (s *APIV1Service) checkMemoReadAccess`) have on average **0.21 incoming call edges**; plain Go **functions** have **1.83**. Calls written as `s.method(...)` or `s.Store.Method(...)` are mostly not linked.
- Example: `checkMemoReadAccess` has **10** production call sites; the graph shows **0** callers. `Store.ApplyMemoMutation` has 3; the graph shows 0, and `graphify path CreateMemo → ApplyMemoMutation` finds no path.
- memos has 3,924 Go methods vs 2,468 plain functions. Service-style Go backends (handlers and stores as methods on structs), which is also how the Helios backend is written, put most business logic exactly where the graph is blind.
- Natural-language `graphify query` is a keyword-seeded graph walk; for broad questions it returns hundreds to thousands of nodes, many from tests.
- Where it works: `graphify explain <exact function>` on a plain function (e.g. `CheckMemoReadContext`) gives an excellent one-call summary of its definition and callers with line numbers. You need to already know the name.

## 5. Cost of running it
| Item | Measured (user laptop, Windows) |
|---|---|
| Install | `uv tool install graphifyy` + `graphify claude install`; no issues. 4 `.sql` files skipped until an extra (`graphifyy[sql]`) is installed. |
| First build (code-only) | **98 s**, 1,258 files → 13,142 nodes / 56,194 edges, **47 MB** output (`graph.json` ~26 MB). No LLM, no usage. |
| Update after a **one-line** change | **75 s**; it re-parsed 716 of 1,258 files, not just the changed one, and re-numbered communities (322 → 303, 158 renamed; suggests `graphify label`, which uses an LLM). |
| Keeping it current | `CLAUDE.md` tells Claude to run `graphify update .` after code changes; otherwise the graph goes stale (ours is now stale after reverting the test edit). Teams must commit 47 MB of generated files or rebuild on each machine, plus optional git hooks. |

## 6. About Graphify's own benchmarks
- The README's benchmark table is about **conversational memory** (LOCOMO, LongMemEval recall/QA), not coding agents navigating a repo.
- The built-in `graphify benchmark` command measures "token reduction" against reading the **entire corpus** (`corpus_tokens / query_tokens`). No coding agent reads the whole repo; Claude greps and opens a few files. That baseline makes the ratio look large but says nothing about savings versus how Claude actually works. Our G0 baseline is the fair one.

## 7. Answer to Q3
| Repo size | Verdict | Evidence |
|---|---|---|
| mini-kouventa (small) | **No.** | Claude finds anything in a few searches; a map has nothing to save. |
| ~1,000–1,500 code files, ~100k Go lines (memos) | **No.** | Tested: same accuracy, no reliable saving, slower when relied on, graph blind to most Go method calls. |
| Much larger / many services | **Unknown, not tested.** | Grep gets more expensive as repos grow; Graphify *could* help there if its Go call resolution improves. |

**Recommendation for Helios:** don't add Graphify to the workflow now. It adds setup, 47 MB of generated files, an update step after every change, and a risk of misleading "nothing is affected" answers, with no measured benefit.

**Re-test triggers** (any one): Graphify release notes say Go method / struct-field calls are resolved (re-run `graphify affected store_store_applymemomutation` on memos @ `a80576a`: it should list 3 callers); Helios grows to many services where Claude's searches visibly get slow or miss things; the team wants an onboarding visual (`graph.html`) rather than an agent aid (not evaluated here).

**Useful bit worth keeping (optional, no install for the team):** for one-off exploration, a developer can build the graph locally and use `graphify explain <function>` as a quick "who calls this plain function?" lookup, always double-checking with search.

## 8. Limitations
- One repo, three questions, one run per condition (n = 1). Small differences in tokens/time are within normal variation.
- Code-only mode; Graphify's LLM extraction for docs/PDFs/images was not tested (costs extra).
- Default soft hooks; `--strict` mode not tested (it only blocks the first raw read until a query has run, which would not fix the missing edges).
- Windows: Claude often runs shell commands through Bash/PowerShell; hook coverage could differ on macOS/Linux, but the gaps are in the graph itself, not the hooks.
- The questions were written by us with keys verified by hand; G0 answered all of them perfectly, so the test cannot show accuracy gains on harder questions.
