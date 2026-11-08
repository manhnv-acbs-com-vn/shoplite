#!/usr/bin/env node
// Kiểm tra môi trường cho khóa "AI trong SDLC và Coworker" (Module 1–8).
// Chỉ đọc: không cài, không sửa gì trên máy. Chạy được trên macOS, Windows, Linux.
//
//   node kiem-tra-moi-truong.mjs                 # cần ít nhất một trong Claude Code / Gemini CLI
//   node kiem-tra-moi-truong.mjs --agent claude  # chỉ dùng Claude làm agent chính
//   node kiem-tra-moi-truong.mjs --agent gemini  # chỉ dùng Gemini làm agent chính

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";

// ---------- Phiên bản ghim trong lab ----------
const PIN = {
  node: { min: "20.19.0", ok: ["22.13.0", "24.0.0"], untestedFrom: "26.0.0" },
  specify: "1.2",          // dòng 1.2.x
  openspec: "1.14.1",
  claude: "2.1.319",       // tối thiểu
  gemini: "0.64.0",        // tối thiểu
  gitleaks: "8.30.1",
  ports: [3000, 3001],
};

// ---------- Tham số ----------
const args = process.argv.slice(2);
const agentArg = (() => {
  const i = args.indexOf("--agent");
  const v = i >= 0 ? args[i + 1] : (args.find((a) => a.startsWith("--agent=")) || "").split("=")[1];
  return (v || "both").toLowerCase();
})();
if (!["claude", "gemini", "both"].includes(agentArg)) {
  console.error(`--agent phải là claude, gemini hoặc both (nhận được: ${agentArg})`);
  process.exit(2);
}

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const isWSL = process.platform === "linux" && /microsoft/i.test(os.release());
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

// ---------- Tiện ích ----------
function run(cmd, timeout = 20000) {
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
      windowsHide: true,
    });
    return { ok: true, out: out.trim() };
  } catch (e) {
    const out = `${e.stdout || ""}\n${e.stderr || ""}`.trim();
    return { ok: false, out };
  }
}
const ver = (s) => (String(s).match(/(\d+)\.(\d+)\.(\d+)/) || [])[0] || null;
function cmp(a, b) {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
}

const results = [];
function add(level, name, detail, hint) {
  results.push({ level, name, detail, hint });
  const tag = { ok: c(32, "[ OK ]"), warn: c(33, "[CẢNH]"), fail: c(31, "[LỖI ]"), info: c(36, "[ -- ]") }[level];
  console.log(`${tag} ${name.padEnd(26)} ${detail}`);
  if (hint && level !== "ok") console.log(`        ${c(2, "→ " + hint)}`);
}
const section = (t) => console.log(`\n${c(1, t)}`);

// ---------- Hệ thống ----------
console.log(c(1, "Kiểm tra môi trường · AI trong SDLC và Coworker"));
const osName = isMac ? "macOS" : isWin ? "Windows" : isWSL ? "Linux (WSL2)" : "Linux";
console.log(`Hệ điều hành: ${osName} ${os.release()} · ${os.arch()} · agent: ${agentArg}`);

section("1. Máy");
{
  const gb = os.totalmem() / 1024 ** 3;
  if (gb >= 15) add("ok", "RAM", `${gb.toFixed(1)} GB`);
  else if (gb >= 7.5) add("warn", "RAM", `${gb.toFixed(1)} GB`, "Đủ chạy, nhưng nên tắt bớt ứng dụng khi làm lab Playwright.");
  else add("fail", "RAM", `${gb.toFixed(1)} GB`, "Cần tối thiểu 8 GB.");

  try {
    const st = fs.statfsSync(os.homedir());
    const free = (st.bavail * st.bsize) / 1024 ** 3;
    if (free >= 20) add("ok", "Ổ trống (thư mục home)", `${free.toFixed(0)} GB`);
    else if (free >= 10) add("warn", "Ổ trống (thư mục home)", `${free.toFixed(0)} GB`, "Nên có 20 GB.");
    else add("fail", "Ổ trống (thư mục home)", `${free.toFixed(0)} GB`, "Cần tối thiểu 10 GB trống.");
  } catch {
    add("info", "Ổ trống", "không đọc được, tự kiểm tra cần ≥ 10 GB");
  }

  const cwd = process.cwd();
  const bad = [];
  if (/[^\x00-\x7F]/.test(cwd)) bad.push("có ký tự có dấu");
  if (/\s/.test(cwd)) bad.push("có khoảng trắng");
  if (/onedrive|icloud|mobile documents|dropbox|google drive/i.test(cwd)) bad.push("nằm trong thư mục đồng bộ đám mây");
  if (bad.length) add("warn", "Thư mục hiện tại", `${cwd} (${bad.join(", ")})`, isWin ? "Dùng C:\\ai-sdlc" : "Dùng ~/ai-sdlc");
  else add("ok", "Thư mục hiện tại", cwd);
}

