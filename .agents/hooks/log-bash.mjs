#!/usr/bin/env node
// PostToolUse (matcher: run_command|Bash) - ghi lại mọi lệnh shell/bash agent đã chạy
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(await readStdin());
const projectDir =
  input.workspacePaths?.[0] ??
  process.env.CLAUDE_PROJECT_DIR ??
  input.cwd ??
  process.cwd();

const logDir = path.join(projectDir, ".agents", "logs");
mkdirSync(logDir, { recursive: true });

const cmd =
  input.toolCall?.args?.CommandLine ||
  input.tool_input?.command ||
  "";

if (cmd) {
  appendFileSync(
    path.join(logDir, "bash-history.log"),
    `${new Date().toISOString()}\t${cmd}\n`,
  );
}

appendFileSync(path.join(logDir, "hook-payloads.jsonl"), JSON.stringify(input) + "\n");

// Antigravity PostToolUse contract yêu cầu JSON object rỗng
console.log("{}");

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
