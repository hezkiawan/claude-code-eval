// Summarise a Claude Code session transcript (.jsonl): tool calls by name, files read, token usage.
// Usage:  node tools/transcript-stats.mjs <session.jsonl> [more.jsonl ...]
// Transcripts live in ~/.claude/projects/<folder-path-with-dashes>/<session-id>.jsonl
// (Windows: C:\Users\<you>\.claude\projects\...). Subagent transcripts, if any, sit in a
// "subagents" folder next to it — pass them too so their tool calls are counted.
// Usage numbers are per API call summed across the session; cross-check against /usage.
import fs from "node:fs";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: node tools/transcript-stats.mjs <session.jsonl> [...]"); process.exit(2); }

const tools = {};
const filesRead = new Set();
const filesWritten = new Set();
const seenMsg = new Set();
const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
let first = null, last = null;

for (const f of files) {
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.timestamp) { const t = Date.parse(e.timestamp); if (!first || t < first) first = t; if (!last || t > last) last = t; }
    const m = e.message;
    if (e.type !== "assistant" || !m) continue;
    if (m.usage && m.id && !seenMsg.has(m.id)) {
      seenMsg.add(m.id);
      usage.input += m.usage.input_tokens ?? 0;
      usage.output += m.usage.output_tokens ?? 0;
      usage.cacheRead += m.usage.cache_read_input_tokens ?? 0;
      usage.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
    }
    for (const c of Array.isArray(m.content) ? m.content : []) {
      if (c.type !== "tool_use") continue;
      tools[c.name] = (tools[c.name] ?? 0) + 1;
      const p = c.input?.file_path ?? c.input?.notebook_path;
      if (p && c.name === "Read") filesRead.add(p);
      if (p && ["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(c.name)) filesWritten.add(p);
    }
  }
}

const total = Object.values(tools).reduce((a, b) => a + b, 0);
console.log(`Tool calls: ${total}`);
for (const [n, c] of Object.entries(tools).sort((a, b) => b[1] - a[1])) console.log(`  ${n.padEnd(28)} ${c}`);
console.log(`Unique files read: ${filesRead.size}`);
console.log(`Unique files written/edited: ${filesWritten.size}`);
console.log(`Tokens — input: ${usage.input}, output: ${usage.output}, cache read: ${usage.cacheRead}, cache write: ${usage.cacheWrite}`);
if (first && last) console.log(`Transcript span: ${((last - first) / 60000).toFixed(1)} min`);
