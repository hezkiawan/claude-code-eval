Here is the path a new memo takes from the web editor to the database. I only read files; nothing was changed.

1. Frontend (React)

1. web/src/pages/Home.tsx:69: the home page renders the <MemoEditor> composer. Other places mount it too, such as MemoPanel/MemoPanelList.tsx:96 and contexts/GlobalMemoEditorContext.tsx.
2. web/src/components/MemoEditor/index.tsx
   - MemoEditorImpl builds handleSave = useMemoSave({...}) at line 333.
   - Two triggers call it: the editor's keyboard submit (<EditorContent onSubmit={handleSave}>, line 385) and the toolbar (onSave={handleSave}, line 414).
   - The toolbar's Save button is in Toolbar/EditorToolbar.tsx:89.
3. web/src/components/MemoEditor/hooks/useMemoSave.ts, the useMemoSave() callback:
   - validationServy caches (memoKeys.lists(), userKeys.stats(), attachmentKeys.lists()), resets the editor and calls markNewMemo().
4. web/src/components/MemoEditor/services/memoService.ts, memoService.save():
   - uploadService.uploadFiles(state.localFiles) (services/uploadService.ts:63) uploads any pending local files first, as Attachment API calls.
   - With no memoName and no parentMemoName, it takes the create branch. It builds a Memo with create(MemoSchema, {...}): content, visibility, attachment references (from
     toAttachmentRen, optionaltimestamps and space.
   - It then calls memoServiceClient.createMemo({ memo: memoData })
     (line 133).
5. web/src/connect.ts:
   - memoServiceClient = createClient(MemoService, transport) (line
     ~118).
   - The Connect transport targets window.location.origin.
   - authInterceptor adds Authorization: Bearer <token> and refreshes
     the token on 4

useCreateMemo() in web/src/hooks/useMemoQueries.ts:232 also wraps
createMemo, but not editor goes throughmemoService.save instead.

2. API call

- Connect RPC: POST /memos.api.v1.MemoService/CreateMemo, sendinreateMemoRequest
- It is defined in proto/api/v1/memo_service.proto:22. That file also maps it to REST as POST /api/v1/memos for gRPC-Gateway, but the web UI uses the Connect route.                                
3. Backend: routing and handler                                 
1. server/api/v1/v1.go:~231-235: builds the Connect interceptor chain, includingr), and callsconnectHandler.RegisterConnectHandlers(...).
2. server/api/v1/connect_handler.go:32: RegisterConnectHandlers mounts apiv1connopts...).
3. server/api/v1/connect_interceptors.go: the interceptors run in this order:
   - MetadataInterceptor
   - LoggingInterceptor                                             ecoveryInterc
   - AuthInterceptor.WrapUnary, which authenticates the bearer tokenreateMemo is _config.go, so itrequires a logged-in user.                                     ver/api/v1/coConnectServiceHandler.CreateMemo unwraps req.Msg and delegates to the gRPC-style handler.                                          ver/api/v1/mee.CreateMemo:
   - s.fetchCurrentUser(ctx) (auth_service_session.go:269) loads the user.                                                          .throttleAndCr, …)(ratelimit.go:150) applies the write rate limit.
   - ValidateAndGenerateUID(request.MemoId) (resource_name.go:177)  alidates or g
   - s.prepareMemoCreate(...) (step 6) validates and builds the memo.
   - s.createMemoWithMutation(...) (step 7) writes it. On failure,  apMemoCreateE15) mapsunique-constraint errors to AlreadyExists.
   - After the write, it builds the response and runs side effects: tore.ListAttaonvertMemoFromStore,DispatchMemoCreatedWebhook, SSEHub.publishMemoChanged() and dispatchMemoMentionNotificationsBestEffort.                    ver/api/v1/meareMemoCreate. Itwrites nothing; it only validates and prepares:
   - validateCreateMemoVisibility checks the visibility.
   - resolveSpaceForMemoPlacement resolves the target space, if one was given.
   - It rejects SPACE visibility when there is no space, and copies any custom create/update timestamps.
   - getContentLengthLimit enforces the maximum content length.
   - memopayload.RebuildMemoPayload(ctx, memo, s.MarkdownService) (core/memopayload/runner.go:74) parses the markdown and fills  he payload (ton was sent, it isadded to the payload.
   - prepareMemoAttachments, resolveMemoAttachmentReferences and    repareMemoRels and relations.
7. server/api/v1/memo_attachment_service.go:~156, createMemoWithMutation:                                          t builds the(buildMemoAttachmentMutationBindings) and the reference relations.                                                     t then calls ,&store.MemoMutation{ MemoCreate: memo, ... }).
                                                                    re and databa

1. store/memo_attachment.go:90, Store.ApplyMemoMutation (the facade)t checks the Create(store/memo.go:212), the write policy, and the attachment and relation rules.                                                t then calls .) through the Driver interface (store/driver.go:29).
2. Driver implementation (SQLite shown, in store/db/sqlite/memo_attachment.go:15). Everything runs in one BEGIN IMMEDIATE transaction:                                     validateSQLit
   b. validateSQLiteMemoCreate (store/db/sqlite/memo.go:71) checks  the actor and
   c. insertSQLiteMemo (store/db/sqlite/memo.go:34) writes the memo row: INSERT Intent, visibility,payload, space_id[, created_ts, updated_ts]) … RETURNING id, created_ts, updated_ts, row_status. The payload is serialized with protojso
   d. It re-reads the row as a conflict check (SELECT creator_id, content FROM memo WHERE id = ?).
   e. For each attachment binding it runs UPDATE attachment SET memo_id = ?, updated_ts = ? WHERE id = ?, then checks that
      every require
   f. replaceMemoReferenceRelations writes INSERT INTO memo_relation
      … for referen
   g. COMMIT.
3. MySQL and Postgre in asql.LevelSerializable transaction:
   - MySQL: store/d, which callsinsertMySQLMemo (store/db/mysql/memo.go:36).
   - PostgreSQL: store/db/postgres/memo_attachment.go:15, which calls
     insertPostgresgo:35).

Each driver also has a standalone DB.CreateMemo (for example store/db/sqlite/memo.go:16), but the API create path doesn't call it. It goes through ApplyMemoMutation, so the memo row, attachment links
and relations are w.

Summary chain

Home.tsx → MemoEdit→validationService.canSave
  → memoService.sav →memoServiceClient.createMemo (connect.ts)
  ⇒ POST /memos.api.v1.MemoService/CreateMemo
  → interceptors (Aer.CreateMemo →APIV1Service.CreateMemo
  → prepareMemoCreate (→ RebuildMemoPayload, prepareMemoAttachments, prepareMemoRelations)
  → createMemoWithMtion →driver.ApplyMemoMutation
  → insertSQLiteMemostgresMemo  (INSERTINTO memo) + attachment/relation writes → COMMIT
  ← convertMemoFrom notifications →response → React Query cache invalidation