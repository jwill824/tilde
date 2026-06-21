import type { ToolMetadata } from './metadata.js';

export const noteTakingToolMetadata: ToolMetadata[] = [
  {
    id: 'obsidian',
    label: 'Obsidian',
    category: 'note-taking',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Obsidian.app',
      homebrew: {
        cask: 'obsidian',
      },
    },
    configPaths: ['~/Library/Application Support/obsidian'],
    dotfilePaths: ['~/.obsidian'],
    variants: ['knowledge-base'],
  },
  {
    id: 'notion',
    label: 'Notion',
    category: 'note-taking',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Notion.app',
      homebrew: {
        cask: 'notion',
      },
    },
    variants: ['knowledge-base'],
  },
  {
    id: 'bear',
    label: 'Bear',
    category: 'note-taking',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Bear.app',
      manualNote: 'App Store only',
    },
  },
];
