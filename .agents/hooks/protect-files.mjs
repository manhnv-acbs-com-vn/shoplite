#!/usr/bin/env node
// PreToolUse (matcher: edit_file|write_file) - chặn sửa file nhạy cảm
import path from "node:path";

const PROTECTED = [
  { pattern: /(^|\/)\.env(\..*)?$/, reason: "file biến môi trường có thể chứa bí mật" },
  { pattern: /(^|\/)package-lock\.json$/, reason: "chỉ được thay đổi qua lệnh npm install" },
  { pattern: /^storage\//, reason: "dữ liệu đơn hàng thật, không sửa bằng tay" },
  { pattern: /^\.git\//, reason: "không được sửa nội bộ git" },
];

const input = JSON.parse(await readStdin());

// Nhận diện đường dẫn file: Antigravity (toolCall.args.Path) hoặc Claude Code (tool_input.file_path)
const filePath = input.toolCall?.args?.Path || input.tool_input?.file_path;
if (!filePath) {
  if (input.toolCall) console.log(JSON.stringify({ decision: "allow" }));
  process.exit(0);
}

const projectDir =
  input.workspacePaths?.[0] ??
  process.env.CLAUDE_PROJECT_DIR ??
  input.cwd ??
  process.cwd();

const relativePath = path.relative(projectDir, filePath).split(path.sep).join("/");

for (const { pattern, reason } of PROTECTED) {
  if (pattern.test(relativePath)) {
    const message = `⛔ Hook protect-files: không được sửa "${relativePath}" (${reason}).`;

    // Antigravity contract: xuất JSON decision "deny" ra stdout
    if (input.toolCall) {
      console.log(JSON.stringify({
        decision: "deny",
        reason: message
      }));
      process.exit(0);
    }

    // Claude Code contract: xuất stderr và exit code 2
    console.error(message);
    process.exit(2);
  }
}

// Cho phép nếu không rơi vào danh sách chặn
if (input.toolCall) {
  console.log(JSON.stringify({ decision: "allow" }));
}
process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
