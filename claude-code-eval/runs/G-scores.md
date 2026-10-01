# Graphify test: scores

Build (G1, user laptop): 98 s, 47 MB, 1,258 code files, 13,142 nodes, 56,194 edges, 322 communities. 4 .sql files skipped (tree_sitter_sql not installed).

| Run | Recall | Wrong claims | Tool calls | Output tok | Cache read | Work time* | Usage Δ | Approvals | Questions | Graphify cmds |
|---|---|---|---|---|---|---|---|---|---|---|
| GQ1-G0 | 8/8 | 0 | 17 (Bash 11, Grep 4, Read 2) | 7,845 | 896,482 | ~4 min (wall 00:40–00:44; span 3.9) | 64→66% (2%) | 13 | 0 | – |
| GQ1-G1 | 8/8 | 0 | 12 (Bash 12) | 6,607 | 709,266 | 1.6 min ("Baked for 1m 37s"; span 4.5 incl. setup) | 0→3% (window reset; ~3%) | 11 | 0 | query ×1 |
| GQ2-G0 | 6/6 | 0 | 15 (Read 8, Grep 6, Glob 1) | 5,399 | 445,975 | 0.8 min ("Churned for 52s") | 4→5% (1%) | 0 | 0 | – |
| GQ2-G1 | 6/6 | 0 | 8 (Bash 6, Grep 2) | 4,647 | 461,081 | 1.2 min | 6→7% (1%) | 6 | 0 | query ×1 |
| GQ3-G0 | 9/9 | 0 | 6 (Bash 4, Grep 2) | 3,723 | 347,040 | 0.8 min ("Sautéed for 44s") | 8→9% (1%) | 4 | 0 | – |
| GQ3-G1 | 9/9 | 0 | 6 (Bash 6) | 4,335 | 322,919 | 1.3 min ("Cogitated for 1m 0s") | 9→11% (2%) | 6 | 0 | explain ×2 |
| GQ1-G2 (forced) | 8/8 | 0 | 14 (Bash 14) | 6,451 | 799,502 | 3.5 min | 12→13% (1%) | 12 | 0 | explain ×8, query ×1 |
| GQ2-G2 (forced) | 6/6 | 0 | 9 (Bash 9) | 4,492 | 475,002 | 2.0 min | 14→15% (1%) | 6 | 0 | explain ×7, query ×1 |
| GQ3-G2 (forced) | 9/9 | 0 | 15 (Bash 10, Grep 5) | 6,093 | 725,344 | 2.3 min | 15→16% (1%) | 8 | 0 | explain ×3, affected ×3 |

*Work time: from the next run on, use the counter's "Claude working time" line (added to transcript-stats.mjs); spans can include setup (/model, /hooks).

Notes:
- GQ1-G0: complete chain + extras beyond key (Connect route, interceptors, SQLite BEGIN IMMEDIATE, driver insert fns, useCreateMemo alt path correctly flagged as unused by editor). 11 extra names spot-checked, all real.
- GQ1-G1: Claude ran `graphify query` once, judged it noisy ("Graph is noisy here; I'll go to source directly"; the answer says the query "returned mostly test files"), then traced by reading source via shell commands. Same 8/8 content; 9 extra names spot-checked, all real. The graph added nothing to the answer.
  - Lower tokens (−16% output, −21% cache read) and fewer tool calls, but this is n = 1 and the answer never used graph output, so the difference is most likely normal run-to-run variation, not a Graphify effect.
  - Matches the sandbox pre-finding: natural-language `graphify query` is a keyword search that surfaces many test files for broad questions.
- GQ2-G0: all 6 key items, plus correct extras: core/access/memo_resolve.go (ResolveMemoReadFacts, WithViewer, ResolveMemoReadContext), GetSharedMemo share path, memoAccessDecisionError, and a sharp design observation (rules exist twice, Go check + SQL predicate; admin exception only on single fetch). 8 extras spot-checked, all real. Used the dedicated Read/Grep tools, so 0 approvals.
- GQ2-G1: all 6 key items + the same extras as G0 (plus filter_access.go validateFilterSpaceAccess, more callers with line numbers). `graphify query` started from 8 keywords and returned 2,097 nodes; Claude: "Graph query was too broad; narrowing with grep" and its answer says the query didn't give a usable subgraph. Again the answer came from search + reading, not the graph. Costs ≈ G0 (fewer calls, similar tokens, slightly longer time, 6 extra approvals because it used shell commands).
- GQ3-G0: all 3 direct callers + all 6 indirect entries, found by a simple grep for `ApplyMemoMutation` then one hop up. Correct extras: separates the driver method (same name, different method), lists test files that call it, maps each RPC to its REST route, notes ImportMemos RPC (user_service_memo_transfer.go) and the MCP server (server/mcp) exposing the same RPCs. Extras spot-checked, all real. Plain grep solves blast-radius questions quickly: 6 tool calls, 44 s.
- GQ3-G1: 9/9, 0 wrong; same extras as G0 plus a nuance G0 missed (UpdateMemo only reaches ApplyMemoMutation when content/attachments/relations change). This time Claude picked the right targeted command, `graphify explain` on the exact node, but the graph showed only what the function calls, not who calls it (the struct-field call gap). Claude noticed and said so ("graphify explain only showed what the function calls, not what calls it, so I found the callers by searching the Go code"), then grepped. Correct answer thanks to Claude's verification, not the graph. Cost ≈ G0 (same 6 calls, +16% output tokens, +0.5 min).
  - Risk: if a developer (or a less careful run) trusted the graph, the blast radius would be reported as **zero callers**, a silent, dangerous miss for a "what breaks if I change this" question.

