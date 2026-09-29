# F2 — Room Claiming + SLA (frozen prompt)

Version: v1 (frozen 2026-09-29). Do not edit after the first recorded run.
Paste ONLY the text between the two `---8<---` lines into Claude Code.
Entry command per configuration: same as F1 (see prompts/F1-notes-spec.md, "Entry points").

---8<---
Implement room claiming (Kouventa "Agent Queue Management & Room Assignment").

Backend (Go):
- Add POST /api/rooms/{id}/claim with body {"agentName": string}.
- Only one agent can own a room: claiming a room that is already assigned or closed must fail, and a room must never end up claimed by two agents.
- Store the agent's name and the claim time on the room.
- SLA: a room waiting more than 5 minutes (measured from when the room was created) before being claimed has breached its SLA. Claiming a breached room is allowed, but record on the room that its SLA was breached.

Frontend (Next.js):
- In the sidebar, unassigned room tiles get a "Claim" button.
- Unassigned rooms waiting more than 5 minutes show a red "SLA breached" badge, which must appear without a page refresh.
- After a successful claim, the room moves to the Assigned tab and shows the agent's name.
- For now, the current agent is a hardcoded "Agent Demo".
- Follow the project's frontend design system rules.
---8<---

## Deliberately NOT in the prompt
- Tests, commits (observed, as in F1).
- The words "race condition", "concurrency", "transaction". Whether the configuration spots the
  double-claim risk on its own from "must never end up claimed by two agents" is the key observation.
