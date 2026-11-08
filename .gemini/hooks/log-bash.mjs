#!/usr/bin/env node
// Hook: PostToolUse (matcher: Bash|run_command)
// Ghi lại mọi lệnh terminal mà agent đã chạy vào .gemini/logs/bash-history.log
// Mục đích: "hello world" của hook - xem dữ liệu agent gửi vào hook qua stdin.

import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(await readStdin());
const projectDir = process.env.GEMINI_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const logDir = path.join(projectDir, ".gemini", "logs");

mkdirSync(logDir, { recursive: true });
const command = input.tool_input?.command ?? input.tool_input?.CommandLine ?? "unknown";

appendFileSync(
  path.join(logDir, "bash-history.log"),
  `${new Date().toISOString()}\t${command}\n`,
);
// Ghi toàn bộ payload (dạng JSON Lines) để sinh viên xem cấu trúc dữ liệu
appendFileSync(path.join(logDir, "hook-payloads.jsonl"), JSON.stringify(input) + "\n");

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}

