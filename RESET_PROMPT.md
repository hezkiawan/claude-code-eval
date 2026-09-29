# Task: Reset the mini-kouventa evaluation repo to a clean, reproducible base

You are resetting a GitHub repository that is used as a test bed for evaluating Claude Code plugins (Everything Claude Code "ECC", Graphify, and the Matt Pocock skills). Earlier pilot tests left the repo messy. Your job is to archive all old work safely, build one clean base commit, make it the new `main`, and tag it `eval-base-v2`.

Repository: https://github.com/hezkiawan/claude-code-evaluation-demo

Read this whole file before doing anything. Follow the steps in order. Do not skip verification steps.

---

## Ground rules (read carefully)

1. **Never lose history.** Every old branch must be archived as a git tag AND those tags must be confirmed on GitHub before anything is deleted or force-pushed.
2. **Stop and ask me before any destructive remote action.** There are exactly two checkpoints marked `⛔ CHECKPOINT` below. At each one, show me what you are about to do and wait for my explicit "yes".
3. **If anything does not match what this file expects** (a commit hash, a branch name, a file list, a failing command), STOP, explain what you found, and ask me. Do not improvise a workaround.
4. **Do not add any permission rules** (`permissions.allow`, `permissions.deny`, etc.) anywhere. The goal is a repo with NO `.claude/settings.json` at all.
5. **Do not install, enable, or configure any plugin, skill, hook, or MCP server** in this repo. The base must be plain, stock-neutral.
6. **Do not touch `~/.claude/` or any global config** except in Part B, and only in the way Part B describes.
7. Work only inside the folder where you were launched (called WORKSPACE below). Detect the OS first; if it is Windows, use Git Bash–compatible commands or PowerShell equivalents, and tell me which you are using.
8. Use my existing git credentials. If a push fails because of authentication, stop and tell me.
9. At the end, give me the final report described in Part C.

---

## Background: what the repo looks like now (expected state)

Commit graph (short hashes):

```
9cdbdfd  Add frontend design system rules and brand reference assets
0a790d4  chore: initial repository setup with security rules, design rules, and secret templates
5809b00  set up basely dummy app              <- LAST CLEAN COMMIT (our new base)
 ├─ main -> 787834e "disable deny permissions"   (committed frontend/coverage/ junk + commented-out settings.json)
 ├─ 4d56dc8 "add new assing feature using stock claude code"
 │    ├─ test/baseline -> 78061d1
 │    │    └─ temp/notes-stock -> 7472e95
 │    └─ eval/graphify -> b28bcfd
 └─ eval/everything-claude-code -> d5058e9
      └─ temp/notes-ecc -> 79f3b59
```

Remote branches expected: `main`, `test/baseline`, `eval/graphify`, `eval/everything-claude-code`, `temp/notes-stock`, `temp/notes-ecc`.

Why we reset: the pilot runs were contaminated (a Graphify cache file appears on the "stock" branch, so Graphify was active globally), features were built on different foundations, `main` contains committed coverage output, and there was no test harness, so configurations did not start equal.

---

## Part A — Repository reset

### A1. Clone fresh

```bash
cd <WORKSPACE>
git clone https://github.com/hezkiawan/claude-code-evaluation-demo.git mini-kouventa
cd mini-kouventa
git fetch --all --tags
git branch -r
git log --all --oneline --graph --decorate | head -40
```

**Verify:** the 6 remote branches listed above exist, and commit `5809b00` exists with message "set up basely dummy app" (`git log -1 --format=%s 5809b00`). If not, STOP.

### A2. Archive every old branch as a tag

Create one annotated tag per remote branch, named `pilot/<branch with / replaced by ->`:

| Remote branch | Tag name |
|---|---|
| origin/main | pilot/main |
| origin/test/baseline | pilot/test-baseline |
| origin/eval/graphify | pilot/eval-graphify |
| origin/eval/everything-claude-code | pilot/eval-everything-claude-code |
| origin/temp/notes-stock | pilot/temp-notes-stock |
| origin/temp/notes-ecc | pilot/temp-notes-ecc |

