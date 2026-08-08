# zoxide-doctor

`zoxide-doctor` is a small, dependency-free diagnostic CLI for zoxide. It checks whether the binary is on `PATH`, whether `zoxide init` works for the selected shell, whether a common shell profile contains active initialization, and whether the optional `fzf` integration is available.

This is an independent community tool. It is not affiliated with or endorsed by Ajeet D'Souza or the official zoxide project.

![zoxide-doctor terminal diagnostic output](https://raw.githubusercontent.com/jiankn/zoxide-doctor/main/docs/assets/zoxide-doctor-terminal-preview.png)

## Run it

After the npm release:

```bash
npx zoxide-doctor
```

From GitHub:

```bash
npx github:jiankn/zoxide-doctor
```

Choose a shell explicitly when auto-detection is ambiguous:

```bash
zoxide-doctor --shell zsh
zoxide-doctor --shell fish --json
zoxide-doctor --shell powershell --no-config-scan
```

The command exits with status `0` only when all required checks pass, `1` for setup warnings or failures, and `2` for invalid arguments.

## What it checks

- `zoxide` can be resolved from `PATH` and `zoxide --version` succeeds.
- `zoxide init <shell>` returns initialization code.
- A conventional profile such as `.bashrc`, `.zshrc`, `config.fish`, or a PowerShell profile contains an active `zoxide init` line.
- `fzf` is available for optional interactive selection.

See the independent [zoxide-doctor documentation](https://zoxide.org/tools/zoxide-doctor/) for supported shells, privacy details, and current run instructions. When a check fails, the report links to the relevant [zoxide command not found troubleshooting guide](https://zoxide.org/blog/zoxide-command-not-found/). The upstream binary and authoritative source remain in the [official zoxide repository](https://github.com/ajeetdsouza/zoxide).

## Development

```bash
npm install
npm run lint
npm test
npm run pack:check
npm run smoke
```

The smoke test packs the same tarball used for publication, installs it into a temporary project, and invokes the installed CLI.

## License

MIT
