import { browserToolMetadata } from '../plugins/first-party/browser/metadata.js';
import { cursorToolMetadata } from '../plugins/first-party/cursor/metadata.js';
import { homebrewToolMetadata } from '../plugins/first-party/homebrew/metadata.js';
import { jetbrainsToolMetadata } from '../plugins/first-party/jetbrains/metadata.js';
import { neovimToolMetadata } from '../plugins/first-party/neovim/metadata.js';
import { vfoxToolMetadata } from '../plugins/first-party/vfox/metadata.js';
import { vscodeToolMetadata } from '../plugins/first-party/vscode/metadata.js';
import { zedToolMetadata } from '../plugins/first-party/zed/metadata.js';
import { noteTakingToolMetadata } from './note-taking-metadata.js';
import {
  validateToolMetadata,
  type ToolCategory,
  type ToolMetadata,
  type ToolPlatform,
  type ToolSource,
} from './metadata.js';

export const allToolMetadata = validateToolMetadata([
  ...browserToolMetadata,
  ...noteTakingToolMetadata,
  ...homebrewToolMetadata,
  ...vfoxToolMetadata,
  ...vscodeToolMetadata,
  ...neovimToolMetadata,
  ...jetbrainsToolMetadata,
  ...cursorToolMetadata,
  ...zedToolMetadata,
]);

export function getToolMetadata(id: string): ToolMetadata | undefined {
  return allToolMetadata.find(tool => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.category === category);
}

export function getToolsByPlatform(platform: ToolPlatform): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.supportedPlatforms.includes(platform));
}

export function getToolsByHomebrewFormula(formula: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.install?.homebrew?.formula === formula);
}

export function getToolsByHomebrewCask(cask: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.install?.homebrew?.cask === cask);
}

export function getToolsByHomebrewId(id: string): ToolMetadata[] {
  return allToolMetadata.filter(tool =>
    tool.install?.homebrew?.formula === id ||
    tool.install?.homebrew?.cask === id
  );
}

export function getToolsByConfigPath(path: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.configPaths?.some(configPath => pathMatches(configPath, path)));
}

export function getToolsByDotfilePath(path: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.dotfilePaths?.some(dotfilePath => pathMatches(dotfilePath, path)));
}

export function getToolsByVariant(variant: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.variants?.includes(variant));
}

export function getToolsBySource(source: ToolSource): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.source === source);
}

export function searchTools(query: string): ToolMetadata[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return allToolMetadata.filter(tool => {
    const fields = [
      tool.id,
      tool.label,
      tool.category,
      tool.install?.homebrew?.formula,
      tool.install?.homebrew?.cask,
      tool.externalIds?.defaultbrowser,
      ...(tool.variants ?? []),
    ].filter((value): value is string => typeof value === 'string').map(value => value.toLowerCase());

    return fields.some(value => value.includes(normalizedQuery));
  });
}

function pathMatches(knownPath: string, queryPath: string): boolean {
  const normalizedKnownPath = normalizePath(knownPath);
  const normalizedQueryPath = normalizePath(queryPath);

  return normalizedQueryPath === normalizedKnownPath ||
    normalizedQueryPath.startsWith(`${normalizedKnownPath}/`);
}

function normalizePath(path: string): string {
  return path.trim().replace(/\/+$/, '');
}
