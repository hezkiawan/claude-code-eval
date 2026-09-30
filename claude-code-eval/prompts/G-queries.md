# Graphify test (Q3): questions and answer keys

Repo: **usememos/memos** @ commit **`a80576a`** (2026-09-28). Go backend (~100k hand-written lines), React/TypeScript
frontend, PostgreSQL/MySQL/SQLite stores. ~1,260 code files, about 10–20× mini-kouventa.
⚠️ Keep this file **outside** the memos clones: Claude must never see the answer keys.

Paste ONLY the text between the `---8<---` lines, one question per fresh session.

---

## GQ1: Trace a flow (frontend → backend → database)

---8<---
In this repository, trace what happens when a user creates a new memo from the web UI. List, in order, the frontend files and functions involved, the API call, the backend handler and helper functions, and the store/database functions that end up writing the memo. Give file paths. Do not modify any files.
---8<---

**Answer key (8 items; 1 point each):**
| # | Item |
|---|---|
| 1 | Frontend editor save: `web/src/components/MemoEditor/index.tsx` (`handleSave`) and/or `MemoEditor/hooks/useMemoSave.ts` |
| 2 | `web/src/components/MemoEditor/services/memoService.ts`, which calls `memoServiceClient.createMemo(...)` (Connect/gRPC-web client) |
| 3 | Backend handler `CreateMemo` in `server/api/v1/memo_service.go` |
| 4 | `prepareMemoCreate` in `server/api/v1/memo_create_helpers.go` |
| 5 | `createMemoWithMutation` in `server/api/v1/memo_attachment_service.go` |
| 6 | `Store.ApplyMemoMutation` in `store/memo_attachment.go` |
| 7 | Driver `DB.ApplyMemoMutation` in `store/db/{postgres,mysql,sqlite}/memo_attachment.go` (runs in a DB transaction) |
| 8 | Post-create side effects in `CreateMemo`: webhook (`DispatchMemoCreatedWebhook`), SSE (`SSEHub.publishMemoChanged`), mention notifications |

Acceptable alternatives: `web/src/hooks/useMemoQueries.ts` (also calls `createMemo`) counts for item 2.

---

## GQ2: Locate a rule (access control)

---8<---
Where does this codebase decide whether a user is allowed to read a memo (public, protected, private or space visibility)? List the files and functions involved, both for fetching a single memo and for listing memos. Do not modify any files.
---8<---

**Answer key (6 items):**
| # | Item |
|---|---|
| 1 | Central decision: `CheckMemoReadContext` (+ `MemoReadDecision`) in `core/access/memo.go` |
| 2 | `checkMemoReadAccess` + `buildMemoReadContext` / `buildMemoReadContextForViewer` in `server/api/v1/memo_access.go` |
| 3 | Single memo: `GetMemo` (`server/api/v1/memo_service.go`) calls `checkMemoReadAccess` |
| 4 | Listing: `resolveMemoAccessScope` / `newMemoAccessScope` (`memo_access.go`), used by `ListMemos` |
| 5 | `MemoAccessScope` (`AllowPublic`, `AllowProtected`, `UserID`) in `store/memo.go` |
| 6 | SQL-level filter per driver: `store/db/{postgres,mysql,sqlite}/memo_access.go` (e.g. `postgresMemoAccessPredicate`), which encodes PUBLIC / PROTECTED / PRIVATE (creator only) / SPACE (active member) |

---

## GQ3: Blast radius (what's affected by a change)

---8<---
If we change the signature of Store.ApplyMemoMutation (in store/memo_attachment.go), which functions in this codebase would need to be updated or re-tested? List every direct caller, and the API endpoints or features that reach it indirectly. Do not modify any files.
---8<---

**Answer key (9 items):**
| # | Item | Kind |
|---|---|---|
| 1 | `createMemoWithMutation` (`server/api/v1/memo_attachment_service.go`) | direct caller |
| 2 | `applyMemoMutation` (`server/api/v1/memo_attachment_service.go`) | direct caller |
| 3 | `Store.CreateMemoComment` (`store/memo.go`) | direct caller |
| 4 | `CreateMemo` (`memo_service.go`) | indirect (via 1) |
| 5 | `CreateMemoComment` API (`memo_service_comments.go`) | indirect (via 1) |
| 6 | `UpdateMemo` (`memo_service.go`) | indirect (via 2) |
| 7 | `SetMemoAttachments` (`memo_attachment_service.go`) | indirect (via 2) |
| 8 | `SetMemoRelations` (`memo_relation_service.go`) | indirect (via 2) |
| 9 | Memo import: `memoImporter.createMemo` / `replaceMemo` / `applyRelations` (`user_service_memo_import.go`) | indirect (via 1, 2) |

Bonus (not scored): the driver interface `store/driver.go` + 3 implementations are *callees*, not callers.

⚠️ Pre-finding (don't tell Claude): Graphify 0.9.67's graph has **no incoming call edges** to `Store.ApplyMemoMutation`,
because it misses Go method calls made through struct fields (`s.Store.ApplyMemoMutation(...)`). `graphify affected` returns
"No affected nodes found". GQ3 therefore tests whether Claude relies on the graph or verifies with search.

---

## Scoring (per run)
- **Recall** = key items correctly named ÷ total items (partial credit 0.5 if the right file but wrong/missing function).
- **Wrong claims** = files or functions named that don't exist, or are clearly not part of the answer.
- **Cost** = tokens (output, cache read), tool calls, active time (transcript counter).
- **Graph use** = `graphify` commands run (transcript counter), and whether the answer relied on them.
