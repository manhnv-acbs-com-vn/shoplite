#!/usr/bin/env node
// Codex PermissionRequest hook - thông báo khi Codex cần người dùng cấp quyền.
import { execFile } from "node:child_process";

const input = JSON.parse(await readStdin());
const message = `Codex cần bạn cấp quyền cho ${input.tool_name ?? "một thao tác"}`;
const title = "Codex - ShopLite";

if (process.platform === "darwin") {
  const safeMessage = message.replace(/["\\]/g, "\\$&");
  execFile("osascript", [
    "-e",
    `display notification "${safeMessage}" with title "${title}"`,
  ]);
} else if (process.platform === "win32") {
  execFile("powershell", [
    "-NoProfile",
    "-Command",
    `[System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}', '${title}')`,
  ]);
} else {
  execFile("notify-send", [title, message]);
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