G2 = memos-G1 + a sentence telling Claude to use graphify explain/path/affected as the main source and grep/read only to verify. (GQ1-G2 counter read from the right transcript after an accidental /clear.)
- GQ1-G2: 8/8. Started with `query` ("Too broad"), then 8 targeted `explain` calls. Claude reported the gaps itself: "the graph has no edge across the interface dispatch" (handler → store → driver) and "the graph has almost no call edges on the TS side"; it filled the path by reading files. Graph helped name nodes, but the chain still came from source.
- GQ2-G2: 6/6. `explain` on GetMemo/ListMemos missed their calls to checkMemoReadAccess/resolveMemoAccessScope ("misses receiver method calls"); `path` found no link Store.ListMemos → SQL predicate. Claude: "From the helpers onward, the graph's call edges matched the source." This is the best graph showing: useful once you are at plain helper functions.
- GQ3-G2: 9/9. `explain` + `affected` ×3 on ApplyMemoMutation again returned no callers ("the extractor doesn't resolve calls made through a field like s.Store.ApplyMemoMutation"); callers came from grep. Graph only found 2 of the 6 indirect edges (SetMemoAttachments, importer replaceMemo). Forcing the graph cost +64% output tokens and ~3× the time vs G0 for the same answer.

## Why the graph has gaps (measured on the graph.json, sandbox)
- Go **methods** (functions with a receiver, e.g. `func (s *APIV1Service) checkMemoReadAccess`) get on average **0.21 incoming call edges**; plain Go **functions** get **1.83**. Calls written as `s.someMethod(...)` or `s.Store.X(...)` are mostly not linked.
- Example: `checkMemoReadAccess` has **10** production call sites (`grep s.checkMemoReadAccess(`); the graph shows **0** callers.
- In Go service code most business logic is methods on a service/store struct (memos: 3,924 methods vs 2,468 functions), and Helios's Go backend uses the same pattern, so this gap hits exactly the "who calls this?" questions Graphify is sold for.
- TypeScript: 3,779 nodes, 1,970 outgoing call edges; Claude found the editor → service → client chain thin (handled by reading).

## Totals (3 questions)
| Condition | Recall | Output tokens | Tool calls | Work time | Usage |
|---|---|---|---|---|---|
| G0 plain | 23/23 | 16,967 | 38 | ~5.6 min | ~4% |
| G1 Graphify default | 23/23 | 15,589 (−8%) | 26 | ~4.1 min | ~6% |
| G2 Graphify forced | 23/23 | 17,036 (≈0%) | 38 | ~7.8 min | ~3% |
(Usage % is coarse (1% steps) and G1's GQ1 straddled a usage-window reset; treat usage as "all small". G1's lower tokens came from runs where Claude ignored the graph, so they are not a Graphify effect.)

## Pattern across G1 runs so far
Claude obeys CLAUDE.md (runs `graphify query` first, once), finds the output too broad, and falls back to normal search. In GQ1/GQ2 it never tried the targeted commands; in GQ3 (question names a specific function) it used `explain` correctly, but the graph lacked the callers, so Claude grepped anyway. This is a valid "real-world default setup" result, not a broken test.

## Capability ceiling (run by me directly in the sandbox, same graph)
- `graphify explain "CheckMemoReadContext"`: excellent. Returned the definition (core/access/memo.go L92) and all real callers (checkMemoReadAccess, GetSharedMemo, fileserver checkAttachmentPermission, notifications, mentions, webhooks) with line numbers. It would answer much of GQ2 in one call **if you already know the function name**.
- `graphify path "CreateMemo" "ApplyMemoMutation"`: "No directed path found" (plus "ambiguous match" warnings). The graph misses Go calls through struct fields (`s.Store.ApplyMemoMutation`), so it can't trace the GQ1 flow.
- `graphify affected store_store_applymemomutation`: "No affected nodes found" (real answer: 3 direct callers). See GQ3.

## Maintenance check (G1, user laptop)
One-line comment added to server/api/v1/memo_service.go → `graphify update .` took **75 s**, re-parsed 716/1,258 files (not just the changed one), nodes 13,142 → 13,144, communities 322 → 303 (158 renamed; suggests LLM `graphify label`), backed up the previous graph. Change then reverted with git checkout (graph now stale, which itself illustrates the upkeep need). git status: only .claude/, CLAUDE.md, graphify-out/ untracked.
