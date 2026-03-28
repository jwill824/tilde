import type { DeveloperContext } from '../config/schema.js';

/**
 * Generate a zsh cd() function that switches gh-cli account based on PWD.
 * Phase 6 (US4) full implementation.
 */
export function generateCdHook(
  contexts: Array<DeveloperContext & { username?: string }>
): string {
  const cases = contexts
    .filter(ctx => ctx.authMethod === 'gh-cli' && ctx.github?.username)
    .map(ctx => {
      const expandedPath = ctx.path.replace(/^~/, '$HOME');
      return `    ${expandedPath}*)\n      gh auth switch --user ${ctx.github!.username} 2>/dev/null || true\n      ;;`;
    })
    .join('\n');

  if (!cases) return '';

  return `# tilde: context-aware cd hook
function cd() {
  builtin cd "$@" || return
  case "$PWD" in
${cases}
  esac
}`;
}
