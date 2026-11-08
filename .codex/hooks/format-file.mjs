#!/usr/bin/env node
// Codex PostToolUse (matcher: apply_patch) - format file vừa patch bằng Prettier.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const FORMATTABLE = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".md",
]);
const input = JSON.parse(await readStdin());
const patch = input.tool_input?.command ?? "";
const projectDir = input.cwd ?? process.cwd();
const prettier = path.join(
  projectDir,
  "node_modules",
  "prettier",
  "bin",
  "prettier.cjs",
);
if (!existsSync(prettier)) process.exit(0);

const files = [...patch.matchAll(/\*\*\* (?:Add|Update|Delete) File: (.+)/g)]
  .map((match) => match[1].trim())
  .filter((file) => FORMATTABLE.has(path.extname(file)))
  .map((file) => (path.isAbsolute(file) ? file : path.join(projectDir, file)))
  .filter((file) => existsSync(file));
if (files.length === 0) process.exit(0);

try {
  execFileSync(
    process.execPath,
    [prettier, "--write", "--log-level", "warn", ...files],
    {
      cwd: projectDir,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
} catch (error) {
  console.error(
    `Prettier không format được file vừa patch:\n${error.stderr ?? error.message}`,
  );
  process.exit(2);
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data || "{}";
}
