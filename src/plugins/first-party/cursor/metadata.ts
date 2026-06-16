import type { ToolMetadata } from '../../../tools/metadata.js';

export const cursorToolMetadata: ToolMetadata[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    category: 'editor',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Cursor.app',
      homebrew: {
        cask: 'cursor',
      },
    },
  },
];