// ---------- Công cụ nền ----------
section("2. Công cụ nền");
{
  const v = process.versions.node;
  if (cmp(v, PIN.node.min) < 0) add("fail", "Node.js", v, `Cần ≥ ${PIN.node.min}. Cài Node 24 LTS (Bước 1.2).`);
  else if (cmp(v, PIN.node.untestedFrom) >= 0) add("warn", "Node.js", v, "Node 26+ chưa được thử với lab. Khuyên dùng Node 24 LTS.");
  else if (cmp(v, PIN.node.ok[1]) >= 0 || (cmp(v, PIN.node.ok[0]) >= 0 && v.startsWith("22."))) add("ok", "Node.js", v);
  else add("warn", "Node.js", v, "Chạy được OpenSpec, nhưng lab đã thử trên Node 22.13+ và 24. Nên nâng lên 24 LTS.");

  const npm = run("npm --version");
  if (npm.ok) add("ok", "npm", ver(npm.out) || npm.out);
  else add("fail", "npm", "không tìm thấy", "npm đi kèm Node. Cài lại Node (Bước 1.2).");

  const git = run("git --version");
  if (!git.ok) add("fail", "Git", "không tìm thấy", "Cài Git (Bước 1.1).");
  else {
    add("ok", "Git", ver(git.out) || git.out);
    const name = run("git config --global user.name").out;
    const email = run("git config --global user.email").out;
    if (name && email) add("ok", "Git user.name/email", `${name} <${email}>`);
    else add("fail", "Git user.name/email", "chưa đặt", 'git config --global user.name "Ho Ten" && git config --global user.email "email@..."');
    if (isWin) {
      const crlf = run("git config --global core.autocrlf").out;
      if (crlf === "input") add("ok", "Git core.autocrlf", "input");
      else add("warn", "Git core.autocrlf", crlf || "(chưa đặt)", "git config --global core.autocrlf input  (tránh lỗi hook .sh ở Module 1)");
      const bash = ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe"].find((p) => fs.existsSync(p));
      if (bash) add("ok", "Git Bash", bash);
      else add("warn", "Git Bash", "không thấy ở vị trí mặc định", "Hook ở Module 1 cần Git Bash. Cài Git for Windows hoặc đặt CLAUDE_CODE_GIT_BASH_PATH.");
    }
  }

  const uv = run("uv --version");
  if (uv.ok) add("ok", "uv", ver(uv.out) || uv.out);
  else add("fail", "uv", "không tìm thấy", "Cài uv (Bước 1.3), mở terminal mới.");

  const gh = run("gh --version");
  if (!gh.ok) add("fail", "GitHub CLI (gh)", "không tìm thấy", "Cài gh (Bước 1.4).");
  else {
    add("ok", "GitHub CLI (gh)", ver(gh.out) || "có");
    const auth = run("gh auth status");
    if (auth.ok) {
      const who = (auth.out.match(/account\s+(\S+)/i) || auth.out.match(/as\s+(\S+)/i) || [])[1];
      add("ok", "gh đăng nhập", who ? `github.com · ${who}` : "đã đăng nhập");
    } else add("fail", "gh đăng nhập", "chưa đăng nhập", "gh auth login (Bước 6)");
  }
}

// ---------- AI agent ----------
section("3. AI agent");
function checkAgent(label, cmd, min, needed, hint) {
  const r = run(`${cmd} --version`);
  const v = r.ok ? ver(r.out) : null;
  if (!v) {
    add(needed ? "fail" : "info", label, "không tìm thấy", needed ? hint : "Không bắt buộc với lựa chọn --agent hiện tại.");
    return false;
  }
  if (cmp(v, min) < 0) add(needed ? "fail" : "warn", label, `${v} (cần ≥ ${min})`, `${cmd === "claude" ? "claude update" : "npm install -g @google/gemini-cli"}`);
  else add("ok", label, v);
  return true;
}
// Mặc định (both): cần ít nhất một agent; --agent X: bắt buộc X.
const hasClaude = checkAgent("Claude Code", "claude", PIN.claude, agentArg === "claude", "Cài Claude Code (Bước 2A).");
const hasGemini = checkAgent("Gemini CLI", "gemini", PIN.gemini, agentArg === "gemini", "Cài Gemini CLI (Bước 2B).");
if (agentArg === "both" && !hasClaude && !hasGemini) {
  add("fail", "Agent chính", "chưa có agent nào", "Cài Claude Code (Bước 2A) hoặc Gemini CLI (Bước 2B).");
}
if (hasClaude || hasGemini) {
  add("info", "Đăng nhập agent", "script không kiểm được", "Mở agent, gõ /status (Claude) hoặc /auth (Gemini) để chắc đã đăng nhập.");
}

