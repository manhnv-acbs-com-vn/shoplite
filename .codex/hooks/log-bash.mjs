#!/usr/bin/env node
// Codex PostToolUse (matcher: Bash) - ghi lại lệnh Bash của agent.
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(await readStdin());
const projectDir = input.cwd ?? process.cwd();
const logDir = path.join(projectDir, ".codex", "logs");
mkdirSync(logDir, { recursive: true });
appendFileSync(
  path.join(logDir, "bash-history.log"),
  `${new Date().toISOString()}\t${input.tool_input?.command ?? ""}\n`,
);
appendFileSync(
  path.join(logDir, "hook-payloads.jsonl"),
  `${JSON.stringify(input)}\n`,
);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
