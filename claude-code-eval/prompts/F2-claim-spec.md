# F2: Room Claiming + SLA (frozen prompt)

Version: **v2** (frozen 2026-09-30). Do not edit after the first recorded run.
Paste ONLY the text between the two `---8<---` lines into Claude Code.
Entry command per configuration: see `docs/run-protocol.md` (sections C–E).

---8<---
Agents can claim rooms from the queue (Kouventa "Agent Queue Management & Room Assignment")

Support agents see waiting rooms in the sidebar, but nobody can take ownership of a room yet, so the Assigned tab is always empty. We also can't see which customers have been waiting too long.

- An agent can claim an unassigned room. Once claimed, the room belongs to that agent: nobody else can claim it, and closed rooms can't be claimed.
- We need to know who claimed a room and when.
- SLA: customers shouldn't wait more than 5 minutes before an agent claims their room. Rooms that waited longer have breached the SLA. They can still be claimed, but the breach must be recorded.
- In the sidebar, unassigned rooms get a "Claim" button and a red "SLA breached" badge once they've waited over 5 minutes. The badge should appear live, without refreshing.
- After claiming, the room shows in the Assigned tab with the agent's name.
- There's no login yet: use "Agent Demo" as the current agent.

API contract (agreed with the frontend team): POST /api/rooms/{id}/claim with body {"agentName": string}.

Follow the project's frontend design system.
---8<---

## Why v2 (changed before any F2 run)
v1 read like a perfect engineering spec and hinted at the trap. v2 is written like a **realistic product ticket**:
business rules in plain language + the agreed API contract only. This lets F2 test whether planning
workflows (grilling, `/ecc:plan`) help more when the ticket is thinner. F1 remains the *well-specified* ticket.

| v1 | v2 |
|---|---|
| "a room must never end up claimed by two agents" (race hint) | removed; only the business rule "nobody else can claim it" |
| "measured from when the room was created" | moved to the answer sheet |
| "Store the agent's name and the claim time on the room" | "We need to know who claimed a room and when" |
| Backend / Frontend sections with technical detail | business requirements + API contract |

Caveat for the write-up: F2 is both *harder* and *less specified* than F1, so the two effects can't be fully separated.

## Deliberately NOT in the prompt
- Tests, commits (observed, as in F1).
- The words "race condition", "concurrency", "transaction", "simultaneous". Whether the chef realises
  that "nobody else can claim it" requires protection against two agents clicking at the same moment
  is the key observation.

## Checker compatibility (`acceptance/f2-claim-acceptance.mjs`, unchanged)
Every check follows from a stated rule:
- B1: claimed room is in the Assigned tab (existing tab = `status: "assigned"`), who + when recorded
- B2/B3/B11: "nobody else can claim it" (sequential and simultaneous)
- B4: "closed rooms can't be claimed"
- B5/B6/B7: invalid room / agent / body must not produce a claim
- B8/B9: SLA breach recorded when waiting > 5 minutes, not before
- B10: "shows in the Assigned tab"
