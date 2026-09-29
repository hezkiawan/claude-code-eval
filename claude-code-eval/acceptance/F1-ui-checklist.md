# F1 — UI acceptance checklist (manual, ~3 min per run)

Start backend + frontend from the run's folder. Create a fresh room (Header "new chat" or POST /api/rooms) and select it.
Score 1 = pass, 0 = fail. Take one screenshot of the Notes tab with 1 important + 1 normal note.

| # | Check | Score |
|---|---|---|
| U1 | Chat window shows "Chat" and "Notes" tabs; Chat is selected by default and still shows messages | |
| U2 | Notes tab lists existing notes newest first with content + time | |
| U3 | Important notes have a visible yellow accent banner; normal notes do not | |
| U4 | Submitting a note shows it immediately (no reload) and clears the input | |
| U5 | Submitting 501 characters shows the backend error message in the UI | |
| U6 | Switching to another room shows that room's notes, not the previous room's | |
| U7 | Looks consistent with the design system (colours, radius, font) — judge against screenshot-1.png | |

UI score: __ / 7
