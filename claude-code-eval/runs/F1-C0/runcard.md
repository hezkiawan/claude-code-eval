# Run card: F1-C0

- **Date:** 2026-09-30
- **Task / chef:** F1 Internal Room Notes / C0 stock Claude Code
- **Testbed + commit:** mini-kouventa @ `eval-base-v2` (c4a1e0a)
- **Run branch:** `run/F1-C0`
- **Config verified:** `/plugin` empty, `/hooks` empty (stock)
- **Model / effort / mode:** Opus 5.5 / medium / auto mode
- **Prompt:** `prompts/F1-notes-spec.md` v1, pasted as-is (no entry command)

## Time
| | Value |
|---|---|
| Manual clock | 11:02 → 11:47 (includes prep; not used) |
| **Active time (official, transcript span)** | **12.5 min** |

## Cost
| Metric | Value |
|---|---|
| Usage % of 5-hour limit | 14% → 17% = **+3%** |
| Input tokens (uncached) | 32 |
| Output tokens | 17,368 |
| Cache read | 998,745 |
| Cache write | 50,137 |
| Total tokens processed | ~1.07M (mostly cheap cache reads) |
| claude-monitor (external estimate, secondary) | 17,400 tokens, 9.1% of its window |

## Behaviour
| Metric | Value |
|---|---|
| Tool calls | 22 (Bash 11, Edit 5, Write 4, Read 2) |
| Skills invoked | none |
| Subagents launched | none |
| Files read (Read tool) / written or edited | 2 / 6. ⚠️ See note 2 |
| Human interventions (typed replies) | **0** |
| Permission approvals (plain "Yes") | **11** (mostly `cd` commands) |
| Questions not covered by the answer sheet | none |
| Asked clarifying questions before coding? | No (worked straight from the prompt) |
| Committed? | No ("Nothing is committed yet") |

## Scores
| Check | Result |
|---|---|
| API acceptance | **14 / 14** |
| UI checklist | **7 / 7** |
| Wrote tests? | **Yes**: backend `notes_test.go` (18 validation cases) + frontend `NotesPanel` tests (highlight, add-and-clear, error display) |
| Tests pass? | **Yes** (verified): `go test ./...` → `handlers` ok (2.06 s); `npm test` → 2 files, 4 tests passed (smoke 1 + NotesPanel 3) |
| Rubric | Pending (batched after all runs) |

## What it built
- **Backend:** `backend/handlers/notes.go`, routes in `main.go`. Checks the room exists first (404 JSON). Validates content (string, trimmed, 1–500 code points) and `isImportant` (boolean only; `null`/`"true"` → 400). Stores in `rooms/{id}/notes` with a Firestore server timestamp. GET sorted newest first in Firestore, `[]` when empty.
- **Frontend:** Chat/Notes tabs in `ChatWindow.tsx` (reusing the existing `Tabs` component); new `NotesPanel.tsx` with list, "Important" label + yellow left border, input + checkbox + "Add Note" + n/500 counter, optimistic insert + clear, backend error shown. API helpers in `lib/api.ts`, `Note` type in `lib/types.ts`.

## Notable observations
1. **Transparent final report.** It listed what it had *not* verified: no run against real Firestore, no browser check.
2. **Design-system judgment:** the design system has no yellow, so it added `--color-warning: #ffc107` (+ soft tint) as tokens in `globals.css` and Tailwind rather than hard-coding hex, and flagged it for review.
3. **Self-reported limitations:**
   - Multi-part emoji (skin tones, families) count as more than 1 character (code points, not graphemes). Acceptable under the spec's "Unicode characters" wording.
   - Unusual room IDs (e.g. containing `/`) return **500 instead of 404**. A minor edge-case bug it flagged itself.
   - Pre-existing `gofmt` issue in `rooms.go` left alone (scope discipline).
4. **Didn't ask any questions.** F1's prompt is fully specified, so this is expected.
5. **Auto mode still asked approval 11 times**, mostly for `cd` commands (Claude Code behaviour, same for every chef).

## Notes on data quality
1. **Time mismatch:** manual clock says 45 min, but the transcript's active span is 12.5 min, and the pre-run check sessions were logged at 11:36–11:41 (after the recorded 11:02 start). The 11:02 likely included prep. **Use the transcript span as the official "active time"** for all runs (objective and consistent).
2. **"Files read" undercounts:** the stock chef read files mostly through Bash (`cat`/`grep`), not the Read tool, so "2 files read" isn't comparable across chefs. Use **tool calls** and **tokens** as the main effort metrics.
3. Five small pre-run sessions (11:36–11:41) were excluded; only the run session `0700a1e4…` was counted.
4. `claude-monitor` is an external terminal tool (not a Claude Code plugin; `/plugin` was empty), so it doesn't affect the chef. Its numbers are estimates and secondary only.
