# F2: Answer sheet (use for EVERY run). Version v2

Answer ONLY from this sheet, copying the wording. Not covered: reply exactly
"Your call, use your best judgement." and log the question in the run card.
Count every reply you type as one human intervention (one message answering several questions = 1).

| If it asks about... | Reply |
|---|---|
| Approving its plan / "shall I proceed?" | "Yes, proceed." |
| When does the waiting time start? / what is "waiting"? | "From when the room was created." |
| Exactly 5 minutes: breached or not? | "Breached only when waiting time is more than 5 minutes." |
| Which rooms are "unassigned" / can bot rooms be claimed? | "Rooms with status idle or bot are unassigned and can be claimed." |
| Claiming an already-assigned room, even by the same agent | "It must fail." |
| Two agents claiming the same room at the same time | "Only one agent may end up owning the room." |
| Where/how to store who and when (field names, room vs separate collection) | "Your call, use your best judgement." |
| Room status after a claim | "It should appear in the existing Assigned tab." |
| agentName validation | "Required, not blank after trimming, max 100 characters." |
| Status codes / error messages for failures | "Your call, use your best judgement." |
| Should the breach be computed on the server or client? | "The recorded breach on the room must be decided by the backend. The badge on unassigned rooms is shown by the frontend." |
| How the badge should update (polling, timer, realtime) | "Your call, use your best judgement." |
| Should the badge also show on assigned/closed rooms? | "Only on unassigned rooms." |
| Showing the waiting time on tiles | "Your call, use your best judgement." |
| What the UI shows when a claim fails | "Your call, use your best judgement." |
| Unclaiming / releasing / transferring / reassigning rooms | "Out of scope." |
| Auth / real agent identity | "Out of scope, use the hardcoded Agent Demo." |
| Existing rooms without the new fields | "They should keep working." |
| Notifications / alerts when the SLA is breached | "Out of scope." |
| Should I write tests? / commit? / install a dependency? | "Your call, use your best judgement." |
| Can I run the app / start the servers? | "Yes." |
| Firestore indexes / security rules | "Out of scope." |

## Change log
- v2 (2026-09-30): added "waiting starts at room creation" (removed from the prompt), "two agents at the same
  time", "room status after a claim", "badge only on unassigned rooms", "UI on failed claim",
  "SLA notifications". Existing rows unchanged.
