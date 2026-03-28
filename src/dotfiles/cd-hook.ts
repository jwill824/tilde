import type { DeveloperContext } from '../config/schema.js';

const CD_HOOK_MARKER_BEGIN = '# --- tilde:cd-hook:begin ---';
const CD_HOOK_MARKER_END = '# --- tilde:cd-hook:end ---';

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
