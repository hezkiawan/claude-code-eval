# Run Protocol: how each chef cooks

> Applies to every recorded run (F1 and F2 × C0, C1, C2; C3 added later).
> 1 run per chef per task, 8 runs total. Results are a **controlled case study (n=1)**, not a statistical benchmark.
> This file supersedes the "Entry points" table in `prompts/F1-notes-spec.md`.

---

## A. Rules for every run (all chefs)

1. **Start point:** C0 runs from `eval-base-v2`, C1 from `base-C1`, C2 from `base-C2`. Never from another run.
2. **Same settings:** model **Opus 5.5**, effort **medium**, permission mode **auto mode** for every chef. Record any action auto mode blocks.
3. **Each chef follows its own documented workflow** (sections C–E). Steps the workflow says to *type*, we type. Things a tool claims happen *automatically*, we never trigger. We observe whether they happen.
4. **Questions:** answer only from the task's answer sheet (`prompts/F1-answer-sheet.md` / `F2-answer-sheet.md`). Anything not covered: *"Your call, use your best judgement."*
5. **No helping:** no hints, no fixing code, no pointing out bugs. The only typed messages allowed are the workflow steps below and answer-sheet replies.
6. **Count interventions:** every message you type after the entry prompt(s) = 1 intervention. Workflow commands (e.g. `/to-spec`) are **not** counted as interventions, but are listed in the run card.
7. **End of run:** the run ends when the chef's workflow is finished and it says it's done. Don't ask for extra work.
8. **Multi-session runs** (C1): cost = sum of all sessions. Use `transcript-stats.mjs` with **all** `.jsonl` files created during the run.
9. **Usage limit hit mid-run:** stop, wait for the reset, continue with `claude --continue`. Record "interrupted by limit" and **subtract the waiting time** from wall time.
10. **Protocol problem = shakedown:** if a run breaks because of *our* protocol (not the chef), discard it, fix this document (note the change at the bottom), and rerun.

---

## B. Before every run (checklist)

Run inside `eval-workspace\mini-kouventa`:

```powershell
git worktree add ../runs/<RUN-ID> -b run/<RUN-ID> <START-TAG>
```
Then inside `runs\<RUN-ID>`:
- [ ] Copy `backend\serviceAccountKey.json` and `frontend\.env.local` in
- [ ] `cd frontend; npm ci; cd ..`
- [ ] **C2 only:** clear ECC's global memory:
  ```powershell
  Remove-Item -Recurse -Force "$HOME\.claude\session-data","$HOME\.claude\skills\learned","$HOME\.local\share\ecc-homunculus","$HOME\.gateguard" -ErrorAction SilentlyContinue
  ```
- [ ] Create `claude-code-eval\runs\<RUN-ID>\runcard.md` from the template
- [ ] `claude` → check `/model` (Opus 5.5, medium), `/plugin`, `/hooks` match the chef → switch to auto mode
- [ ] Note **usage % before** and the **start time**

---

## C. C0: Stock Claude Code

| Step | You type |
|---|---|
| 1 | The frozen prompt (text between the `---8<---` lines of the task spec) |
| 2 | Answer-sheet replies only, until it says it's done |

One session.

---

## D. C1: Matt Pocock workflow (Helios doc, Path B: standard feature)

Tracker = **local markdown** (issues are files under `.scratch/`).

| Session | You type | Notes |
|---|---|---|
| **1: Plan** | `/grill-with-docs ` + the frozen prompt | Answer every grilling question from the answer sheet. Grilling may ask many questions; that's expected and measured. |
| | `/to-spec` | When grilling is finished. Writes the spec to the tracker. |
| | `/to-tickets` | Slices the spec into tickets. **Write the ticket list in the run card.** |
| | `/clear` | Ends session 1 (the Helios doc's context hygiene) |
| **2…n: Implement** | `/implement <ticket>` | One ticket per session, **in the order `/to-tickets` gave**. Use the ticket reference it printed (a file path under `.scratch/`). `/implement` runs `/tdd` and `/code-review` itself. |
| | `/clear` | After each ticket |

- Skip optional paths (`/prototype`, `/wayfinder`, `/handoff`): the Helios doc marks them as optional or for other scenarios.
- If `/implement` asks to confirm test seams: *"Your call, use your best judgement."*

---

## E. C2: ECC workflow (ECC README, "Building a feature")

| Step | You type | Notes |
|---|---|---|
| 1 | `/ecc:plan ` + the frozen prompt | ECC restates, lists risks, proposes a plan, then waits |
| 2 | Answer questions from the answer sheet. When it asks for confirmation: **"Yes, proceed. Implement it using the tdd-workflow skill."** | This is ECC's documented next step (`tdd-workflow`). Counted as workflow, not an intervention. |
| 3 | When it says implementation is done: `/ecc:code-review` | ECC's documented review step. Record what it reviewed. It only looks at *uncommitted* changes. |
| 4 | If the review reports CRITICAL or HIGH issues: **"Fix the CRITICAL and HIGH issues."** (once) | Counted as 1 intervention. Don't loop. |

One session (ECC's hooks and memory run on their own; don't trigger `/save-session` etc.).

---

## F. After every run

1. `/usage` → screenshot, note **usage % after** and the **end time**, then `/exit`.
2. Find the run's transcript(s): the `.jsonl` files in `$HOME\.claude\projects\<folder>\` created during the run.
   ```powershell
   node ..\..\claude-code-eval\tools\transcript-stats.mjs "<file1.jsonl>" "<file2.jsonl>" ...
   ```
   Record: tool calls, skills invoked, subagents launched, files read/written, tokens.
3. **Correctness:** start the run's backend (`cd backend; go run .`), then:
   - F1: `node ..\..\claude-code-eval\acceptance\f1-notes-acceptance.mjs`
   - F2: `node ..\..\claude-code-eval\acceptance\f2-claim-acceptance.mjs --key backend\serviceAccountKey.json`
4. **UI checklist:** start the frontend (`cd frontend; npm run dev`) and go through `F1-ui-checklist.md` / `F2-ui-checklist.md`. Take screenshots.
5. **Tests:** did the chef write tests? Run them: `cd backend; go test ./...` and `cd frontend; npm test`. Record pass/fail.
6. Fill in the run card and add a row to `results.csv`.
7. Save the dish (from the run folder):
   ```powershell
   git add -A
   git commit -m "run <RUN-ID>"
   git push -u origin run/<RUN-ID>
   ```
   Check first that `git status` does **not** list `serviceAccountKey.json` or `.env.local` (they're gitignored).
8. Rubric scoring can be batched after all runs (`rubric.md`).

---

## G. Run order

Alternate chefs, F1 before F2:

| # | Run ID | Start tag |
|---|---|---|
| 1 | F1-C0 | `eval-base-v2` |
| 2 | F1-C1 | `base-C1` |
| 3 | F1-C2 | `base-C2` |
| 4 | F2-C0 | `eval-base-v2` |
| 5 | F2-C1 | `base-C1` |
| 6 | F2-C2 | `base-C2` |
| 7 | F1-C3 | `base-C3` (defined after runs 1–6 + Q2 part tests) |
| 8 | F2-C3 | `base-C3` |

Pro-plan pacing: about 2 runs per 5-hour window. Do scoring and Graphify prep while waiting.

---

## Change log
- v1 (2026-09-30): initial protocol.
