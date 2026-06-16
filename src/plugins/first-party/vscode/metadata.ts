import type { ToolMetadata } from '../../../tools/metadata.js';

export const vscodeToolMetadata: ToolMetadata[] = [
  {
    id: 'vscode',
    label: 'Visual Studio Code',
    category: 'editor',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      appPath: '/Applications/Visual Studio Code.app',
      homebrew: {
        cask: 'visual-studio-code',
      },
    },
  },
];
