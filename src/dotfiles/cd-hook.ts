import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { DeveloperContext, LanguageBinding } from '../config/schema.js';

const CD_HOOK_MARKER_BEGIN = '# --- tilde:cd-hook:begin ---';
const CD_HOOK_MARKER_END = '# --- tilde:cd-hook:end ---';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

export function generateCdHook(contexts: DeveloperContext[]): string {
  const cases = contexts
    .filter(ctx => ctx.authMethod === 'gh-cli' && ctx.github?.username)
    .map(ctx => {
      const expandedPath = ctx.path.replace(/^~/, '$HOME');
      return `    ${expandedPath}*)\n      gh auth switch --user ${ctx.github!.username} 2>/dev/null || true\n      ;;`;
    })
    .join('\n');

  if (!cases) return '';

  const fn = `function cd() {
  builtin cd "$@" || return
  case "$PWD" in
${cases}
    *) ;;
  esac
}`;

  return `${CD_HOOK_MARKER_BEGIN}\n${fn}\n${CD_HOOK_MARKER_END}`;
}

export function hasCdHook(zshrcContent: string): boolean {
  return zshrcContent.includes(CD_HOOK_MARKER_BEGIN);
}

// ---------------------------------------------------------------------------
// Language version file generation (T030)
//
// Writes version files to each context directory root so the version manager's
// own shell hook activates the correct version on `cd`.
//
// Per research.md §4:
//   vfox  → .vfox.json     { "nodejs": "22.0.0", "java": "21.0.0" }
//   nvm   → .nvmrc         "22" (single runtime only — takes first node binding)
//   mise  → .tool-versions "nodejs 22.0.0\njava 21.0.0"
// ---------------------------------------------------------------------------

/**
 * Detects which version manager is active based on the versionManagers list.
 * Falls back to 'none' if no binding can be written.
 */
export type VersionManagerKind = 'vfox' | 'nvm' | 'mise' | 'pyenv' | 'sdkman' | 'none';

/**
 * Write version files for all contexts that have languageBindings.
 *
 * - Missing/empty bindings are skipped silently (T031).
 * - Write failures per-context are collected and returned (not thrown) for
 *   offline-resilience — the caller can warn and continue.
 */
export async function writeVersionFiles(
  contexts: DeveloperContext[],
  versionManagerKind: VersionManagerKind = 'none',
): Promise<{ context: string; error: string }[]> {
  const failures: { context: string; error: string }[] = [];

  for (const ctx of contexts) {
    const bindings = ctx.languageBindings ?? [];
    if (bindings.length === 0) continue;  // T031: skip empty bindings

    const contextDir = expandTilde(ctx.path);

    try {
      await mkdir(contextDir, { recursive: true });
      await writeVersionFile(contextDir, bindings, versionManagerKind);
    } catch (err) {
      // T031: collect errors instead of throwing — offline/missing dir is non-fatal
      failures.push({ context: ctx.label, error: (err as Error).message });
    }
  }

  return failures;
}

/**
 * Write the appropriate version file for the given bindings and version manager.
 */
export async function writeVersionFile(
  contextDir: string,
  bindings: LanguageBinding[],
  versionManagerKind: VersionManagerKind,
): Promise<void> {
  if (bindings.length === 0) return;

  switch (versionManagerKind) {
    case 'vfox': {
      const vfoxConfig: Record<string, string> = {};
      for (const b of bindings) {
        vfoxConfig[b.runtime] = b.version;
      }
      await writeFile(
        join(contextDir, '.vfox.json'),
        JSON.stringify(vfoxConfig, null, 2) + '\n',
        'utf-8'
      );
      break;
    }

    case 'nvm': {
      // nvm only handles Node.js — use first nodejs binding
      const nodeBinding = bindings.find(b =>
        b.runtime === 'nodejs' || b.runtime === 'node'
      );
      if (nodeBinding) {
        // .nvmrc typically contains just the major version number
        const majorVersion = nodeBinding.version.split('.')[0];
        await writeFile(
          join(contextDir, '.nvmrc'),
          majorVersion + '\n',
          'utf-8'
        );
      }
      break;
    }

    case 'mise': {
      // mise (and asdf) use .tool-versions format: "runtime version"
      const lines = bindings.map(b => `${b.runtime} ${b.version}`).join('\n');
      await writeFile(
        join(contextDir, '.tool-versions'),
        lines + '\n',
        'utf-8'
      );
      break;
    }

    case 'pyenv': {
      // pyenv uses .python-version file — only python bindings
      const pythonBinding = bindings.find(b =>
        b.runtime === 'python' || b.runtime === 'python3'
      );
      if (pythonBinding) {
        await writeFile(
          join(contextDir, '.python-version'),
          pythonBinding.version + '\n',
          'utf-8'
        );
      }
      break;
    }

    case 'sdkman': {
      // sdkman uses .sdkmanrc format: "java=21.0.3.fx-zulu"
      const javaBinding = bindings.find(b => b.runtime === 'java');
      if (javaBinding) {
        await writeFile(
          join(contextDir, '.sdkmanrc'),
          `java=${javaBinding.version}\n`,
          'utf-8'
        );
      }
      break;
    }

    case 'none':
    default:
      // No version manager configured — skip silently
      break;
  }
}