```bash
for b in main test/baseline eval/graphify eval/everything-claude-code temp/notes-stock temp/notes-ecc; do
  git tag -a "pilot/${b//\//-}" "origin/$b" -m "Archived pilot-v1 branch $b before eval-base-v2 reset"
done
git push origin --tags
git ls-remote --tags origin "pilot/*"
```

**Verify:** `git ls-remote` shows all 6 `pilot/*` tags on GitHub, and each points to the same commit as its branch (compare `git rev-parse origin/<branch>` with `git rev-parse pilot/<name>^{commit}`). Show me this comparison as a table. If any is missing or different, STOP.

### A3. Create the new base branch from the clean commit

```bash
git switch -c base-v2 5809b00
```

### A4. Build the setup commit

Make exactly these changes and nothing else.

**A4.1 — Delete `.claude/settings.json` entirely.**
```bash
git rm .claude/settings.json
```
Keep `.claude/rules/frontend-design-system.md` (it is project content, not configuration). Keep `frontend-design-reference/`.

**A4.2 — Append to the end of `.gitignore`:**
```gitignore

# ==========================================
# TEST & TOOL OUTPUT (evaluation)
# ==========================================
coverage/
graphify-out/
```
(The file already contains a line `graphify-out/cost.json`; leave it, it is harmless.)

**A4.3 — Add a frontend test harness** (so every configuration starts with the same test tooling):
```bash
cd frontend
npm ci
npm i -D vitest@^3 @vitest/coverage-v8@^3 jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
npm pkg set scripts.test="vitest run"
```

Create `frontend/vitest.config.mts` with exactly:
```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig uses "jsx": "preserve" for Next.js; tests need the runtime transform.
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
```

Create `frontend/vitest.setup.ts` with exactly:
```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library can't register cleanup itself.
afterEach(() => cleanup());
```

Create `frontend/__tests__/smoke.test.tsx` with exactly:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusBadge from "@/components/StatusBadge";

// Smoke test: proves the test harness works. Not part of any evaluation.
describe("test harness", () => {
  it("renders a component", () => {
    render(<StatusBadge status="assigned" />);
    expect(screen.getByText("assigned")).toBeInTheDocument();
  });
});
```

Then return to the repo root: `cd ..`

Do NOT add any backend test files. Go's built-in `go test` is enough.

**A4.4 — Create `CLAUDE.md` at the repo root** with exactly:
```markdown
# Mini-Kouventa

Simplified omnichannel customer-support inbox (evaluation testbed).

## Stack
- backend/: Go (net/http), Firestore via Firebase Admin SDK. Entry: backend/main.go, handlers in backend/handlers/.
- frontend/: Next.js 14 (App Router), React 18, TypeScript, Tailwind.

## Commands
- Backend: `cd backend && go run .` · tests: `go test ./...`
- Frontend: `cd frontend && npm run dev` · tests: `npm test` · types: `npm run typecheck`

