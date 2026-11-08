#!/usr/bin/env node
// Codex PreToolUse (matcher: Bash) - chặn lệnh nguy hiểm.
const RULES = [
  {
    pattern: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i,
    reason: "Không dùng rm -rf.",
  },
  { pattern: /\bgit\s+push\b.*(--force|-f\b)/, reason: "Không force push." },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: "git reset --hard làm mất thay đổi chưa commit.",
  },
  {
    pattern: /--no-verify\b/,
    reason: "Không được bỏ qua git hooks (--no-verify).",
  },
  {
    pattern: /\bnpm\s+publish\b/,
    reason: "Dự án private, không publish lên npm.",
  },
  {
    pattern: /\bgit\s+checkout\s+--\s|\bgit\s+restore\b/,
    reason: "Lệnh này hủy thay đổi trong file.",
  },
];

const input = JSON.parse(await readStdin());
const command = input.tool_input?.command ?? "";
const matched = RULES.find((rule) => rule.pattern.test(command));
if (matched) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `🛡️ guard-bash: ${matched.reason}`,
      },
    }),
  );
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
