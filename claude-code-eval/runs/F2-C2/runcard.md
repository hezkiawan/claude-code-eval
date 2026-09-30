# Run card: F2-C2

- **Date:** 2026-09-30
- **Task / chef:** F2 Room Claiming + SLA (**prompt v2**) / C2 Everything Claude Code (ECC 2.2.2)
- **Testbed + commit:** mini-kouventa @ `base-C2` (cb4bc8d)
- **Run branch:** `run/F2-C2`
- **Model / effort / mode:** Opus 5.5 / medium / auto mode
- **ECC memory cleared before run:** yes
- **Workflow followed:** `/ecc:plan` + prompt → "Yes, proceed. Implement it using the tdd-workflow skill." → `/ecc:code-review` → (no CRITICAL/HIGH, so no fix step)

## Time
| | Value |
|---|---|
| Manual clock | 17:26 → 17:45 |
| **Active time (official, transcript span)** | **20.9 min** |

## Cost
| Metric | Value | F2-C0 / F2-C1 |
|---|---|---|
| Usage % of 5-hour limit | 48% → 58% = **+10%** | +2% / +17% |
| Input tokens (uncached) | 76 | |
| Output tokens | 62,059 | 15,993 / 60,327 |
| Cache read | 4,878,255 | 0.97M / 5.73M |
| Cache write | 151,140 | 50k / 409k |

## Behaviour
| Metric | Value | F2-C0 / F2-C1 |
|---|---|---|
| Tool calls | **64** (Bash 22, Write 22, Edit 18, Read 1, Skill 1) | 15 / 90 |
| Skills invoked by the model | `ecc:tdd-workflow` ×1 (the one we named) | none / 5 |
| Subagents launched | **none** | none / 4 |
| GateGuard denials | **18** (~1 in 3.5 tool calls) | n/a |
| Plan questions | 2 "open questions" **with stated defaults**: (1) bot rooms claimable? default yes; (2) SLA badge on assigned tiles? default yes | 0 / 10 |
| Human interventions (typed replies) | **0** (only the workflow approval line was sent; see data-quality note) | 0 / 2 |
| Permission approvals | **19** | 13 / 35 |
| Commits | **5**: RED → GREEN for backend and frontend, then refactor | 0 / 2 |

```
ac17425 refactor: group ChatList claim state, stabilise live SLA badge test
12614cd feat: claim rooms from the queue with live SLA breached badge
bb9a64b test: add failing tests for claim UI + live SLA badge (frontend)      ← RED
bef6eda feat: add POST /api/rooms/{id}/claim with SLA breach recording
cb61c74 test: add failing tests for room claim + SLA breach (backend)         ← RED
```

## Plan (`/ecc:plan`)
- Restated requirements, a "patterns to mirror" table (file:line references), 5 phases, risks, open questions.
- **Race condition listed as a HIGH risk** with a Firestore transaction as mitigation; **nested `<button>` listed as MEDIUM risk** with the fix (wrapper div + sibling button).
- Clarified "sidebar" = `ChatList.tsx` (not `Sidebar.tsx`), as C1 did.
- Chose a **per-room `setTimeout` at the exact breach moment** instead of a 1-second tick for the live badge.

## Code review (`/ecc:code-review`)
- **Scope:** `cb4bc8d..HEAD`, 17 files (reviewed committed work correctly).
- **Result: 0 CRITICAL · 0 HIGH · 4 MEDIUM · 5 LOW**. Decision "approve with comments", so **per protocol no fix step was run**.
- MEDIUM findings (left unfixed):
  1. **Real bug:** switching tabs while a claim is in flight can load the wrong tab's rooms (stale `status` in `handleClaim`; the same out-of-order issue exists in `load`).
  2. **Real bug:** claiming two rooms at once breaks the "Claiming…" state (single `claimingId`), so a button can be double-clicked.
  3. `ChatList` ~90 lines, over ECC's 50-line guideline.
  4. Firestore claim code (`claimInFirestore`) untested (0% coverage); needs an emulator race test.
- LOW: misleading 409 message for unexpected statuses; Firestore-reserved `__name__` IDs → 500; claim error never clears; `aria-busy` missing; server trusts client agent name (accepted until login).
- It also confirmed the race handling: "a transaction retried after losing a race correctly returns 409".

## Scores
| Check | Result |
|---|---|
| **F2 API acceptance** | **11 / 11**, including **B11: exactly 1 winner in all 5 rooms** |
| UI checklist | **7 / 7**. Note: the SLA badge also shows on **Assigned** tiles (it followed its own default for open question 2), same as C0; C1 shows it only on unassigned rooms per the answer sheet |
| Wrote tests? | **Yes**: Go table tests for the pure `applyClaim` rules + handler 400 paths; frontend **22 tests** (`sla.test.ts` 6, `api.test.ts` 3, `useSlaBreached.test.tsx` 5, `ChatList.test.tsx` 7, smoke 1) |
| Tests pass? | **Yes** (verified): `go test ./...` → handlers ok; `npm test` → 5 files, 22 passed |
| Coverage (self-reported) | New files 90–100%; overall backend handlers 33%, frontend 47% (below ECC's 80% rule because older code never had tests) |
| Rubric | Pending (batched) |

## Notable observations
1. **Same correctness as stock and C1** (11/11, B11 pass). Cost sits between them: **+10%** vs +2% (C0) and +17% (C1).
2. **ECC's review found 2 real frontend concurrency bugs** (stale tab reload, double-claim UI state), but rated them MEDIUM, so under ECC's own "fix CRITICAL/HIGH" flow they **stay unfixed**. Contrast with F1-C2, where two *style* issues (50-line rule) were rated HIGH and fixed. ⇒ **ECC's severity rating is driven by its rules, not by user impact.** C1's review found and **fixed** the same stale-tab class of bug in F2-C1 ticket 01.
3. **TDD visibly enforced again:** failing-test commits precede feature commits for both backend and frontend. It also caught and fixed a **flaky test** (failed 1 in 5 runs; rewritten, then 10 green runs in a row).
4. **Honest "open issues" list:** Firestore claim code untested, coverage below 80%, server trusts the client-supplied agent name.
5. **GateGuard: 18 denials**, all resolved by Claude itself. There's still no visible case where a block prevented a mistake.
6. **Agents didn't fire on their own again:** no planner, code-reviewer, go-reviewer, typescript-reviewer or security-reviewer subagents, despite "MUST BE USED / PROACTIVELY" descriptions.
7. Always commits; working tree clean at the end.

## Notes on data quality
- ⚠️ **Protocol miss (minor):** the plan ended with 2 open questions *with defaults* ("unless you say otherwise"). Per protocol they should have been answered from the answer sheet (bot rooms: idle or bot are claimable, which matches its default; badge on assigned: "Only on unassigned rooms", which contradicts its default). Only the approval line was sent, so ECC used its default for Q2 and the badge shows on Assigned tiles. Impact: one small UI behaviour (same as C0's choice); correctness checks unaffected. **Not rerun** (cost); recorded as a limitation. Interventions would have been 1 instead of 0.
- UI: the seeded **bot room** ("Bot customer C2") showed a **Claim button on the Bot tab**, as required (idle and bot rooms are claimable).
- Transcript counter: all logs in the F2-C2 folder (one session).
