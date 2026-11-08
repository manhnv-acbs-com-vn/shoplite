#!/usr/bin/env node
// Hook: Notification (tùy chọn)
// Hiện thông báo trên desktop khi Claude Code cần bạn (xin quyền, chờ nhập liệu...).

import { sendDesktopNotification } from "./lib/desktop-notify.mjs";

const input = JSON.parse(await readStdin());
sendDesktopNotification(input.message ?? "Claude Code cần bạn xác nhận");

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
