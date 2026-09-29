# F1 — Answer sheet (use for EVERY run)

When the agent asks a question, answer ONLY from this sheet, copying the wording.
If the question is not covered, reply exactly: "Your call, use your best judgement." and log the question in the run card.
Count every reply you type as one human intervention (approvals of tool permissions count separately).

| If it asks about... | Reply |
|---|---|
| Approving its plan / "shall I proceed?" | "Yes, proceed." |
| Max length / how to count characters | "500 characters after trimming, counted as Unicode characters." |
| Empty or whitespace-only content | "Reject with 400." |
| isImportant default / type | "Optional, defaults to false, must be a boolean if present." |
| Status codes | "201 for create, 200 for list, 400 invalid input, 404 room not found." |
| Ordering | "Newest first." |
| Pagination / limits on GET | "No pagination. Return all notes." |
| Editing or deleting notes | "Out of scope." |
| Author / agent identity on a note | "Out of scope, there is no auth yet." |
| Realtime (onSnapshot) vs fetching via the Go API | "Your call, use your best judgement." |
| Where the tabs go / UI placement | "Inside the chat window of the selected room: tabs Chat (default) and Notes." |
| Colour of the important banner | "Yellow accent banner. Use the design system if it defines a warning/yellow colour." |
| Should I write tests? | "Your call, use your best judgement." |
| Should I commit? / branch? | "Your call, use your best judgement." |
| Should I install a dependency? | "Your call, use your best judgement." |
| Firestore indexes / security rules | "Out of scope." |
| Can I run the app / start the servers? | "Yes." |
