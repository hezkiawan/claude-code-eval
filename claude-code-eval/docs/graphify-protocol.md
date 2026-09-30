# Graphify test (Q3): protocol

**Question:** Does Graphify make Claude Code answer codebase questions **cheaper, faster or more accurately** on a realistic repo?
**Design:** 3 questions × 2 conditions = **6 short runs** (read-only questions, no code changes), plus a build/maintenance check.
Time needed: ~1–1.5 h. Usage: small (questions only).

| Condition | Setup |
|---|---|
| **G0 stock** | Clean memos clone, plain Claude Code |
| **G1 Graphify** | Separate clean memos clone + code-only graph + `graphify claude install` (adds a `## graphify` section to `CLAUDE.md` and two PreToolUse hooks that nudge Claude to use `graphify query` before searching/reading). Default soft nudge (not `--strict`) |

Same as the main runs: Opus 5.5, medium effort, auto mode. Questions and keys: `prompts/G-queries.md` (keep outside the clones).

---

## Part 1: Set up (once, ~15 min)

In `eval-workspace` (PowerShell):
```powershell
mkdir graphify-test; cd graphify-test
git clone https://github.com/usememos/memos.git memos-G0
git clone https://github.com/usememos/memos.git memos-G1
cd memos-G0; git checkout a80576a; cd ..
cd memos-G1; git checkout a80576a; cd ..
graphify --version        # expect 0.9.67 (installed earlier); otherwise: uv tool install graphifyy==0.9.67
```

**Build the graph (G1 only), and time it:**
```powershell
cd memos-G1
Measure-Command { graphify update . | Out-Default }
Get-ChildItem graphify-out | Select-Object Name, Length
```
Record: build time, node/edge counts (printed at the end), size of `graphify-out` (reference in our sandbox: 37 s, 13,142 nodes, 56,194 edges, 48 MB).
This is a **code-only** build: tree-sitter, no LLM, no usage cost.

**Connect it to Claude Code (G1 only):**
```powershell
graphify claude install
Get-Content CLAUDE.md
Get-Content .claude\settings.json
```
Check: `CLAUDE.md` has a `## graphify` section; `.claude/settings.json` has two `PreToolUse` hooks calling `graphify hook-guard`.
Do **not** run `graphify hook install` (git hooks aren't needed for a read-only test).

**Check G0 is clean:** `memos-G0` must have **no** `graphify-out/`, no `## graphify` in any `CLAUDE.md`, no `.claude/settings.json` hooks.

---

## Part 2: The 6 runs (~5–10 min each)

Order (alternate conditions): **GQ1-G0 → GQ1-G1 → GQ2-G0 → GQ2-G1 → GQ3-G0 → GQ3-G1**

For each run:
1. `cd memos-G0` (or `memos-G1`), then `claude`.
2. `/model` → Opus 5.5, medium. G1 only: `/hooks` shows the two graphify hooks. Shift+Tab → auto mode.
3. Paste the question (text between `---8<---` in `G-queries.md`). Note the start time.
4. Don't type anything else. If it asks a question: `Your call, use your best judgement.` (+1 intervention). Permission prompts: plain Yes (tally).
5. When it answers: **copy its full answer** into `claude-code-eval/runs/<RUN-ID>/answer.md`, then `/exit`.
   Run IDs: `GQ1-G0`, `GQ1-G1`, `GQ2-G0`, …
6. Transcript counter (one session per run; pick the newest file in the matching project folder):
   ```powershell
   $f = Get-ChildItem "$HOME\.claude\projects" -Recurse -Filter *.jsonl | Where-Object { $_.DirectoryName -like "*memos-G1*" } | Sort-Object LastWriteTime | Select-Object -Last 1
   node ..\..\claude-code-eval\tools\transcript-stats.mjs $f.FullName
   ```
   (Use `*memos-G0*` for G0 runs.) Save the output next to the answer. It now also prints **"Graphify commands run"**.
7. **Use a fresh session for every question** (`/exit` and `claude` again) so no run benefits from the previous one.

No scoring during the runs: send me the six answers and counter outputs, and I'll score them against the keys.

---

## Part 3: Maintenance check (G1, ~5 min)

1. Make a trivial change and time an incremental update:
   ```powershell
   Add-Content server\api\v1\memo_service.go "`n// graphify update test"
   Measure-Command { graphify update . | Out-Default }
   git checkout server\api\v1\memo_service.go
   ```
2. Note: would the team commit `graphify-out/` (48 MB, `graph.json` ~26 MB) or rebuild locally? (README recommends committing it plus `graphify hook install` for auto-rebuilds.)

---

## What we'll report
| Metric | GQ1 G0 / G1 | GQ2 G0 / G1 | GQ3 G0 / G1 |
|---|---|---|---|
| Recall vs key | | | |
| Wrong claims | | | |
| Output tokens / cache read | | | |
| Tool calls / active time | | | |
| Graphify commands used | – / | – / | – / |

Plus: build time and size, update time, install friction, and qualitative notes (did Claude trust the graph? did the hook nudge it?).

## Known limits
- One repo, 3 questions, n = 1. Graphify's docs/PDF (LLM) extraction is not tested (code-only by design).
- Default hook mode only; `--strict` not tested (optional extra run if time allows: GQ3 with `GRAPHIFY_HOOK_STRICT=1`).
