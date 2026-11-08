#!/usr/bin/env node
// Hook: Notification & Progress Tracker (Google Antigravity & Gemini CLI)
// Hỗ trợ:
// - Thông báo Info, Warning (Cảnh báo), Config (Cần cấu hình / Action Required)
// - Theo dõi và hiển thị thanh tiến độ thực hiện (Progress Bar, Bước X/Y)
// - Đa nền tảng (macOS osascript, Windows PowerShell, Linux notify-send)
// - Tự động ghi nhật ký vào .gemini/logs/notifications.log và progress-state.json

import { execFile } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Phân tích dữ liệu từ stdin hoặc CLI flags
const stdinData = await readStdin();
const input = stdinData ? JSON.parse(stdinData) : {};
const cliArgs = parseCliArgs(process.argv.slice(2));

// Hợp nhất dữ liệu (ưu tiên CLI args > stdin payload)
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

const projectDir =
  process.env.GEMINI_PROJECT_DIR ??
  process.env.CLAUDE_PROJECT_DIR ??
  input.cwd ??
  repoRoot;

const logDir = path.join(projectDir, ".gemini", "logs");
mkdirSync(logDir, { recursive: true });
const stateFilePath = path.join(logDir, "progress-state.json");
const logFilePath = path.join(logDir, "notifications.log");

// Quản lý trạng thái tiến độ lưu trên đĩa
const currentState = loadProgressState(stateFilePath);

let rawMessage =
  cliArgs.message ??
  input.message ??
  input.text ??
  input.msg ??
  getDefaultMessageByHook(input);

let rawLevel =
  cliArgs.level ??
  cliArgs.type ??
  input.level ??
  input.type ??
  input.severity ??
  detectLevel(rawMessage, input);

let step = cliArgs.step ?? input.step ?? currentState.currentStep;
let totalSteps = cliArgs.total ?? input.totalSteps ?? input.total_steps ?? currentState.totalSteps;
let progressPercent =
  cliArgs.progress ?? input.progress ?? (totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0);

// Nếu gọi từ PostToolUse hoặc có tool, tự động tính tiến độ nếu chưa có
if (input.hookEventName === "PostToolUse" && !cliArgs.step) {
  step = (currentState.toolCount ?? 0) + 1;
  currentState.toolCount = step;
  if (!totalSteps || totalSteps < step) totalSteps = Math.max(5, step);
  progressPercent = Math.min(95, Math.round((step / totalSteps) * 100));
} else if (input.hookEventName === "Stop") {
  step = totalSteps;
  progressPercent = 100;
  rawLevel = "success";
}

// Cập nhật trạng thái
currentState.currentStep = step;
currentState.totalSteps = totalSteps;
currentState.progressPercent = progressPercent;
currentState.lastUpdated = new Date().toISOString();
currentState.lastMessage = rawMessage;
saveProgressState(stateFilePath, currentState);

// 2. Định hình nội dung hiển thị (Title, Subtitle, Sound, Icon)
const { title, subtitle, soundName, category } = formatNotificationMetadata({
  level: rawLevel,
  message: rawMessage,
  step,
  totalSteps,
  progress: progressPercent,
  toolName: input.tool_name ?? input.toolName,
  action: cliArgs.action ?? input.action,
});

// Ghi log audit
appendFileSync(
  logFilePath,
  `[${new Date().toISOString()}] [${category.toUpperCase()}] (${progressPercent}%) ${title} | ${subtitle} | ${rawMessage}\n`,
);

// 3. Thực thi thông báo trên hệ điều hành
sendDesktopNotification({
  title,
  subtitle,
  message: rawMessage,
  soundName,
  urgency:
    category === "warning" || category === "config" || category === "approval"
      ? "critical"
      : "normal",
});

// Trả về JSON chuẩn cho Agent lifecycle nếu cần
console.log(
  JSON.stringify({
    notificationSent: true,
    category,
    progress: progressPercent,
    step,
    totalSteps,
  }),
);

process.exit(0);

// ========================== HELPER FUNCTIONS ==========================

async function readStdin() {
  if (process.stdin.isTTY) return "";
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

function parseCliArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--level" || arg === "-l" || arg === "--type") result.level = args[++i];
    else if (arg === "--message" || arg === "-m") result.message = args[++i];
    else if (arg === "--step" || arg === "-s") result.step = parseInt(args[++i], 10);
    else if (arg === "--total" || arg === "-t") result.total = parseInt(args[++i], 10);
    else if (arg === "--progress" || arg === "-p") result.progress = parseInt(args[++i], 10);
    else if (arg === "--action" || arg === "-a") result.action = args[++i];
  }
  return result;
}

function loadProgressState(filePath) {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, "utf8"));
    }
  } catch {
    // Bỏ qua lỗi đọc file state cũ
  }
  return { currentStep: 0, totalSteps: 5, toolCount: 0, progressPercent: 0 };
}

function saveProgressState(filePath, state) {
  try {
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Không chặn tiến trình nếu ghi state gặp trục trặc
  }
}

