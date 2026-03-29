---
title: Getting Started
description: Run tilde for the first time and configure your macOS developer environment.
---

This guide walks you through your first tilde run after installation.

## Prerequisites

- **macOS** (Apple Silicon recommended; Intel supported)
- **Node.js 20+** — installed automatically if you used the [curl installer](/installation/)
- An internet connection (tilde downloads tools on first run)

## Launch tilde

If you installed via curl, tilde launches automatically at the end of the install
script. To run it again at any time:

```bash
tilde
```

## The setup wizard

tilde's interactive wizard walks you through each configuration category in order.
You can skip any category and revisit it later by re-running `tilde`.

### 1. Shell

tilde asks which shell you use:

- **zsh** *(default on macOS)*
- **bash**
- **fish**

### 2. Package manager

Choose your preferred macOS package manager:

- **Homebrew** *(recommended)* — tilde uses Homebrew to install all command-line tools.

### 3. Version manager

Select how you want to manage programming language versions:

- **vfox** — universal, shell-agnostic version manager *(recommended)*
- **nvm** — Node.js version manager
- **pyenv** — Python version manager
- **sdkman** — JVM/JDK version manager

### 4. Languages

Select which programming languages to configure. For each language, tilde asks for
your preferred version (or uses the latest stable).

Supported: **Node.js**, **Python**, **Ruby**, **Go**, **Java**, **Rust**

### 5. Workspace

Configure your local directory structure — tilde creates a `~/dev/` workspace
(or your preferred path) with per-account project folders.

### 6. Git identity

Set your global git name, email, and default branch name. If you have multiple
GitHub accounts (personal + work), tilde configures per-directory git identities.

### 7. GitHub accounts

Connect one or more GitHub accounts. tilde configures SSH keys and git credential
helpers for each account.

### 8. Tools

Select additional CLI tools to install via Homebrew:

- **Docker Desktop**
- **VS Code** (via Homebrew Cask)
- **Terraform**, **kubectl**, **helm** (cloud/infra tools)
- Any custom tools you add to `tilde.config.json`

### 9. Secrets

Configure a secrets backend to sync credentials and tokens:

- **1Password CLI** *(recommended for macOS)*
- **Bitwarden CLI**
- **Environment file** (plain `.env` — not recommended for shared machines)

### 10. Browsers

Choose browsers to install via Homebrew Cask:

- **Google Chrome**
- **Firefox**
- **Arc**
- **Brave**

## Expected output

A successful first run looks like this:

```
tilde 🌿 — macOS Developer Environment Setup

  ✓  Shell: zsh
  ✓  Package manager: Homebrew
  ✓  Version manager: vfox
  ✓  Languages: Node.js 20, Python 3.12
  ✓  Workspace: ~/dev/
  ✓  Git identity configured
  ✓  GitHub: jwill824 (SSH key added)
  ✓  Tools: docker, code, terraform
  ✓  Secrets: 1Password CLI linked
  ✓  Browsers: Chrome, Arc

  Setup complete. Your environment is ready. 🎉
```

Your configuration is saved to `~/.tilde/tilde.config.json`.

## Troubleshooting

### Node.js not found

If tilde reports `node: command not found`, make sure your shell profile sources
the Node.js path. Run:

```bash
source ~/.zshrc   # or ~/.bashrc / ~/.config/fish/config.fish
```

Then try `tilde` again. If you used the curl installer, it adds Node.js to your
PATH automatically.

### Permission errors on npm global install

If you see `EACCES` errors, your npm global prefix may be owned by root. Fix with:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="$HOME/.npm-global/bin:$PATH"
```

Add the `export PATH` line to your shell profile (`~/.zshrc` or `~/.bashrc`).

### Wizard exits unexpectedly

If the wizard exits without completing:

1. Check the error message — it will indicate which step failed.
2. Run `tilde --debug` for verbose output.
3. Re-run `tilde` — it is idempotent and will resume from where it can.
4. [Open an issue](https://github.com/jwill824/tilde/issues) with the debug output.
