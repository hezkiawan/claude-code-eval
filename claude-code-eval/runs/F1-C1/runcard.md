# Run card: F1-C1

- **Date:** 2026-09-30
- **Task / chef:** F1 Internal Room Notes / C1 Matt Pocock skills
- **Testbed + commit:** mini-kouventa @ `base-C1` (eval-base-v2 + Matt Pocock skills, local-markdown tracker)
- **Run branch:** `run/F1-C1`
- **Model / effort / mode:** Opus 5.5 / medium / auto mode
- **Workflow followed:** `/grill-with-docs` + prompt → `/to-spec` → `/to-tickets` → `/clear` → `/implement` × 3 tickets (with `/clear` between)
- **Prompt:** `prompts/F1-notes-spec.md` v1

## Time
| | Value |
|---|---|
| Manual clock | recorded 12:29 → 14:05. ⚠️ start time can't be right (the run began after 13:08); not used |
| **Active time (official, transcript span)** | **47.1 min** (includes time waiting for grilling answers) |

## Cost
| Metric | Value | vs F1-C0 |
|---|---|---|
| Usage % of 5-hour limit | 21% → 45% = **+24%** | **8×** (C0: +3%) |
| Input tokens (uncached) | 250 | |
| Output tokens | 84,551 | 4.9× |
| Cache read | 8,150,597 | 8.2× |
| Cache write | 606,866 | 12× |

## Behaviour
| Metric | Value | vs F1-C0 |
|---|---|---|
| Tool calls | **111** (Bash 84, Write 6, Agent 6, SubagentHandback 6, Skill 5, Read 2, Edit 1, PowerShell 1) | 5× (C0: 22) |
| Skills invoked by the model | code-review ×3, grilling ×1, domain-modeling ×1 | C0: none |
| Subagents launched | general-purpose ×6 (= 2 reviewers × 3 tickets: Standards + Spec) | C0: none |
| Sessions | 4 (plan + 3 tickets) | C0: 1 |
| Grilling | **16 questions** in 2 rounds (10 + 6) | C0: asked nothing |
| Human interventions (typed replies) | **2** (one reply per grilling round) | C0: 0 |
| Answered from the answer sheet | Q2, Q3, Q8, and parts of Q4, Q6, Q9, Q11 | |
| "Your call" | Q1, Q5, Q7, Q10, Q12–Q16, and the rest of Q4, Q6, Q9, Q11 | |
| Permission approvals (plain "Yes") | **52** | 4.7× (C0: 11) |
| Commits | 4 (013ec60, 4e79d72, 4cdb0ac, fd46d8b): one per ticket + one review-fix commit | C0: 0 |

Tickets produced by `/to-tickets` (vertical slices):
1. `01-add-and-list-internal-notes`: add/list plain notes (backend + tabs + list + form)
2. `02-content-length-rules`: 500-character rule in code points, live counter
3. `03-important-notes`: `isImportant` flag + yellow highlight

## Scores
| Check | Result |
|---|---|
| API acceptance | **14 / 14** |
| UI checklist | **7 / 7** |
| Wrote tests? | **Yes**: backend `notes_test.go` via httptest + in-memory fake store; frontend `RoomNotes.test.tsx` (14) + `ChatWindow.test.tsx` (3) |
| Tests pass? | **Yes** (verified): `go test ./...` ok; `npm test` → 3 files, **18 tests** passed |
| Rubric | Pending (batched) |

## What it built (beyond C0)
- **Backend:** handler behind a `NoteStore` interface (testable without Firestore), separate `notes_firestore.go`; body validated before the room lookup; stricter types (`null`/non-string content → 400 "content must be a string"); generic 500 messages with details logged server-side only; ties in ordering broken by note ID.
- **Frontend:** new `RoomNotes.tsx`; **message composer hidden on the Notes tab** (so an agent can't accidentally send a note to the customer); full date + time on notes; live n/500 counter in code points; checkbox resets after a save; failed save keeps the text.
- **Docs and knowledge:** created **`CONTEXT.md`** (glossary: Room, Message, Internal Note, Important, Customer, Agent, Platform); decided no ADR was needed; **registered the new `--color-warning` token in `.claude/rules/frontend-design-system.md`**, including a rule that yellow must not be used for buttons or links.

## Notable observations
1. **Grilling found real issues before any code was written:** bytes-vs-characters counting in the existing code, missing Firestore security rules (notes could be readable from the browser), no yellow in the design system, and the risk of sending notes to customers through the composer.
2. **The Spec reviewer caught a subtle real bug:** frontend `trim()` and Go `strings.TrimSpace` strip different rare characters, so the counter and the backend could disagree. Fixed by making the frontend trim like Go.
3. **Review step visible:** 6 reviewer subagents (Standards + Spec per ticket); findings fixed or explicitly "left as is" with a reason.
4. **`/tdd` never showed up as a skill call.** `/implement` followed a test-first approach in its own flow; worth checking in the transcript before claiming TDD happened.
5. **Small inconsistency:** grilling Q15 settled "fetch notes when the Room mounts", but ticket 01's implementation "fetches notes every time the tab opens". Not caught by the Spec reviewer. Minor, but it shows grilled decisions can drift by the time of implementation.
6. **Didn't commit `.scratch/` or `CONTEXT.md`** and didn't update the tickets' status lines ("untracked before this work"). Committed at the end by us.
7. **Friction:** 52 permission approvals (Bash-heavy: 84 Bash calls, many running tests between TDD steps).

## Notes on data quality
- Start time recorded as 12:29 can't be right; the official active time is the transcript span (47.1 min).
- Interventions counted as 2 (one per grilling round). ⚠️ Confirm no other typed replies were needed during `/to-spec`, `/to-tickets` or `/implement`.
- Transcript counter included all session logs in the F1-C1 folder (4 sessions + subagent logs).
