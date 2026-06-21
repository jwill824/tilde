import type { ToolMetadata } from '../../../tools/metadata.js';

export const zedToolMetadata: ToolMetadata[] = [
  {
    id: 'zed',
    label: 'Zed',
    category: 'editor',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Zed.app',
      homebrew: {
        cask: 'zed',
      },
    },
    configPaths: ['~/.config/zed'],
  },
];
