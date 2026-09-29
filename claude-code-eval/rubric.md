# Code-quality rubric (blind scoring)

How to score: open a FRESH Claude Code session outside the run folder (stock, no plugins). Give it the diff only
(`git diff eval-base-v2..run/<RUN-ID> > diff.patch`, strip anything that names the configuration, e.g. .claude/ files, plan docs mentioning ECC/Pocock)
plus this rubric, and ask it to score each item 0–2 with one sentence of justification. You review and may override (note overrides).

| # | Criterion | 0 | 1 | 2 |
|---|---|---|---|---|
| R1 | Automated tests for the new behaviour | none | some (happy path only) | backend validation + frontend behaviour covered |
| R2 | Tests pass | fail / don't run | pass with warnings | all pass |
| R3 | Spec fidelity (beyond acceptance script) | major deviations | minor | exact |
| R4 | Backend error handling & validation | missing | partial | complete, consistent with existing code |
| R5 | Fits existing code structure and conventions | foreign style | mostly | indistinguishable from existing code |
| R6 | Design-system adherence (frontend) | ignored | partial | follows rules file |
| R7 | Accessibility (labels, button semantics, focus) | poor | partial | good |
| R8 | Security (input bounds, no secrets, safe rendering) | issues | minor | clean |
| R9 | Scope discipline (no unrequested features/refactors) | large creep | small | none |
| R10 | Commit hygiene (if committed) | one blob / none | some structure | small, meaningful commits |

Total: __ / 20
