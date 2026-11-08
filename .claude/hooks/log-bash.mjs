#!/usr/bin/env node
// PostToolUse (matcher: Bash) - ghi lại mọi lệnh Bash agent đã chạy
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(await readStdin());
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const logDir = path.join(projectDir, ".claude", "logs");

mkdirSync(logDir, { recursive: true });
const cmd = input.tool_input?.command || input.toolCall?.args?.CommandLine || "";
appendFileSync(
  path.join(logDir, "bash-history.log"),
  `${new Date().toISOString()}\t${cmd}\n`,
);
appendFileSync(path.join(logDir, "hook-payloads.jsonl"), JSON.stringify(input) + "\n");

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
