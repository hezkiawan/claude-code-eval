# F2 — Answer sheet (use for EVERY run)

Answer ONLY from this sheet, copying the wording. Not covered -> reply exactly:
"Your call, use your best judgement." and log the question in the run card.
Count every reply you type as one human intervention.

| If it asks about... | Reply |
|---|---|
| Approving its plan / "shall I proceed?" | "Yes, proceed." |
| Which rooms are "unassigned" / can bot rooms be claimed? | "Rooms with status idle or bot are unassigned and can be claimed." |
| Status codes for failures | "Your call, use your best judgement." |
| Claiming an already-assigned room, even by the same agent | "It must fail." |
| agentName validation | "Required, not blank after trimming, max 100 characters." |
| Field names for agent / claim time / breach | "Your call, use your best judgement." |
| Exactly 5 minutes: breached or not? | "Breached only when waiting time is more than 5 minutes." |
| Should the breach be computed on the server or client? | "The recorded breach on the room must be decided by the backend. The badge on unassigned rooms is shown by the frontend." |
| How the badge should update (polling, timer, realtime) | "Your call, use your best judgement." |
| Unclaiming / releasing / transferring rooms | "Out of scope." |
| Auth / real agent identity | "Out of scope, use the hardcoded Agent Demo." |
| Showing the waiting time on tiles | "Your call, use your best judgement." |
| Existing rooms without the new fields | "They should keep working." |
| Should I write tests? / commit? / install a dependency? | "Your call, use your best judgement." |
| Can I run the app / start the servers? | "Yes." |
| Firestore indexes / security rules | "Out of scope." |