## Rules
- Frontend UI must follow .claude/rules/frontend-design-system.md.
- Do not commit secrets (.env files, serviceAccountKey.json).
```

**A4.5 — Review and commit.**
```bash
git add -A
git status
git diff --cached --stat
```
**Verify the staged changes are ONLY:**
- deleted: `.claude/settings.json`
- modified: `.gitignore`, `frontend/package.json`, `frontend/package-lock.json`
- new: `CLAUDE.md`, `frontend/vitest.config.mts`, `frontend/vitest.setup.ts`, `frontend/__tests__/smoke.test.tsx`

There must be NO `node_modules/`, `coverage/`, `.next/`, `graphify-out/`, `.env`, or `serviceAccountKey.json` staged. If anything else is staged, STOP and show me.

```bash
git commit -m "chore: evaluation base v2 (remove permissions, add test harness, neutral CLAUDE.md)"
```

### A5. Verify the base works

Run each and report pass/fail:
```bash
cd backend && go build ./... && go vet ./... && go test ./... ; cd ..
cd frontend && npm run typecheck && npm test && npm run build ; cd ..
```
Expected: Go builds and vets cleanly (`go test` may say "no test files", that is fine); typecheck passes; 1 test passes; Next build succeeds.

If the Next build fails only because Firebase env vars are missing, tell me, and do not change application code to work around it. If anything else fails, STOP and show me the error.

Also confirm there is no `.claude/settings.json` and no `.claude/settings.local.json`:
```bash
ls -la .claude
```

### A6. ⛔ CHECKPOINT 1 — replace `main`

Show me:
- `git log --oneline -5 base-v2`
- the list of `pilot/*` tags confirmed on GitHub (from A2)
- the exact commands below

Then WAIT for my "yes". After I confirm:
```bash
git tag -a eval-base-v2 -m "Clean evaluation base v2: stock app + test harness, no permissions, no plugins"
git push origin eval-base-v2
git push --force-with-lease=main:origin/main origin base-v2:main
```
If GitHub rejects the force push (protected branch), STOP and tell me to allow force pushes in GitHub → Settings → Branches.

Then make local `main` match:
```bash
git fetch origin
git switch main
git reset --hard origin/main
git branch -D base-v2
```
**Verify:** `git rev-parse main`, `git rev-parse origin/main`, and `git rev-parse eval-base-v2^{commit}` are all identical.

### A7. ⛔ CHECKPOINT 2 — delete old remote branches

Show me the command below and WAIT for my "yes". Re-confirm the 6 `pilot/*` tags exist on the remote first.
```bash
git push origin --delete test/baseline eval/graphify eval/everything-claude-code temp/notes-stock temp/notes-ecc
git fetch --prune
git branch -a
git tag -l
```
**Expected final state:** branches `main` + `origin/main` only; tags: `eval-base-v2` and the 6 `pilot/*` tags.

### A8. Final clean-clone test

In a separate temp folder inside WORKSPACE, clone the repo again, check out `eval-base-v2`, run `cd frontend && npm ci && npm test`, confirm it passes, then delete that temp clone.

---

## Part B — Audit global Claude Code config (REPORT ONLY + backup)

The pilot showed global installs leaking into "stock" runs. Do NOT uninstall or delete anything in this part. Only back up and report.

1. Back up: copy `~/.claude` to `~/claude-backup-<today's date>` (if that folder already exists, add a suffix). Confirm the copy succeeded.
2. Report, as a table, everything found in:
   - `~/.claude/skills/` (each skill folder name; mark which look like Graphify, ECC, or Matt Pocock skills)
   - `~/.claude/agents/`, `~/.claude/commands/`, `~/.claude/rules/`
   - `~/.claude/settings.json`: the `hooks`, `enabledPlugins`, `extraKnownMarketplaces`, and `permissions` keys (show them)
   - `~/.claude/CLAUDE.md`: any section mentioning graphify, ECC, or plugins
   - `~/.claude/plugins/` (installed plugins, if the folder exists)
   - `~/.claude.json`: MCP server names only (do not print tokens or secrets)
   - Whether a `graphify` CLI is on PATH (`graphify --version`) and whether `ecc` is on PATH
3. Recommend exactly what I should remove or move to make my global setup stock, and which items I should do myself via `/plugin` inside Claude Code. Do NOT perform any of it.

Never print the contents of credential files (`.credentials.json`, tokens, API keys).

---

## Part C — Final report

End with a short report containing:
1. Final branch and tag list (local + remote).
2. The `eval-base-v2` commit hash and its full file-change list vs `5809b00`.
3. Verification results from A5 and A8 (pass/fail each).
4. The Part B global-config audit table and your removal recommendations.
5. Anything that did not go as expected.