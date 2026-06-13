import { browserToolMetadata } from '../plugins/first-party/browser/metadata.js';
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
  return allToolMetadata.filter(tool => tool.configPaths?.includes(path));
}

export function getToolsByDotfilePath(path: string): ToolMetadata[] {
  return allToolMetadata.filter(tool => tool.dotfilePaths?.includes(path));
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