// Model thứ hai cho Module 5
{
  const codex = run("codex --version");
  const n = [hasClaude, hasGemini, codex.ok].filter(Boolean).length;
  const names = [hasClaude && "Claude Code", hasGemini && "Gemini CLI", codex.ok && "Codex CLI"].filter(Boolean);
  if (n >= 2) add("ok", "Model review (Module 5)", names.join(" + "));
  else add("warn", "Model review (Module 5)", names[0] ? `chỉ có ${names[0]}` : "chưa có agent nào", "Module 5 cần model thứ hai: cài thêm Gemini CLI, Claude Code hoặc Codex CLI (Bước 5.1).");
}

// ---------- Công cụ đặc tả ----------
section("4. Spec Kit · OpenSpec · BMAD");
{
  const sp = run("specify version");
  const v = sp.ok ? ver(sp.out) : null;
  if (!v) add("fail", "Spec Kit (specify)", "không tìm thấy", "uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.2.6");
  else if (v.startsWith(PIN.specify + ".")) add("ok", "Spec Kit (specify)", v);
  else add("warn", "Spec Kit (specify)", `${v} (lab dùng 1.2.x)`, "Cài lại bản ghim: thêm --force vào lệnh ở Bước 3.1.");

  const os_ = run("openspec --version");
  const ov = os_.ok ? ver(os_.out) : null;
  if (!ov) add("fail", "OpenSpec", "không tìm thấy", `npm install -g @fission-ai/openspec@${PIN.openspec}`);
  else if (ov === PIN.openspec) add("ok", "OpenSpec", ov);
  else add("warn", "OpenSpec", `${ov} (lab dùng ${PIN.openspec})`, `npm install -g @fission-ai/openspec@${PIN.openspec}`);

  add("info", "BMAD 6.12.4", "cài trong lớp bằng npx", "Tải trước: npm cache add bmad-method@6.12.4");
}

// ---------- Playwright ----------
section("5. Playwright");
{
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (isMac ? path.join(os.homedir(), "Library", "Caches", "ms-playwright")
      : isWin ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "ms-playwright")
      : path.join(os.homedir(), ".cache", "ms-playwright"));
  let dirs = [];
  try { dirs = fs.readdirSync(base); } catch {}
  const full = dirs.filter((d) => /^chromium-\d+$/.test(d)).sort();
  const fix = `npx -y playwright@1.64.0 install${process.platform === "linux" ? " --with-deps" : ""} chromium`;
  if (full.length) add("ok", "Chromium cho Playwright", full.at(-1));
  else if (dirs.some((d) => /^chromium/.test(d))) add("warn", "Chromium cho Playwright", "chỉ có bản headless shell", `Module 6 dùng chế độ --ui, cần bản đầy đủ: ${fix}`);
  else add("warn", "Chromium cho Playwright", "chưa tải", fix);

  const gl = run("gitleaks version");
  const gv = gl.ok ? ver(gl.out) : null;
  if (gv) add(gv === PIN.gitleaks ? "ok" : "info", "gitleaks (không bắt buộc)", gv);
  else add("info", "gitleaks (không bắt buộc)", "chưa cài", "Chỉ cần nếu muốn quét secret trên máy trước khi push.");
}

// ---------- Mạng & cổng ----------
section("6. Cổng và mạng");
function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, "127.0.0.1");
  });
}
for (const p of PIN.ports) {
  if (await portFree(p)) add("ok", `Cổng ${p}`, "trống");
  else add("warn", `Cổng ${p}`, "đang bị chiếm", "Tắt ứng dụng đang dùng cổng này trước buổi học.");
}

async function reach(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { method: "HEAD", signal: ctrl.signal, redirect: "manual" });
    clearTimeout(t);
    return r.status > 0;
  } catch { return false; }
}
const hosts = [
  ["npm registry", "https://registry.npmjs.org/"],
  ["GitHub", "https://github.com/"],
  ["Anthropic API", "https://api.anthropic.com/"],
  ["Gemini API", "https://generativelanguage.googleapis.com/"],
];
const proxied = process.env.HTTPS_PROXY || process.env.https_proxy;
for (const [name, url] of hosts) {
  if (await reach(url)) add("ok", name, new URL(url).host);
  else add(proxied ? "info" : "warn", name, `không kết nối được ${new URL(url).host}`,
    proxied ? "Có proxy: Node không tự dùng proxy, thử lại bằng chính agent/npm." : "Kiểm tra mạng hoặc gửi danh sách tên miền cho IT.");
}

// ---------- Tổng kết ----------
const n = (l) => results.filter((r) => r.level === l).length;
console.log("\n" + "─".repeat(60));
console.log(`Kết quả: ${c(32, n("ok") + " đạt")} · ${c(33, n("warn") + " cảnh báo")} · ${c(31, n("fail") + " lỗi")}`);
if (n("fail") === 0) console.log(c(32, "Máy đã sẵn sàng. Chụp màn hình này gửi trợ giảng."));
else console.log(c(31, "Còn lỗi. Sửa theo gợi ý (→) rồi chạy lại script."));
console.log(`Thời điểm: ${new Date().toLocaleString("vi-VN")} · ${os.hostname()}`);
process.exitCode = n("fail") ? 1 : 0;
