import type { ToolMetadata } from '../../../tools/metadata.js';

export const vfoxToolMetadata: ToolMetadata[] = [
  {
    id: 'vfox',
    label: 'vfox',
    category: 'version-manager',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      homebrew: {
        formula: 'vfox',
      },
    },
  },
];
