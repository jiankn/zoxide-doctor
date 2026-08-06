import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync as nodeSpawnSync } from "node:child_process";

export const SUPPORTED_SHELLS = [
  "bash",
  "zsh",
  "fish",
  "powershell",
  "nushell",
  "elvish",
  "tcsh",
  "xonsh",
  "posix",
];

const DOCS = {
  install: "https://zoxide.org/download/",
  shell: "https://zoxide.org/tutorials/shell-setup/",
  troubleshoot: "https://zoxide.org/blog/zoxide-command-not-found/",
  fzf: "https://zoxide.org/tutorials/fzf-integration/",
};

const SHELL_ALIASES = new Map([
  ["bash", "bash"],
  ["zsh", "zsh"],
  ["fish", "fish"],
  ["powershell", "powershell"],
  ["pwsh", "powershell"],
  ["nu", "nushell"],
  ["nushell", "nushell"],
  ["elvish", "elvish"],
  ["tcsh", "tcsh"],
  ["csh", "tcsh"],
  ["xonsh", "xonsh"],
  ["sh", "posix"],
  ["dash", "posix"],
  ["ksh", "posix"],
  ["posix", "posix"],
]);

export function normalizeShell(value) {
  if (!value) return null;
  const basename = path.basename(String(value)).toLowerCase().replace(/\.exe$/i, "");
  return SHELL_ALIASES.get(basename) ?? null;
}

export function detectShell(env = process.env, platform = process.platform) {
  const explicitSignals = [
    [env.SHELL, "SHELL", "high"],
    [env.NU_SHELL || (env.NU_VERSION ? "nu" : null), "NU_VERSION", "high"],
    [env.XONSH_VERSION ? "xonsh" : null, "XONSH_VERSION", "high"],
    [env.ELVISH_VERSION ? "elvish" : null, "ELVISH_VERSION", "high"],
  ];

  for (const [value, source, confidence] of explicitSignals) {
    const shell = normalizeShell(value);
    if (shell) return { shell, source, confidence };
  }

  if (platform === "win32" && env.PSModulePath) {
    return { shell: "powershell", source: "PSModulePath", confidence: "low" };
  }

  return { shell: null, source: null, confidence: "none" };
}

export function initCommand(shell) {
  const commands = {
    bash: 'eval "$(zoxide init bash)"',
    zsh: 'eval "$(zoxide init zsh)"',
    fish: "zoxide init fish | source",
    powershell: "Invoke-Expression (& { (zoxide init powershell | Out-String) })",
    nushell: "zoxide init nushell | save -f ~/.zoxide.nu",
    elvish: "eval (zoxide init elvish | slurp)",
    tcsh: "zoxide init tcsh > ~/.zoxide.tcsh",
    xonsh: "execx($(zoxide init xonsh), 'exec', __xonsh__.ctx, filename='zoxide')",
    posix: 'eval "$(zoxide init posix --hook prompt)"',
  };
  return commands[shell] ?? null;
}

export function configCandidates(shell, home = os.homedir(), env = process.env) {
  const documents = env.OneDrive ? path.join(env.OneDrive, "Documents") : path.join(home, "Documents");
  const candidates = {
    bash: [".bashrc", ".bash_profile", ".profile"],
    zsh: [".zshrc", ".zprofile"],
    fish: [path.join(".config", "fish", "config.fish")],
    powershell: [
      path.join(documents, "PowerShell", "Microsoft.PowerShell_profile.ps1"),
      path.join(documents, "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1"),
    ],
    nushell: [path.join(".config", "nushell", "config.nu")],
    elvish: [path.join(".config", "elvish", "rc.elv")],
    tcsh: [".tcshrc", ".cshrc"],
    xonsh: [".xonshrc"],
    posix: [".profile"],
  };

  return (candidates[shell] ?? []).map((candidate) =>
    path.isAbsolute(candidate) ? candidate : path.join(home, candidate),
  );
}

export function containsActiveInit(contents, shell) {
  if (!contents || !shell) return false;
  const initShell = shell === "posix" ? "posix" : shell;
  return String(contents)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .some((line) => new RegExp(`\\bzoxide\\s+init\\s+${initShell}\\b`, "i").test(line));
}

export function findExecutable(command, env = process.env, platform = process.platform) {
  const pathValue = env.PATH || env.Path || env.path || "";
  const extensions = platform === "win32"
    ? (env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];

  for (const directory of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      try {
        fs.accessSync(candidate, platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
        return candidate;
      } catch {
        // Continue through PATH candidates.
      }
    }
  }
  return null;
}

function check(id, level, message, details = {}) {
  return { id, level, message, ...details };
}

