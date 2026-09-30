# Run card: F2-C1

- **Date:** 2026-09-30
- **Task / chef:** F2 Room Claiming + SLA (**prompt v2**) / C1 Matt Pocock skills
- **Testbed + commit:** mini-kouventa @ `base-C1` (local-markdown tracker)
- **Run branch:** `run/F2-C1`
- **Model / effort / mode:** Opus 5.5 / medium / auto mode
- **Workflow followed:** `/grill-with-docs` + prompt → `/to-spec` (with test-seam question) → `/to-tickets` → `/clear` → `/implement` × 2 tickets

## Time
| | Value |
|---|---|
| Manual clock | 16:25 → 16:53 |
| **Active time (official, transcript span)** | **34.3 min** |

## Cost
| Metric | Value | vs F2-C0 |
|---|---|---|
| Usage % of 5-hour limit | 29% → 46% = **+17%** | **8.5×** (C0: +2%) |
| Input tokens (uncached) | 180 | |
| Output tokens | 60,327 | 3.8× |
| Cache read | 5,729,486 | 5.9× |
| Cache write | 409,453 | 8.2× |

## Behaviour
| Metric | Value | F2-C0 |
|---|---|---|
| Tool calls | **90** (Bash 56, Edit 12, Write 7, Skill 5, Agent 4, SubagentHandback 4, AskUserQuestion 1, Read 1) | 15 |
| Skills invoked by the model | code-review ×2, grilling ×1, domain-modeling ×1, **tdd ×1** | none |
| Subagents launched | general-purpose ×4 (Standards + Spec reviewer × 2 tickets) | none |
| Sessions | 3 (plan + 2 tickets) | 1 |
| Questions asked | **10** = grilling 8 (1 round) + test seams 2 (after `/to-spec`) | 0 |
| Human interventions (typed replies) | **2** (grilling round; seam answers) | 0 |
| Answer-sheet overrides of its recommendations | Q1 (it wanted only `idle` claimable → sheet: idle + bot); Q6 (it wanted a breach marker on Assigned tiles → sheet: only on unassigned rooms) | n/a |
| Permission approvals | **35** | 13 |
| Commits | **2** (87f142e ticket 01, 74110cd ticket 02) | 0 |

Tickets produced by `/to-tickets`:
1. `01-agent-claims-unassigned-room`: tile rebuilt to hold a Claim button, claim endpoint (400/404/409) with a pure rules function + Firestore transaction, who and when recorded, switch to Assigned tab, inline errors, Go + ChatList tests
2. `02-sla-breach-recorded-and-shown-live` (blocked by 01): `waitSeconds` + `slaBreached` on claim (strict > 5:00, backend clock), shared frontend breach rule, 1-second tick, live red pill on Idle and Bot rooms, boundary tests (4:59 / 5:00 / 5:01) with fake timers

## Scores
| Check | Result |
|---|---|
| **F2 API acceptance** | **11 / 11**, including **B11: exactly 1 winner in all 5 rooms** |
| UI checklist | **7 / 7**. Note: SLA badge shows only on unassigned rooms (Idle/Bot tabs), **not** on the Assigned tab, which matches the answer sheet ("Only on unassigned rooms"). C0 kept the badge on assigned rooms too (see F2-C0) |
| Wrote tests? | **Yes**: Go table tests for the pure claim function (idle/bot success, assigned incl. same agent, closed, not found, agent-name rules, SLA boundary 4:59 / 5:00 / 5:01, waitSeconds); frontend `ChatList.test.tsx` **8 tests** with fake timers |
| Tests pass? | **Yes** (verified): `go test ./...` → handlers ok (2.2 s); `npm test` → 2 files, 9 tests passed |
| Rubric | Pending (batched) |

## What it built / how it planned
- **Spec** (`.scratch/…`, 31 user stories): explicit domain rules, backend claim **pure domain function** + thin transactional handler, optional Room fields, frontend design, testing decisions, out-of-scope list. Race condition written in as user story 22 ("even if two agents click Claim at the same moment").
- **Glossary (`CONTEXT.md`):** Room, Agent, Unassigned room, Claim, Assigned room, Wait time, SLA threshold, SLA breach. It flagged **"Expired" as a term to avoid** because the design system uses it for the WhatsApp session window.
- **Backend:** `claim.go` pure function (no Firestore or HTTP) + transaction in the handler; 409 messages name the reason ("room already claimed by …", "closed rooms cannot be claimed"); fields `assignedAgent`, `claimedAt`, `waitSeconds`, `slaBreached`, omitted until set.
- **Frontend:** tile restructured into a row + sibling Claim button (avoids the nested-button trap); `CURRENT_AGENT` constant in one place; shared `lib/sla.ts` rule; 1-second tick; shared `Pill` component so the badge can't drift from `StatusBadge`; inline error on the tile + tab reload; "Assigned to Agent Demo" line.

## Notable observations
1. **Same outcome as stock, at 8.5× the usage.** Both passed 11/11 and B11. C1 wrote the race into the plan (grilling Q5 and spec story 22) before coding; stock did it silently.
2. **The Spec reviewer caught a subtle real bug:** a claim at 5:00.4 stored `waitSeconds=300` but `slaBreached=true`, so the two saved values disagreed. Fixed so the breach is decided from the same rounded value on both sides; tests added.
3. **Checked that its own tests work:** after ticket 01 it deliberately broke four behaviours one at a time (reload after failure, disabled state, row not selected, …) to confirm each made a test fail. That's mutation-style verification.
4. **Test seam trade-off stated openly:** it chose a pure function as the backend seam, so the Firestore transaction and HTTP status mapping are **not** covered by automated tests ("verify manually"). The race was still handled correctly (B11 pass), but only the checker proves it.
5. **Cheaper than F1-C1 (+17% vs +24%)** with **2 tickets instead of 3** and 4 reviewer subagents instead of 6. Supports the hypothesis that ticket count drives MP's cost.
6. `.scratch/` and `CONTEXT.md` again left uncommitted by the chef ("untracked before I started").

## Usage breakdown from Claude Code (`/usage` insights, last 24h, all runs combined)
Not specific to this run, but the clearest evidence so far of **where each chef's cost comes from**:
| Source | Share of 24h usage |
|---|---|
| Subagent-heavy sessions | 51% |
| Plugin `ecc` (all its skills, agents and hooks) | 26% |
| `/ecc:tdd-workflow` skill | 21% |
| `/implement` (MP) | 18% |
| `code-review` subagents (MP) | 15% |
| Sessions at > 150k context | 18% |
| `/tdd` 5%, `/code-review` 4%, `/ecc:code-review` 3%, `/ecc:plan` 2%, `/to-spec` 2%, `/domain-modeling` 2% | |
⇒ **MP's cost driver = its review subagents; ECC's cost driver = its `tdd-workflow` skill.**

## Notes on data quality
- Interventions 2, approvals 35, all logs in the F2-C1 folder counted (3 sessions + subagent logs).
- UI note: if no **bot** rooms existed during the UI check, the badge on the Bot tab wasn't observed; it's covered by the chef's own tests ("shows on Bot rooms").
