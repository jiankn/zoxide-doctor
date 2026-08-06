import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zoxide-doctor-smoke-"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: "utf8",
    windowsHide: true,
    shell: false,
  });
  const allowedStatuses = options.allowedStatuses ?? [0];
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.error ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  return result;
}

function runNpm(args, options = {}) {
  if (process.env.npm_execpath) {
    return run(process.execPath, [process.env.npm_execpath, ...args], options);
  }
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(command, args, options);
}

try {
  const packed = runNpm(["pack", "--json"]);
  const [{ filename }] = JSON.parse(packed.stdout);
  const tarball = path.join(projectRoot, filename);
  runNpm(["init", "-y"], { cwd: tempRoot });
  runNpm(["install", tarball], { cwd: tempRoot });

  const installedBin = path.join(tempRoot, "node_modules", "zoxide-doctor", "bin", "zoxide-doctor.js");
  const invocation = run(
    process.execPath,
    [installedBin, "--shell", "bash", "--json", "--no-config-scan"],
    { cwd: tempRoot, allowedStatuses: [0, 1] },
  );
  const report = JSON.parse(invocation.stdout);
  if (!report.checks.some((item) => item.id === "binary")) {
    throw new Error("Installed CLI did not run the zoxide binary check");
  }
  console.log(`Smoke test passed: ${installedBin}`);
  fs.rmSync(tarball, { force: true });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