export function runDiagnostics(options = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.home ?? os.homedir();
  const scanConfig = options.scanConfig !== false;
  const deps = {
    findExecutable: options.deps?.findExecutable ?? findExecutable,
    spawnSync: options.deps?.spawnSync ?? nodeSpawnSync,
    existsSync: options.deps?.existsSync ?? fs.existsSync,
    readFileSync: options.deps?.readFileSync ?? fs.readFileSync,
  };

  const detected = options.shell
    ? { shell: normalizeShell(options.shell), source: "--shell", confidence: "high" }
    : detectShell(env, platform);
  const checks = [];
  const recommendations = [];

  if (detected.shell) {
    const confidenceNote = detected.confidence === "low" ? " (low-confidence detection; use --shell to override)" : "";
    checks.push(check("shell", "pass", `Shell: ${detected.shell} via ${detected.source}${confidenceNote}`));
  } else {
    checks.push(check("shell", "warn", "Could not detect a supported shell; use --shell bash|zsh|fish|powershell|nushell|elvish|tcsh|xonsh|posix"));
  }

  const zoxidePath = deps.findExecutable("zoxide", env, platform);
  if (!zoxidePath) {
    checks.push(check("binary", "fail", "zoxide was not found on PATH"));
    recommendations.push({
      title: "Install zoxide",
      url: DOCS.install,
      reason: "Install the binary before checking shell initialization.",
    });
  } else {
    const version = deps.spawnSync(zoxidePath, ["--version"], { encoding: "utf8", windowsHide: true });
    if (version.status === 0) {
      checks.push(check("binary", "pass", `Found ${String(version.stdout).trim() || "zoxide"}`, { path: zoxidePath }));
    } else {
      checks.push(check("binary", "fail", "zoxide exists on PATH but `zoxide --version` failed", { path: zoxidePath }));
    }

    if (detected.shell) {
      const init = deps.spawnSync(zoxidePath, ["init", detected.shell], { encoding: "utf8", windowsHide: true });
      if (init.status === 0 && String(init.stdout).trim()) {
        checks.push(check("init-output", "pass", `zoxide generated initialization code for ${detected.shell}`));
      } else {
        checks.push(check("init-output", "fail", `zoxide could not generate initialization code for ${detected.shell}`));
      }

      if (scanConfig) {
        const files = configCandidates(detected.shell, home, env);
        const existing = files.filter((file) => deps.existsSync(file));
        const configured = existing.find((file) => {
          try {
            return containsActiveInit(deps.readFileSync(file, "utf8"), detected.shell);
          } catch {
            return false;
          }
        });

        if (configured) {
          checks.push(check("shell-config", "pass", `Active zoxide initialization found in ${configured}`, { path: configured }));
        } else {
          checks.push(check("shell-config", "warn", `No active zoxide initialization found in ${existing.length ? existing.join(", ") : "the usual shell config files"}`, {
            suggestedCommand: initCommand(detected.shell),
            checkedPaths: files,
          }));
          recommendations.push({
            title: "Configure shell integration",
            url: DOCS.shell,
            reason: `Add the ${detected.shell} initialization command to the correct profile.`,
          });
        }
      }
    }
  }

  const fzfPath = deps.findExecutable("fzf", env, platform);
  checks.push(fzfPath
    ? check("fzf", "pass", "Optional fzf integration is available", { path: fzfPath })
    : check("fzf", "info", "fzf is not on PATH; interactive selection is optional"));
  if (!fzfPath) {
    recommendations.push({
      title: "Optional fzf integration",
      url: DOCS.fzf,
      reason: "Install fzf if you want interactive directory selection.",
    });
  }

  if (checks.some((item) => item.level === "fail")) {
    recommendations.push({
      title: "Troubleshoot zoxide command not found",
      url: DOCS.troubleshoot,
      reason: "Check PATH, package installation, and profile loading steps.",
    });
  }

  const status = checks.some((item) => item.level === "fail")
    ? "error"
    : checks.some((item) => item.level === "warn")
      ? "warning"
      : "healthy";

  return {
    status,
    shell: detected,
    platform,
    checks,
    recommendations: recommendations.filter(
      (item, index, all) => all.findIndex((other) => other.url === item.url) === index,
    ),
  };
}

export function formatReport(report) {
  const labels = { pass: "PASS", warn: "WARN", fail: "FAIL", info: "INFO" };
  const lines = [`zoxide-doctor: ${report.status}`];
  for (const item of report.checks) {
    lines.push(`[${labels[item.level]}] ${item.message}`);
    if (item.suggestedCommand) lines.push(`       Add: ${item.suggestedCommand}`);
  }
  if (report.recommendations.length) {
    lines.push("", "Guides:");
    for (const item of report.recommendations) {
      lines.push(`- ${item.title}: ${item.url}`);
    }
  }
  return lines.join("\n");
}
