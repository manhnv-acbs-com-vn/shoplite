#!/usr/bin/env node
// PostToolUse (matcher: Edit|Write / edit_file|write_file) - tự động format code bằng Prettier
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SUPPORTED_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|md)$/i;

const input = JSON.parse(await readStdin());

// Nhận diện đường dẫn file: Claude Code (tool_input.file_path) hoặc Antigravity (toolCall.args.Path)
const filePath = input.tool_input?.file_path || input.toolCall?.args?.Path;
if (!filePath) process.exit(0);

const projectDir =
  input.workspacePaths?.[0] ??
  process.env.CLAUDE_PROJECT_DIR ??
  input.cwd ??
  process.cwd();

const resolvedPath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(projectDir, filePath);

// Bỏ qua nếu file không tồn tại hoặc đuôi file không được hỗ trợ
if (!existsSync(resolvedPath) || !SUPPORTED_EXTENSIONS.test(resolvedPath)) {
  if (input.toolCall) console.log("{}");
  process.exit(0);
}

// Tìm binary Prettier cục bộ trong node_modules
const prettierBin = path.join(projectDir, "node_modules", "prettier", "bin", "prettier.cjs");
if (!existsSync(prettierBin)) {
  if (input.toolCall) console.log("{}");
  process.exit(0);
}

// Chạy Prettier bằng process.execPath (Node binary) trực tiếp thay vì npx
const result = spawnSync(process.execPath, [prettierBin, "--write", resolvedPath], {
  cwd: projectDir,
  encoding: "utf-8",
});

if (result.status !== 0) {
  console.error(`⚠️ Hook format-file: Prettier gặp lỗi khi format "${resolvedPath}":\n${result.stderr || result.stdout}`);
  process.exit(2);
}

if (input.toolCall) {
  console.log("{}");
}
process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
