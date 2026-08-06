import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  configCandidates,
  containsActiveInit,
  detectShell,
  initCommand,
  normalizeShell,
  runDiagnostics,
} from "../src/index.js";

test("normalizes common shell executables", () => {
  assert.equal(normalizeShell("/bin/zsh"), "zsh");
  assert.equal(normalizeShell("pwsh.exe"), "powershell");
  assert.equal(normalizeShell("nu"), "nushell");
  assert.equal(normalizeShell("cmd.exe"), null);
});

test("detects a shell from explicit environment signals", () => {
  assert.deepEqual(detectShell({ SHELL: "/usr/bin/fish" }, "linux"), {
    shell: "fish",
    source: "SHELL",
    confidence: "high",
  });
});

test("returns the documented initialization command", () => {
  assert.equal(initCommand("fish"), "zoxide init fish | source");
  assert.match(initCommand("powershell"), /zoxide init powershell/);
});

test("ignores commented initialization lines", () => {
  assert.equal(containsActiveInit('# eval "$(zoxide init zsh)"', "zsh"), false);
  assert.equal(containsActiveInit('eval "$(zoxide init zsh)"', "zsh"), true);
});

test("builds conventional config paths", () => {
  const home = path.join(path.parse(process.cwd()).root, "home", "dev");
  assert.deepEqual(configCandidates("zsh", home, {}), [
    path.join(home, ".zshrc"),
    path.join(home, ".zprofile"),
  ]);
});

test("reports a healthy configured installation", () => {
  const report = runDiagnostics({
    shell: "zsh",
    platform: "linux",
    home: "/home/dev",
    env: { PATH: "/usr/bin" },
    deps: {
      findExecutable(command) {
        return `/usr/bin/${command}`;
      },
      spawnSync(_command, args) {
        if (args[0] === "--version") return { status: 0, stdout: "zoxide 0.10.0\n" };
        return { status: 0, stdout: 'eval "$(zoxide hook zsh)"\n' };
      },
      existsSync(file) {
        return file.endsWith(".zshrc");
      },
      readFileSync() {
        return 'eval "$(zoxide init zsh)"\n';
      },
    },
  });

  assert.equal(report.status, "healthy");
  assert.equal(report.checks.filter((item) => item.level === "pass").length, 5);
});

test("reports missing zoxide with installation and troubleshooting links", () => {
  const report = runDiagnostics({
    shell: "bash",
    platform: "linux",
    env: { PATH: "/usr/bin" },
    deps: {
      findExecutable() {
        return null;
      },
    },
  });

  assert.equal(report.status, "error");
  assert.ok(report.recommendations.some((item) => item.url.endsWith("/download/")));
  assert.ok(report.recommendations.some((item) => item.url.includes("zoxide-command-not-found")));
});
