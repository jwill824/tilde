/**
 * First-party AIToolPlugin implementations (H3 / Principle VIII compliance).
 *
 * Each AI coding assistant is a plugin instance implementing AIToolPlugin.
 * The AI tools wizard step queries AI_TOOL_PLUGINS rather than embedding
 * tool definitions as inline literals — per constitution Principle VIII and FR-011.
 *
 * Cursor appears here as an AI coding assistant entry distinct from its
 * EditorPlugin entry. Both entries coexist; each is labeled by context
 * ("Cursor — editor" vs "Cursor — AI coding assistant").
 */
import type { AIToolPlugin } from '../../api.js';
import { installFormula, installCask, isFormulaInstalled, isCaskInstalled } from '../../../utils/package-manager.js';

// ---------------------------------------------------------------------------
// Base implementation
// ---------------------------------------------------------------------------

abstract class BaseAIToolPlugin implements AIToolPlugin {
  readonly category = 'ai-tool' as const;
  abstract readonly name: string;
  abstract readonly label: string;
  abstract readonly variant: string;
  abstract readonly brewId: string;
  abstract readonly brewType: 'formula' | 'cask';

  async detectInstalled(): Promise<boolean> {
    return this.brewType === 'formula'
      ? isFormulaInstalled(this.brewId)
      : isCaskInstalled(this.brewId);
  }

  async install(): Promise<void> {
    if (this.brewType === 'formula') {
      await installFormula(this.brewId);
    } else {
      await installCask(this.brewId);
    }
  }
}

// ---------------------------------------------------------------------------
// Plugin implementations
// ---------------------------------------------------------------------------

class ClaudeCodePlugin extends BaseAIToolPlugin {
  readonly name = 'claude-code';
  readonly label = 'Claude Code';
  readonly variant = 'cli-tool';
  readonly brewId = 'anthropics/tap/claude';
  readonly brewType = 'formula' as const;
}

class ClaudeDesktopPlugin extends BaseAIToolPlugin {
  readonly name = 'claude-desktop';
  readonly label = 'Claude Desktop';
  readonly variant = 'desktop-app';
  readonly brewId = 'claude';
  readonly brewType = 'cask' as const;
}

/** Cursor as AI coding assistant (distinct from CursorPlugin in editor category) */
class CursorAIPlugin extends BaseAIToolPlugin {
  readonly name = 'cursor-ai';
  readonly label = 'Cursor — AI coding assistant';
  readonly variant = 'ai-editor';
  readonly brewId = 'cursor';
  readonly brewType = 'cask' as const;
}

class WindsurfPlugin extends BaseAIToolPlugin {
  readonly name = 'windsurf';
  readonly label = 'Windsurf (Codeium)';
  readonly variant = 'ai-editor';
  readonly brewId = 'windsurf';
  readonly brewType = 'cask' as const;
}

class GitHubCopilotCLIPlugin extends BaseAIToolPlugin {
  readonly name = 'gh-copilot';
  readonly label = 'GitHub Copilot CLI';
  readonly variant = 'cli-extension';
  readonly brewId = 'gh';
  readonly brewType = 'formula' as const;
}

// ---------------------------------------------------------------------------
// Registry — queried by the AI tools wizard step
// ---------------------------------------------------------------------------

export const AI_TOOL_PLUGINS: AIToolPlugin[] = [
  new ClaudeCodePlugin(),
  new ClaudeDesktopPlugin(),
  new CursorAIPlugin(),
  new WindsurfPlugin(),
  new GitHubCopilotCLIPlugin(),
];
