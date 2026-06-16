import type { ToolMetadata } from '../../../tools/metadata.js';

export const homebrewToolMetadata: ToolMetadata[] = [
  {
    id: 'homebrew',
    label: 'Homebrew',
    category: 'package-manager',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      manualNote: 'Install from https://brew.sh',
    },
  },
];
