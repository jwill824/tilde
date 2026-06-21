import type { ToolMetadata } from '../../../tools/metadata.js';

export const browserToolMetadata: ToolMetadata[] = [
  {
    id: 'safari',
    label: 'Safari',
    category: 'browser',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Safari.app',
    },
    externalIds: {
      defaultbrowser: 'safari',
    },
  },
  {
    id: 'chrome',
    label: 'Google Chrome',
    category: 'browser',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Google Chrome.app',
      homebrew: {
        cask: 'google-chrome',
      },
    },
    externalIds: {
      defaultbrowser: 'chrome',
    },
  },
  {
    id: 'firefox',
    label: 'Firefox',
    category: 'browser',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Firefox.app',
      homebrew: {
        cask: 'firefox',
      },
    },
    externalIds: {
      defaultbrowser: 'firefox',
    },
  },
  {
    id: 'arc',
    label: 'Arc',
    category: 'browser',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Arc.app',
      homebrew: {
        cask: 'arc',
      },
    },
    externalIds: {
      defaultbrowser: 'arc',
    },
  },
  {
    id: 'brave',
    label: 'Brave Browser',
    category: 'browser',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Brave Browser.app',
      homebrew: {
        cask: 'brave-browser',
      },
    },
    externalIds: {
      defaultbrowser: 'brave',
    },
  },
  {
    id: 'edge',
    label: 'Microsoft Edge',
    category: 'browser',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Microsoft Edge.app',
      homebrew: {
        cask: 'microsoft-edge',
      },
    },
    externalIds: {
      defaultbrowser: 'edge',
    },
  },
];
