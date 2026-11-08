#!/usr/bin/env node
// Hook: PreToolUse (matcher: Edit|Write|edit_file|write_file)
// Chặn agent sửa các file nhạy cảm. Cách chặn: in lý do ra stderr và thoát với exit code 2
// Đồng thời phát desktop notification cảnh báo lập trình viên.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROTECTED = [
  { pattern: /(^|\/)\.env(\..*)?$/, reason: "file biến môi trường có thể chứa bí mật" },
  { pattern: /(^|\/)package-lock\.json$/, reason: "chỉ được thay đổi qua lệnh npm install" },
  { pattern: /^storage\//, reason: "dữ liệu đơn hàng thật, không sửa bằng tay" },
  { pattern: /^\.git\//, reason: "không được sửa nội bộ git" },
];

const input = JSON.parse(await readStdin());
const filePath = input.tool_input?.file_path ?? input.tool_input?.Path;
if (!filePath) process.exit(0);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const projectDir = process.env.GEMINI_PROJECT_DIR ?? process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? repoRoot;
const relativePath = path.relative(projectDir, filePath).split(path.sep).join("/");

for (const { pattern, reason } of PROTECTED) {
  if (pattern.test(relativePath)) {
    const errorMsg = `⛔ Hook protect-files: không được sửa "${relativePath}" (${reason}). Hãy dừng lại và hỏi người dùng nếu thật sự cần thay đổi file này.`;
    console.error(errorMsg);

    // Kích hoạt notification desktop
    try {
      const notifyScript = path.join(scriptDir, "notify.mjs");
      execFileSync(
        process.execPath,
        [
          notifyScript,
          "--level",
          "warning",
          "--action",
          relativePath,
          "--message",
          `Agent bị chặn sửa file nhạy cảm: ${relativePath} (${reason})`,
        ],
        { stdio: "ignore" },
      );
    } catch {
      // Bỏ qua lỗi gửi notification
    }

    process.exit(2);
  }
}

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
