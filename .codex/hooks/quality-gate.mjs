#!/usr/bin/env node
// Codex Stop hook - chạy unit test nếu có thay đổi trong src/.
import { execSync } from "node:child_process";

const input = JSON.parse(await readStdin());
if (input.stop_hook_active) process.exit(0);

const projectDir = input.cwd ?? process.cwd();
const run = (command) =>
  execSync(command, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });

let changed = "";
try {
  changed = run("git status --porcelain -- src");
} catch {
  process.exit(0);
}
if (!changed.trim()) process.exit(0);

try {
  run("npm test --silent");
} catch (error) {
  const output = `${error.stdout ?? ""}${error.stderr ?? ""}`
    .split("\n")
    .filter((line) => /FAIL|AssertionError|Error:|Test Files|Tests /.test(line))
    .slice(0, 30)
    .join("\n");
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `Quality gate: unit test đang FAIL. Hãy sửa cho pass rồi mới kết thúc.\n${output}`,
    }),
  );
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
