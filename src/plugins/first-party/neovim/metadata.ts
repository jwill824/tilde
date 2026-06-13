import type { ToolMetadata } from '../../../tools/metadata.js';

export const neovimToolMetadata: ToolMetadata[] = [
  {
    id: 'neovim',
    label: 'Neovim',
    category: 'editor',
    supportedPlatforms: ['darwin'],
    source: 'first-party',
    install: {
      homebrew: {
        formula: 'neovim',
      },
    },
    configPaths: ['~/.config/nvim'],
  },
];
