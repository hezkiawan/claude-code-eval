# F1 — Internal Room Notes (frozen prompt)

Version: v1 (frozen 2026-09-29). Do not edit after the first recorded run.
Paste ONLY the text between the two `---8<---` lines into Claude Code.
The entry command before it depends on the configuration (see "Entry points" below).

---8<---
Implement an Internal Room Notes feature in Mini-Kouventa. Internal notes let support agents leave private notes on a conversation (room). Customers never see them.

Backend (Go):
- Add POST /api/rooms/{id}/notes and GET /api/rooms/{id}/notes.
- Store notes in Firestore in the subcollection rooms/{roomId}/notes.
- A note has: id, content (string), isImportant (boolean), createdAt (server-set timestamp).
- POST body: {"content": string, "isImportant"?: boolean}.
  - content is required. Trim surrounding whitespace first. After trimming it must be 1 to 500 characters, counted as Unicode characters (an emoji counts as 1).
  - isImportant is optional and defaults to false. If present it must be a boolean.
  - Success returns 201 with the created note as JSON.
- GET returns 200 with a JSON array of the room's notes, newest first (empty array if none).
- If the room does not exist, both endpoints return 404.
- Invalid input returns 400. All errors use the existing JSON error format {"error": "<message>"}.

Frontend (Next.js):
- In the chat window of the selected room, add two tabs: "Chat" (the existing message view, selected by default) and "Notes".
- The Notes tab lists the room's notes, newest first, each showing its content and time.
- Notes with isImportant = true are highlighted with a yellow accent banner.
- Below the list, an inline form: a text input, an "Important" checkbox, and a submit button. After a successful submit the new note appears in the list without reloading the page and the input clears.
- Show the backend's error message if a submit fails.
- Follow the project's frontend design system rules.
---8<---

## Entry points per configuration
| Config | How to start |
|---|---|
| C0 stock | Paste the prompt as-is. |
| C1 Matt Pocock | Start with the MP entry skill you documented in the Helios workflow doc (e.g. `/grill-with-docs`), then paste the prompt. Follow the MP flow to the end. |
| C2 ECC | `/ecc:plan ` followed by the prompt. When the plan is approved, continue with the ECC flow it proposes (e.g. tdd-workflow). |
| C3 MP + ECC picks | Same as C1; the ECC picks act through hooks/skills. |

## Deliberately NOT in the prompt
- Tests. Whether the configuration writes tests on its own is a measured behaviour.
- Commit instructions. Whether it commits, and how, is observed.
