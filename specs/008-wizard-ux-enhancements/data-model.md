# Data Model: Wizard UX & CLI Interaction Improvements

**Branch**: `008-wizard-ux-enhancements`
**Phase**: 1 — Design
**Date**: 2026-04-01

---

## 1. Wizard Navigation State (in-memory, not persisted)

### `WizardState`

```typescript
interface WizardState {
  // Ordered list of step definitions for this run
  steps: StepDefinition[];

  // Navigation history — supports back navigation
  history: StepFrame[];

  // Index into `steps` for the currently rendered step
  currentIndex: number;
}

interface StepDefinition {
  id: string;               // e.g., "shell", "browser", "ai-tools"
  component: React.FC<StepProps>;
  required: boolean;        // false → skip action available
  label: string;            // human-readable label for progress display
}

interface StepFrame {
  stepIndex: number;
  values: Record<string, unknown>;  // snapshot of form values when step was left
}
```

### Navigation Rules

| Action | Behaviour |
|--------|-----------|
| **Next** | Push current `{ stepIndex, values }` onto `history`; advance `currentIndex` |
| **Back** | Pop from `history`; restore `currentIndex` and pre-populate form values |
| **Skip** | Only available when `required === false`; treated as Next with empty/null values |
| **Back on step 0** | Back action is disabled (no history entry to pop) |
| **Back to context step** | Renders `ContextListView` (see §3) — does not discard existing contexts |

---

## 2. Config Schema Changes (tilde.config.json)

All changes are additive. `schemaVersion: '1.5'`). Existing configs without new fields remain valid; missing fields default to empty/null.

### New top-level `browser` field

```typescript
interface BrowserConfig {
  selected: string[];    // e.g., ["chrome", "firefox"]
  default: string | null; // e.g., "chrome" — null means no default set
}
```

### Extended `editors` field (replaces implicit VS Code assumption)

```typescript
interface EditorsConfig {
  primary: string;           // e.g., "vscode", "cursor", "neovim"
  additional: string[];      // e.g., ["webstorm"]
  // Note: editor plugin configurations (profiles, dotfiles) live in plugins/
}
```

### New top-level `aiTools` field

```typescript
interface AIToolConfig {
  name: string;       // e.g., "claude-desktop"
  label: string;      // e.g., "Claude Desktop"
  variant: string;    // e.g., "desktop-app" | "cli-tool" | "editor-extension"
}

// In tilde.config.json:
// "aiTools": [{ "name": "claude-desktop", "label": "Claude Desktop", "variant": "desktop-app" }]
```

### Extended `contexts[].languageBindings`

```typescript
interface LanguageBinding {
  runtime: string;   // e.g., "nodejs", "java", "python"
  version: string;   // e.g., "22.0.0", "21.0.3", "3.12.0"
}

// Added to existing ContextConfig:
interface ContextConfig {
  name: string;
  directory: string;
  gitIdentity: GitIdentity;
  // ... existing fields ...
  languageBindings: LanguageBinding[];  // NEW — empty array if not configured
}
```

### Full example of new config shape

```json
{
  "schemaVersion": "1.5",
  "shell": "zsh",
  "editors": {
    "primary": "cursor",
    "additional": ["neovim"]
  },
  "browser": {
    "selected": ["arc", "chrome"],
    "default": "arc"
  },
  "aiTools": [
    { "name": "claude-code", "label": "Claude Code", "variant": "cli-tool" },
    { "name": "cursor",      "label": "Cursor",      "variant": "desktop-app" }
  ],
  "contexts": [
    {
      "name": "personal",
      "directory": "~/personal",
      "languageBindings": [
        { "runtime": "nodejs", "version": "22.0.0" }
      ]
    },
    {
      "name": "work",
      "directory": "~/work",
      "languageBindings": [
        { "runtime": "java",   "version": "21.0.3" },
        { "runtime": "nodejs", "version": "18.20.0" }
      ]
    }
  ]
}
```

---

## 3. Context List View (in-wizard UI entity)

When back-navigation reaches the contexts step, the wizard renders a `ContextListView` instead of the new-context form. This is a UI-only entity (not persisted independently of the config).

```typescript
interface ContextListEntry {
  context: ContextConfig;
  action: "none" | "edit" | "remove";  // user selection state
}
```

**Behaviour**:
- All previously defined contexts shown as selectable rows
- "Edit" → re-enters single-context form with values pre-populated
- "Remove" → removes context from in-memory wizard state (not written until config export)
- "Add new" → enters single-context form blank
- "Done" → advances wizard to next step

---

## 4. Plugin Interface Extensions

### `BrowserPlugin` (new, extends `Plugin`)

```typescript
interface BrowserPlugin extends Plugin {
  category: "browser";
  detectInstalled(): Promise<string[]>;           // returns browser IDs found on disk
  install(browserId: string): Promise<void>;
  setDefault(browserId: string): Promise<void>;   // triggers macOS confirmation dialog
}
```

### `EditorPlugin` (new, extends `Plugin`)

```typescript
interface EditorPlugin extends Plugin {
  category: "editor";
  editorId: string;                               // e.g., "vscode", "cursor", "neovim"
  detectInstalled(): Promise<boolean>;
  install(): Promise<void>;
  applyProfile?(): Promise<void>;                 // optional — dotfile/settings application
}
```

---

## 5. `tilde update` Command Routing

The `update` subcommand parses a resource name and routes to the corresponding mini-wizard step component in isolation (no full wizard stack).

```typescript
type UpdateResource =
  | "shell"
  | "editor"
  | "applications"
  | "browser"
  | "ai-tools"
  | "contexts"
  | "languages";

interface UpdateCommand {
  resource: UpdateResource;
  configPath: string;   // resolved config file path
}
```

**Validation**: If `resource` is not a member of `UpdateResource`, print the valid list and exit 1.
**Config requirement**: `tilde update` MUST fail with a clear error if no config file is discoverable.
