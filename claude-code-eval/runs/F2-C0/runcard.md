# Run card: F2-C0

- **Date:** 2026-09-30
- **Task / chef:** F2 Room Claiming + SLA (**prompt v2**, realistic ticket) / C0 stock Claude Code
- **Testbed + commit:** mini-kouventa @ `eval-base-v2` (c4a1e0a)
- **Run branch:** `run/F2-C0`
- **Config verified:** `/plugin` empty, `/hooks` empty
- **Model / effort / mode:** Opus 5.5 / medium / auto mode
- **Prompt:** `prompts/F2-claim-spec.md` v2, pasted as-is; checker `f2-claim-acceptance.mjs` (storage-agnostic version)

## Time
| | Value |
|---|---|
| Manual clock | 15:54 → 16:00 |
| **Active time (official, transcript span)** | **6.1 min** |

## Cost
| Metric | Value |
|---|---|
| Usage % of 5-hour limit | 23% → 25% = **+2%** |
| Input tokens (uncached) | 30 |
| Output tokens | 15,993 |
| Cache read | 973,025 |
| Cache write | 49,993 |

## Behaviour
| Metric | Value |
|---|---|
| Tool calls | **15** (Bash 12, Write 3) |
| Skills invoked / subagents | none / none |
| GateGuard denials | 0 (n/a, stock) |
| Questions asked | **0** |
| Human interventions | **0** |
| Permission approvals | **13** |
| Committed? | **No** ("Nothing is committed yet") |

## Scores
| Check | Result |
|---|---|
| **F2 API acceptance** | **11 / 11**, including **B11 race test: exactly 1 winner in all 5 rooms** |
| UI checklist | **7 / 7** (incl. U3 live badge, U5 two-tab conflict error, U6 no console errors) |
| Wrote tests? | **Yes**: `claim_test.go` (8 Go cases for the claim rules) + `claim.test.tsx` (6 frontend tests; the 7th test is the base smoke test) |
| Tests pass? | **Yes** (verified): `go test ./...` → `handlers` ok; `npm test` → 2 files, 7 tests passed (smoke 1 + claim 6) |
| Rubric | Pending (batched) |

## What it built
- **Backend** (`backend/handlers/claim.go`): `POST /api/rooms/{id}/claim`. **Check-and-write inside a single Firestore transaction**, so two agents can't both claim a room (it spotted the concurrency risk unprompted from "nobody else can claim it"). 409 for already-claimed or closed, 404 for missing room, 400 for blank or too-long agent name. Stores `assignedAgent`, `claimedAt`, `waitSeconds`, `slaBreached`; status becomes `assigned`. Breach = waited **more than** 5 min (exactly 5 = on time).
- **Frontend:** green Claim button on idle and bot rooms; red "SLA breached" badge (`SlaBadge.tsx`), list re-renders every second; after a claim it switches to the Assigned tab and selects the room ("Assigned to Agent Demo"); chat header shows the agent; failed claim → list reloads + error message; design-system colours.
- `lib/claim.ts` holds the frontend's 5-minute constant (duplicated with the backend, flagged by the chef itself).

## Notable observations
1. **Stock handled the hidden trap.** With no hint about concurrency in the v2 prompt, it used a Firestore transaction and passed the 10-agents-at-once test.
2. **Very cheap and fast:** +2% usage, 6.1 minutes, 15 tool calls. Cheaper than its own F1 run.
3. **Explicit "decisions you may want to change"** list: treated bot rooms as claimable (matches the answer sheet), 5-minute limit duplicated front/back, a room already marked assigned without an agent counts as claimed.
4. **Honest about what it didn't verify:** didn't run the app (no service account key visible to it) and never saw the UI.
5. **"Files read: 0"**: it read the codebase entirely through Bash, confirming that Read-tool counts aren't comparable between chefs.

## Notes on data quality
- One session, no pre-run sessions counted. Interventions 0, approvals 13.
- Not committed by the chef; committed by us at the end of the run.
