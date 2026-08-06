#!/usr/bin/env node

import { formatReport, runDiagnostics, SUPPORTED_SHELLS } from "../src/index.js";

const HELP = `zoxide-doctor - check zoxide installation and shell setup

Usage:
  zoxide-doctor [options]

Options:
  --shell <name>      Override shell detection (${SUPPORTED_SHELLS.join(", ")})
  --json              Print machine-readable JSON
  --no-config-scan    Do not inspect common shell profile files
  -h, --help          Show help
  -v, --version       Show version
`;

function parseArgs(argv) {
  const options = { scanConfig: true, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--no-config-scan") options.scanConfig = false;
    else if (arg === "--shell") options.shell = argv[++index];
    else if (arg.startsWith("--shell=")) options.shell = arg.slice("--shell=".length);
    else if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "-v" || arg === "--version") options.version = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.shell && !SUPPORTED_SHELLS.includes(options.shell.toLowerCase())) {
    throw new Error(`Unsupported shell: ${options.shell}`);
  }
  return options;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error("Run `zoxide-doctor --help` for usage.");
  process.exitCode = 2;
}

if (options?.help) {
  console.log(HELP);
} else if (options?.version) {
  console.log("0.1.0");
} else if (options) {
  const report = runDiagnostics(options);
  console.log(options.json ? JSON.stringify(report, null, 2) : formatReport(report));
  process.exitCode = report.status === "healthy" ? 0 : 1;
}
