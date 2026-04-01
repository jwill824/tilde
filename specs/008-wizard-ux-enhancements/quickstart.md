# Quickstart: Wizard UX & CLI Interaction Improvements

**Branch**: `008-wizard-ux-enhancements`
**Phase**: 1 — Design
**Date**: 2026-04-01

---

## What's New

This feature delivers three user-facing improvements:

1. **Wizard back navigation & skip** — correct mistakes without restarting
2. **`tilde update <resource>`** — change a single config item after setup
3. **New wizard steps** — browser selection, expanded editor choices, AI coding tools, language version scoping per workspace context

---

## Navigating the Wizard

### Going Back

At any wizard step (except the first), press the **back** key or select **← Back** to return to the previous step. Your previously entered values are restored automatically.

```
  Shell Selection
  ━━━━━━━━━━━━━━━
  ❯ zsh
    bash
    fish

  [← Back]  [→ Next]
```

### Skipping Optional Steps

Steps marked **optional** show a **Skip** action. Browser selection, editor configuration, and AI tools are all optional.

```
  Browser Selection  (optional)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Safari (installed)
  ○ Arc
  ○ Chrome

  [← Back]  [Skip]  [→ Next]
```

### Managing Contexts (Back Navigation)

Navigating back to the contexts step shows a **context list** — no contexts are lost.

```
  Workspace Contexts
  ━━━━━━━━━━━━━━━━━━
  ❯ personal   ~/personal   Node 22
    work       ~/work       Java 21, Node 18

  [+ Add context]  [← Back]  [→ Next]
```

---

## Updating a Single Config Resource

After initial setup, use `tilde update <resource>` to change one part of your config without re-running the full wizard.

### Examples

```bash
# Change your shell
tilde update shell

# Swap your primary editor
tilde update editor

# Add or remove browsers
tilde update browser

# Add AI coding tools
tilde update ai-tools

# Edit workspace contexts or language bindings
tilde update contexts
```

### Specifying a config path

```bash
tilde update shell --config ~/dotfiles/tilde.config.json
```

### Valid resources

```
shell, editor, applications, browser, ai-tools, contexts, languages
```

---

## Running Without `--config`

If no config file is provided and none is found automatically, tilde now shows a clear error instead of launching the wizard unexpectedly.

```
Error: No tilde.config.json found.

Searched:
  ./tilde.config.json
  ~/.config/tilde/tilde.config.json
  ~/tilde.config.json

Run the wizard to create one: tilde
Or specify: tilde install --config <path>
```

---

## Browser Selection Step

The browser step detects already-installed browsers and marks them pre-selected. You can add more and optionally set a default.

- macOS will show a system confirmation dialog when setting a default browser — this is required by the OS and cannot be skipped.
- If you skip this step, no browsers are changed.

---

## Editor Choices

The editor/configuration step now offers:

| Editor | Notes |
|--------|-------|
| VS Code | Profile sync available |
| Cursor | AI-native editor |
| JetBrains IDEs | Settings sync guidance provided |
| Neovim | Dotfile-based config applied if present |
| Zed | `settings.json`-based config |

Select multiple — your primary editor is indicated separately.

---

## AI Coding Tools Step

The AI tools step shows all tools installable via Homebrew, grouped by type. Tools with multiple variants (e.g., Claude Code CLI vs. Claude Desktop app) appear as separate entries with purpose labels.

| Tool | Type |
|------|------|
| Claude Code | CLI tool |
| Claude Desktop | Desktop app |
| Cursor | Desktop app / editor |
| Windsurf (Codeium) | Desktop app |
| GitHub Copilot CLI | CLI extension (via gh) |

If your machine has no internet connection, tilde will warn and skip installs — you can retry with `tilde update ai-tools` once connectivity is restored.

---

## Language Versions Per Context

When configuring workspace contexts, you can optionally bind one or more language runtimes to each context. tilde writes the appropriate version file (e.g., `.nvmrc`, `.vfox.json`) to the context directory root.

```
  Workspace Context: work
  ━━━━━━━━━━━━━━━━━━━━━━━
  Directory: ~/work
  Language versions:
    ❯ java  21.0.3
      nodejs  18.20.0

  [+ Add runtime]  [→ Next]
```

When you `cd` into a context directory, your version manager automatically activates the configured versions — no manual `nvm use` or `vfox use` needed.

**Prerequisite**: your version manager (vfox, nvm, mise) must be installed and configured before language bindings take effect. tilde will prompt to install the version if it is not yet available.
