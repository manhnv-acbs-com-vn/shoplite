// Gửi thông báo desktop, dùng chung cho các hook (notify, scan-prompt...).
// Tiến trình con chạy tách rời (detached + unref) để hook gọi process.exit() ngay
// mà thông báo vẫn hiện, và không bắt hook phải chờ (MessageBox trên Windows chờ bấm OK).

import { spawn } from "node:child_process";

const DEFAULT_TITLE = "Claude Code - ShopLite";

export function sendDesktopNotification(message, title = DEFAULT_TITLE) {
  // Bỏ ký tự có thể phá chuỗi lệnh osascript/powershell
  const safe = (text) => String(text).replace(/["'`$\\]/g, "");
  const msg = safe(message);
  const ttl = safe(title);

  let command;
  let args;
  if (process.platform === "darwin") {
    command = "osascript";
    args = ["-e", `display notification "${msg}" with title "${ttl}"`];
  } else if (process.platform === "win32") {
    command = "powershell";
    args = [
      "-NoProfile",
      "-Command",
      `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; ` +
        `[System.Windows.Forms.MessageBox]::Show('${msg}', '${ttl}')`,
    ];
  } else {
    command = "notify-send";
    args = [ttl, msg];
  }

  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {}); // máy không có lệnh thông báo -> bỏ qua, không làm hỏng hook
    child.unref();
  } catch {
    // bỏ qua: thông báo chỉ là phụ, không được chặn hook chính
  }
}
