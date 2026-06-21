import type { ToolMetadata } from '../../../tools/metadata.js';

export const jetbrainsToolMetadata: ToolMetadata[] = [
  {
    id: 'webstorm',
    label: 'WebStorm',
    category: 'editor',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/WebStorm.app',
      homebrew: {
        cask: 'webstorm',
      },
    },
  },
  {
    id: 'intellij',
    label: 'IntelliJ IDEA',
    category: 'editor',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/IntelliJ IDEA.app',
      homebrew: {
        cask: 'intellij-idea',
      },
    },
  },
];
