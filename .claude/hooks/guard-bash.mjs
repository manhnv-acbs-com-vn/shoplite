#!/usr/bin/env node
// PreToolUse (matcher: Bash / run_command) - chặn hoặc hỏi trước khi chạy lệnh nguy hiểm

const RULES = [
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    decision: "deny",
    reason: "🛡️ guard-bash: git reset --hard làm mất thay đổi chưa commit.",
  },
  {
    pattern:
      /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f*|-rf|-fr)\s+.*storage\b|\brm\s+.*-rf\b/,
    decision: "deny",
    reason: "🛡️ guard-bash: lệnh xóa cưỡng bức rm -rf có thể gây mất dữ liệu.",
  },
  {
    pattern: /\bgit\s+push(\s+.*)?\s+(main|master)\b/,
    decision: "deny",
    reason: "🛡️ guard-bash: không được push trực tiếp lên nhánh main/master.",
  },
  {
    pattern: /\bgit\s+restore\b/,
    decision: "ask",
    reason:
      "⚠️ guard-bash: git restore sẽ ghi đè các thay đổi của file. Bạn có chắc muốn tiếp tục?",
  },
];

const input = JSON.parse(await readStdin());
const command =
  input.tool_input?.command || input.toolCall?.args?.CommandLine || "";

if (!command) process.exit(0);

for (const rule of RULES) {
  if (rule.pattern.test(command)) {
    // Trả output tương thích cả Claude Code và Antigravity
    const output = {
      decision: rule.decision,
      reason: rule.reason,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: rule.decision,
        permissionDecisionReason: rule.reason,
      },
    };

    console.log(JSON.stringify(output));
    process.exit(0);
  }
}

// Lệnh an toàn: không in gì (hoặc trả allow với Antigravity)
if (input.toolCall) {
  console.log(JSON.stringify({ decision: "allow" }));
}
process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
