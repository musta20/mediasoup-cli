const { readdirSync, rmSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

rmSync(path.join(root, ".test-build"), { recursive: true, force: true });
run([require.resolve("typescript/bin/tsc"), "-p", "tsconfig.test.json"]);
// Older Node releases do not expand test globs. Pass explicit paths on every OS.
const testDir = path.join(root, ".test-build", "test");
const files = readdirSync(testDir)
  .filter((file) => file.endsWith(".test.js"))
  .sort()
  .map((file) => path.join(testDir, file));
if (!files.length) throw new Error("No compiled test files found");
run(["--test", "--test-concurrency=1", ...files]);
