#!/usr/bin/env node
// Hook: UserPromptSubmit
// Quét prompt trước khi gửi cho Claude. Nếu phát hiện secret (API key, token,
// private key, password...) thì chặn prompt bằng JSON output: decision = "block".
// Prompt bị chặn sẽ không được gửi đi và bị xóa khỏi context.

const RULES = [
  { name: "Anthropic API key", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "OpenAI API key", pattern: /\bsk-(proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: "AWS access key", pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/ },
  {
    name: "GitHub token",
    pattern:
      /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}/,
  },
  { name: "Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "JWT",
    pattern:
      /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    name: "Password / secret gán giá trị",
    pattern:
      /\b(password|passwd|pwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[^\s"']{8,}/i,
  },
];

const input = JSON.parse(await readStdin());
const prompt = input.prompt ?? "";

const matched = RULES.filter((rule) => rule.pattern.test(prompt));
if (matched.length > 0) {
  const names = matched.map((rule) => rule.name).join(", ");
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `🔐 scan-prompt: Prompt có vẻ chứa secret (${names}). Hãy xóa secret rồi gửi lại - dùng biến môi trường thay vì dán trực tiếp.`,
    }),
  );
}

process.exit(0);

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