function getDefaultMessageByHook(input) {
  if (input.hookEventName === "Stop") {
    return "Đã hoàn thành toàn bộ công việc và Quality Gate thành công!";
  }
  if (input.hookEventName === "PostToolUse") {
    const tool = input.tool_name ?? "lệnh hệ thống";
    return `Đã thực thi thành công tác vụ [${tool}].`;
  }
  if (input.hookEventName === "UserPromptSubmit") {
    return "Đã nhận yêu cầu mới từ người dùng. Bắt đầu xử lý...";
  }
  return "Agent ShopLite đang xử lý hoặc cần bạn hỗ trợ.";
}

function detectLevel(message, input) {
  const text = `${message} ${input.hookEventName ?? ""} ${input.action ?? ""}`.toLowerCase();
  if (/xác nhận|phê duyệt|duyệt|confirm|approval|permission|yêu cầu duyệt|cần bạn/i.test(text)) {
    return "approval";
  }
  if (/cảnh báo|warning|danger|bị chặn|block|deny|từ chối|lỗi|fail|error/i.test(text)) {
    return "warning";
  }
  if (/config|cấu hình|setup|thiếu|missing|api[_-]?key|token|secret|\.env/i.test(text)) {
    return "config";
  }
  if (/tiến độ|progress|bước|step|đang thực hiện|xử lý/i.test(text)) {
    return "progress";
  }
  if (/hoàn tất|thành công|done|passed|finish/i.test(text) || input.hookEventName === "Stop") {
    return "success";
  }
  return "info";
}

function renderProgressBar(percentage, length = 10) {
  const validPct = Math.max(0, Math.min(100, Math.round(percentage)));
  const filled = Math.max(0, Math.min(length, Math.round((validPct / 100) * length)));
  const empty = length - filled;
  return `[${"■".repeat(filled)}${"□".repeat(empty)}] ${validPct}%`;
}

function formatNotificationMetadata({ level, step, totalSteps, progress, toolName, action }) {
  const normLevel = (level || "info").toLowerCase();
  const progressBar = renderProgressBar(progress);

  let category = "info";
  let title = "ℹ️ ShopLite Agent";
  let soundName = "Ping";
  let subtitle = `${progressBar} · Bước ${step}/${totalSteps}`;

  if (normLevel === "approval" || normLevel === "confirm" || normLevel === "ask") {
    category = "approval";
    title = "🔔 ShopLite Agent - CẦN BẠN XÁC NHẬN";
    soundName = "Glass";
    subtitle = action ? `Cần duyệt: ${action}` : `Đang chờ bạn xác nhận thực hiện`;
  } else if (normLevel === "warning" || normLevel === "warn" || normLevel === "danger") {
    category = "warning";
    title = "⚠️ ShopLite Agent - CẢNH BÁO";
    soundName = "Submarine";
    subtitle = action ? `Cần chú ý: ${action}` : `${progressBar} · Cảnh báo an toàn`;
  } else if (normLevel === "config" || normLevel === "setup" || normLevel === "action") {
    category = "config";
    title = "⚙️ ShopLite Agent - CẦN CẤU HÌNH";
    soundName = "Frog";
    subtitle = action ? `Thao tác: ${action}` : `Yêu cầu thiết lập môi trường/config`;
  } else if (normLevel === "progress") {
    category = "progress";
    title = "⏳ ShopLite Agent - TIẾN ĐỘ";
    soundName = "Tink";
    subtitle = toolName ? `${progressBar} · ${toolName}` : `${progressBar} · Bước ${step}/${totalSteps}`;
  } else if (normLevel === "success" || normLevel === "done") {
    category = "success";
    title = "✅ ShopLite Agent - HOÀN TẤT";
    soundName = "Hero";
    subtitle = `${renderProgressBar(100)} · Nhiệm vụ hoàn thành`;
  }

  return { title, subtitle, soundName, category };
}

function sendDesktopNotification({ title, subtitle, message, soundName, urgency }) {
  const safeMessage = (message || "").replace(/["'\\]/g, " ");
  const safeTitle = (title || "").replace(/["'\\]/g, " ");
  const safeSubtitle = (subtitle || "").replace(/["'\\]/g, " ");

  if (process.platform === "darwin") {
    // macOS: sử dụng osascript với tham số an toàn argv
    execFile(
      "osascript",
      [
        "-e",
        "on run argv",
        "-e",
        "  display notification (item 1 of argv) with title (item 2 of argv) subtitle (item 3 of argv) sound name (item 4 of argv)",
        "-e",
        "end run",
        "--",
        safeMessage,
        safeTitle,
        safeSubtitle,
        soundName,
      ],
      () => {},
    );
  } else if (process.platform === "win32") {
    // Windows: PowerShell toast
    const psScript = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
      $template = @"
      <toast>
          <visual>
              <binding template="ToastGeneric">
                  <text>${safeTitle}</text>
                  <text>${safeSubtitle}</text>
                  <text>${safeMessage}</text>
              </binding>
          </visual>
      </toast>
"@
      $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
      $xml.LoadXml($template)
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("ShopLite Agent").Show($toast)
    `;
    execFile("powershell", ["-NoProfile", "-Command", psScript], () => {});
  } else {
    // Linux: notify-send
    execFile("notify-send", [safeTitle, `${safeSubtitle}\n${safeMessage}`, "-u", urgency], () => {});
  }
}
