# Run card: F1-C2

- **Date:** 2026-09-30
- **Task / chef:** F1 Internal Room Notes / C2 Everything Claude Code (ECC 2.2.2)
- **Testbed + commit:** mini-kouventa @ `base-C2` (cb4bc8d: eval-base-v2 + ECC plugin at project scope, standard hooks, rules common/golang/typescript/react)
- **Run branch:** `run/F1-C2`
- **Model / effort / mode:** Opus 5.5 / medium / auto mode
- **ECC memory cleared before run:** yes
- **Workflow followed (ECC README "Building a feature"):** `/ecc:plan` + prompt → approve + "Implement it using the tdd-workflow skill" → `/ecc:code-review` → "Fix the CRITICAL and HIGH issues"
- **Prompt:** `prompts/F1-notes-spec.md` v1

## Time
| | Value |
|---|---|
| Manual clock | 14:37 → 15:25 |
| **Active time (official, transcript span)** | **39.0 min** |
| Implementation phase alone (per ECC) | "Brewed for 14m 0s" |

## Cost
| Metric | Value | vs F1-C0 | vs F1-C1 |
|---|---|---|---|
| Usage % of 5-hour limit | 1% → 17% = **+16%** | **5.3×** (C0: +3%) | 0.67× (C1: +24%) |
| Input tokens (uncached) | 122 | | |
| Output tokens | 91,497 | 5.3× | 1.1× |
| Cache read | 9,663,517 | 9.7× | 1.2× |
| Cache write | 205,053 | 4.1× | 0.34× |

Cache reads are the highest of the three chefs. That's consistent with ECC's +13.7k tokens of context being re-read on every turn.

## Behaviour
| Metric | Value | C0 / C1 |
|---|---|---|
| Tool calls | **78** (Bash 35, Edit 20, Write 18, Read 3, Skill 1, Grep 1) | 22 / 111 |
| Skills invoked by the model | `ecc:tdd-workflow` ×1 (after we asked for it) | none / code-review, grilling, domain-modeling |
| Subagents launched | **none** | none / 6 |
| GateGuard denials | **16** (each blocked a first edit/command until facts were given; Claude handled them itself) | n/a |
| Plan questions | 2 (Risk 1 yellow token, Risk 2 code points vs graphemes) | 0 / 16 |
| Human interventions (typed replies) | **2** (plan answers; "Fix the CRITICAL and HIGH issues") | 0 / 2 |
| Permission approvals | **32** | 11 / 52 |
| Commits | **8**: RED `test:` commits before GREEN `feat:` commits, plus refactor and docs commits | 0 / 4 |

Commit history (TDD evidence):
```
2c0aeb5 refactor: split RoomChat and NoteForm under the 50-line function limit   ← review fix
fd54a88 docs: add TDD evidence report for room notes
33d2901 refactor: reject invalid Firestore room ids and tidy tab panel markup
6e9f40f feat: add Notes tab with internal room notes to chat window
9d364ff test: add failing frontend tests for room notes tab                         ← RED
e01859a refactor: wrap note store errors and add emulator-gated store tests
ba00930 feat: add room notes API (GET/POST /api/rooms/{id}/notes)
47ea24c test: add failing handler tests for room notes API                          ← RED
```

## Code review (`/ecc:code-review`)
- **Scope:** "There were no uncommitted changes, so this reviews the whole feature: the 7 commits since cb4bc8d, 15 files." ⇒ **the pilot's "reviews nothing after committing" gotcha did NOT reproduce in 2.2.2.**
- **Findings:** 0 CRITICAL · **2 HIGH** · 3 MEDIUM · 6 LOW. Verdict: request changes.
  - HIGH ×2: functions over the **50-line limit from ECC's own rules** (`NoteForm` 61, `RoomChat` 77). Style, not bugs ("no bugs or security holes in the code itself").
  - MEDIUM: Firestore security rules not in the repo (CRITICAL if open); no auth on the endpoints (pre-existing); `ListNotes` unbounded.
  - LOW: relative time never refreshes; zero-width-only content accepted; trailing JSON garbage ignored; a11y of tabs inherited; no JSDoc.
- **Fix:** both HIGH fixed by refactor (RoomChat 77 → 17 lines via `RoomHeader` + `ChatPanel`; NoteForm 61 → 42 via `NoteFormRow`). Firestore rules left alone (answer sheet: out of scope).

## Scores
| Check | Result |
|---|---|
| API acceptance | **14 / 14** |
| UI checklist | **7 / 7**. Notes: U2 uses **relative time ("2m ago")** instead of date/time; U5 passes via the backend error, but **no live character counter** (C0 and C1 added one; the spec didn't require it) |
| Wrote tests? | **Yes, most of all chefs**: **52 Go test cases** (handler tests via a fake store + 3 emulator-gated Firestore store tests, skipped here) and **20 frontend tests** (api, ChatWindow, NotesPanel) |
| Tests pass? | **Yes** (verified): `go test ./...` ok; `npm test` → 4 files, 20 tests passed |
| Rubric | Pending (batched) |

## What it built (notable differences)
- **Security bug found and fixed:** room IDs with an encoded slash (e.g. `/api/rooms/x%2Fnotes%2Fy/notes`) could read or write **a different Firestore path**. Now rejected with 404, and tested. (C0 had self-reported that odd room IDs return 500, but didn't fix it.)
- `NoteStore` interface + Firestore store (`notes_store.go`), store errors wrapped and logged, generic 500s.
- Chat view **stays mounted while hidden**, so an unsent draft and the live subscription survive tab switches.
- Contrast-aware design tokens: `--color-warning: #FFC107` + `--color-on-warning: #1E1E1E` (dark text on yellow, because white fails contrast).
- TDD evidence report written to `.claude/tdd/room-notes.tdd.md`.
- Transparent "Not verified" list: Firestore code not run against a DB, `go test -race` crashes on Windows, no browser check, gofmt noise from CRLF line endings.

## Notable observations
1. **Planning style:** ECC *proposes and asks for approval* (2 questions); C1 *interviews* (16 questions). Both found the same key risks (code points vs graphemes, missing Firestore rules, no yellow token); ECC additionally flagged the contrast issue.
2. **"Automatic" agents did not fire.** Despite `planner` ("Use PROACTIVELY…"), `code-reviewer` ("MUST BE USED for all code changes") and `go-reviewer` ("MUST BE USED for Go projects"), **0 subagents** were launched. `/ecc:plan` and `/ecc:code-review` ran inline. The only skill used was the one we named (`tdd-workflow`). Evidence for "Gear 2 is not reliable".
3. **TDD was genuinely enforced:** failing-test commits precede implementation commits, and an evidence report was written.
4. **ECC's rules drive review severity:** both HIGH findings came from the 50-line rule, which cost an extra refactor round.
5. **Always commits:** working tree clean at the end; 8 commits on the run branch; nothing pushed.
6. **GateGuard blocked 16 actions**, about 1 in 5 tool calls (16 / 78). Claude resolved every block itself with no human involvement; the cost is extra turns and tokens, not your time. Whether it prevented any real mistake isn't visible here; that's what the Q2 GateGuard test is for.

## Notes on data quality
- New 5-hour window started before this run (usage 1% at start), so there was no interruption.
- Interventions: 2. Approvals: 32.
- Transcript counter included all logs in the F1-C2 folder (one session).
