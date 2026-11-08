#!/usr/bin/env node
// Hook: PreToolUse (matcher: Bash|run_command)
// Chặn các lệnh nguy hiểm hoặc yêu cầu người dùng xác nhận bằng JSON output
// Tự động kích hoạt notify.mjs để bắn desktop notification (Cần bạn xác nhận / Cảnh báo)

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  {
    pattern: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i,
    decision: "deny",
    reason: "Không dùng rm -rf. Hãy xóa từng file cụ thể.",
  },
  {
    pattern: /\bgit\s+push\b/i,
    decision: "deny",
    reason: "Không tự ý git push lên origin khi chưa có xác nhận từ người dùng.",
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    decision: "deny",
    reason: "git reset --hard làm mất thay đổi chưa commit.",
  },
  {
    pattern: /--no-verify\b/,
    decision: "deny",
    reason: "Không được bỏ qua git hooks (--no-verify).",
  },
  {
    pattern: /\bnpm\s+publish\b/,
    decision: "deny",
    reason: "Dự án private, không publish lên npm.",
  },
  {
    pattern: /\bgit\s+checkout\s+--\s|\bgit\s+restore\b/,
    decision: "ask",
    reason: "Lệnh này hủy thay đổi trong file - cần người dùng xác nhận.",
  },
  {
    pattern: /\bnpm\s+(install|i|uninstall|remove|add)\b/,
    decision: "ask",
    reason: "Cài đặt hoặc gỡ gói thư viện làm thay đổi package.json - cần người dùng xác nhận.",
  },
  {
    pattern: /\bgit\s+commit\b/,
    decision: "ask",
    reason: "Tạo commit mới vào lịch sử Git - cần người dùng xác nhận.",
  },
];

const input = JSON.parse(await readStdin());
const command = input.tool_input?.command ?? input.tool_input?.CommandLine ?? "";

const matched = RULES.find((rule) => rule.pattern.test(command));
if (matched) {
  // Kích hoạt notification desktop để lập trình viên biết ngay
  triggerNotification(matched.decision, command, matched.reason);

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: matched.decision,
        permissionDecisionReason: `🛡️ guard-bash: ${matched.reason}`,
      },
    }),
  );
}

process.exit(0);

function triggerNotification(decision, cmd, reason) {
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const notifyScript = path.join(scriptDir, "notify.mjs");
    const level = decision === "ask" ? "approval" : "warning";
    const msg =
      decision === "ask"
        ? `Agent yêu cầu duyệt lệnh: ${cmd}. (${reason})`
        : `Chặn lệnh nguy hiểm: ${cmd}. (${reason})`;

    execFileSync(process.execPath, [notifyScript, "--level", level, "--action", cmd, "--message", msg], {
      stdio: "ignore",
    });
  } catch {
    // Không làm gãy luồng hook nếu thông báo gặp lỗi
  }
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
