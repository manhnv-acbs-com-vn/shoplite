#!/usr/bin/env node
// PostToolUse (matcher: Bash) - ghi lại mọi lệnh Bash agent đã chạy
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(await readStdin());
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const logDir = path.join(projectDir, ".claude", "logs");

mkdirSync(logDir, { recursive: true });
appendFileSync(
  path.join(logDir, "bash-history.log"),
  `${new Date().toISOString()}\t${input.tool_input?.command}\n`,
);
// Ghi toàn bộ payload để xem Claude Code gửi gì cho hook
appendFileSync(path.join(logDir, "hook-payloads.jsonl"), JSON.stringify(input) + "\n");

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
