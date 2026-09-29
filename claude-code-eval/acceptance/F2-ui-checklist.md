# F2 — UI acceptance checklist (manual, ~5 min per run)

Setup: start backend + frontend from the run folder. Seed two rooms:
  node acceptance/seed-room.mjs --key <serviceAccountKey.json> --minutes 6 --name "Old customer"
  node acceptance/seed-room.mjs --key <serviceAccountKey.json> --minutes 4.5 --name "Almost late"
Keep the browser console (F12) open. Score 1 = pass, 0 = fail. Screenshot the Idle tab and the Assigned tab.

| # | Check | Score |
|---|---|---|
| U1 | Idle tab: unassigned tiles show a "Claim" button; clicking the tile body still opens the chat | |
| U2 | "Old customer" shows a red "SLA breached" badge immediately | |
| U3 | "Almost late" gets the badge by itself within ~1 min after it passes 5 minutes, no refresh | |
| U4 | Clicking Claim moves the room to the Assigned tab showing "Agent Demo" | |
| U5 | Two tabs, same room: claim in tab 1, then claim in tab 2 (stale list) -> tab 2 shows an error, not success | |
| U6 | No React/HTML errors in the console (e.g. "<button> cannot be a descendant of <button>", hydration errors) | |
| U7 | Looks consistent with the design system (colours, radius, font) — judge against screenshot-1.png | |

UI score: __ / 7
