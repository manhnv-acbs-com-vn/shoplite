#!/usr/bin/env node
// Codex UserPromptSubmit hook - chặn prompt có vẻ chứa secret.
import { execSync } from "node:child_process";

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /AKIA[0-9A-Z]{16}/,
  /(password|mat_?khau|secret)\s*[:=]\s*\S{6,}/i,
];

const input = JSON.parse(await readStdin());
const prompt = input.prompt ?? "";

if (SECRET_PATTERNS.some((pattern) => pattern.test(prompt))) {
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        "🔐 scan-prompt: prompt có vẻ chứa secret. Hãy xóa secret và dùng biến môi trường.",
    }),
  );
  process.exit(0);
}

let branch = "unknown";
try {
  branch = execSync("git branch --show-current", {
    cwd: input.cwd ?? process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `Nhánh git hiện tại: ${branch}. Nhớ chạy "npm run check" trước khi báo hoàn thành.`,
    },
  }),
);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
