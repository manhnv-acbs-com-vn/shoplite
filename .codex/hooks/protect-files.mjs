#!/usr/bin/env node
// PreToolUse (matcher: Edit|Write) - chặn sửa file nhạy cảm bằng exit code 2
import path from "node:path";

const PROTECTED = [
  {
    pattern: /(^|\/)\.env(\..*)?$/,
    reason: "file biến môi trường có thể chứa bí mật",
  },
  {
    pattern: /(^|\/)package-lock\.json$/,
    reason: "chỉ được thay đổi qua lệnh npm install",
  },
  {
    pattern: /^storage\//,
    reason: "dữ liệu đơn hàng thật, không sửa bằng tay",
  },
  { pattern: /^\.git\//, reason: "không được sửa nội bộ git" },
];

const input = JSON.parse(await readStdin());
const toolInput = input.tool_input ?? {};
const filePaths = [];

if (typeof toolInput.file_path === "string") {
  filePaths.push(toolInput.file_path);
}

// Codex gửi apply_patch trong tool_input.command, với đường dẫn ở các dòng:
// *** Update File: path/to/file
// *** Add File: path/to/file
// *** Delete File: path/to/file
if (typeof toolInput.command === "string") {
  for (const line of toolInput.command.split("\n")) {
    const match = line.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/);
    if (match) filePaths.push(match[1].trim());
  }

  // Bash không có file_path; bắt các đường dẫn nhạy cảm xuất hiện trong lệnh.
  const protectedPathPattern =
    /(?:^|[\s"'`=\/])((?:\.env(?:\.[^\s"'`/]+)?|package-lock\.json|storage\/[^\s"'`]+|\.git\/[^\s"'`]+))/g;
  for (const match of toolInput.command.matchAll(protectedPathPattern)) {
    filePaths.push(match[1].replace(/[),;]+$/, ""));
  }
}

if (filePaths.length === 0) process.exit(0);

const projectDir = process.env.CODEX_PROJECT_DIR ?? input.cwd ?? process.cwd();

for (const filePath of filePaths) {
  const relativePath = path
    .relative(projectDir, path.resolve(projectDir, filePath))
    .split(path.sep)
    .join("/");

  for (const { pattern, reason } of PROTECTED) {
    if (pattern.test(relativePath)) {
      console.error(
        `⛔ Hook protect-files: không được sửa "${relativePath}" (${reason}).`,
      );
      process.exit(2); // 2 = CHẶN, stderr được gửi cho agent
    }
  }
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
