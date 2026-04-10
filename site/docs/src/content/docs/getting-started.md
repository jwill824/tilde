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

## Navigating the wizard

Use these keyboard shortcuts at any time:

| Key | Action |
|-----|--------|
| **← / b** | Go back to the previous step (values restored) |
| **s** | Skip the current step *(optional steps only)* |
| **q** | Quit the wizard |

On the first step, pressing **b** shows a reminder that there is no previous step.
Optional steps — **Editor Configuration**, **Browser Selection**, and **AI Coding Tools** — are labelled with `(opt)` in the sidebar and can be skipped.

## The setup wizard

tilde's interactive wizard walks you through 13 steps. Steps 0–1 run automatically (no input required); steps 2–12 are interactive.

### 0. Config Detection *(automated)*

tilde scans three locations for an existing `tilde.config.json`:
1. The current working directory
2. `~/.tilde/`
3. `~/dotfiles/` (if it exists)

If no config is found, the wizard proceeds to full setup. If a partial config is found, you are offered the option to resume or start over.

### 1. Environment Capture *(automated)*

tilde scans your machine for installed tools, shell rc files, git config, Homebrew packages, and programming languages already present. This information pre-fills later steps.

### 2. Shell

tilde asks which shell you use:

- **zsh** *(default on macOS)*
- **bash**
- **fish**

### 3. Package Manager

Choose your preferred macOS package manager:

- **Homebrew** *(recommended)* — tilde uses Homebrew to install all command-line tools.
- **MacPorts**

### 4. Version Manager

Select how you want to manage programming language versions:

- **vfox** — universal, shell-agnostic version manager *(recommended)*
- **nvm** — Node.js version manager
- **fnm** — fast Node.js version manager
- **pyenv** — Python version manager
- **rbenv** — Ruby version manager
- **python-venv** — Python virtual environment manager
- **sdkman** — JVM/JDK version manager

### 5. Workspace & Contexts

All workspace, identity, and language configuration is collected in one step:

1. **Workspace root** — the parent directory for all project folders (e.g., `~/Developer`)
2. **Named contexts** — one entry per identity (personal, work, etc.), each with:
   - Context label and workspace path
   - Git name and email
   - GitHub authentication method (`gh-cli`, `https`, or `ssh`)
   - GitHub username *(optional)*
   - Dotfiles path *(optional)*
   - Language version bindings *(optional — see below)*
3. **Language version bindings** — per context, select languages and specify versions:
   - Supported: **Node.js**, **Python**, **Ruby**, **Go**, **Java**, **Rust**
   - For each language, choose a version manager and version (or enter manually)

### 6. Tools & Applications

Select CLI tools and applications to install via Homebrew:

- **Docker Desktop**
- **VS Code** (via Homebrew Cask)
- **Terraform**, **kubectl**, **helm** (cloud/infra tools)
- Any custom tools you add to `tilde.config.json`

### 7. Editor Configuration *(optional)*

Choose a primary code editor to install via Homebrew Cask:

- **VS Code**
- **Cursor (AI Editor)**
- **Neovim**
- **JetBrains Toolbox**
- **Zed**

### 8. Secrets Backend

Configure a secrets backend to sync credentials and tokens:

- **1Password CLI** *(recommended for macOS)*
- **macOS Keychain**
- **Environment variables only**

### 9. Browser Selection *(optional)*

Choose a browser to install via Homebrew Cask:

- **Google Chrome**
- **Firefox**
- **Arc**
- **Brave**
- **Safari** *(pre-installed)*

### 10. AI Coding Tools *(optional)*

Choose AI coding tools to install via Homebrew:

- **Claude Code** (CLI)
- **Claude Desktop** (desktop app)
- **Cursor (AI Editor)**
- **Windsurf**
- **GitHub Copilot CLI**

### 11. Config Export

Review your complete configuration before it is written to disk. tilde writes `~/.tilde/tilde.config.json` (or a custom path) at this step.

### 12. Apply & Finish

tilde runs all installation and configuration steps based on your saved config. Progress is shown in real time.

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
  ✓  Editor: VS Code
  ✓  Browser: Arc
  ✓  AI tools: Claude Code, GitHub Copilot CLI

  Setup complete. Your environment is ready. 🎉
```

Your configuration is saved to `~/.tilde/tilde.config.json`.

## Updating your config

After initial setup, use `tilde update <resource>` to change one part of your config without re-running the full wizard.

### Examples

```bash
# Change your shell
tilde update shell

# Add or remove browsers
tilde update browser

# Add AI coding tools
tilde update ai-tools

# Edit workspace contexts or language bindings
tilde update contexts
```

### Valid resources

`shell`, `editor`, `applications`, `browser`, `ai-tools`, `contexts`, `languages`

### Specifying a config path

```bash
tilde update shell --config ~/dotfiles/tilde.config.json
```

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
