import { describe, expect, it } from 'vitest';
import {
  ToolMetadataSchema,
  validateToolMetadata,
} from '../../src/tools/metadata.js';
import {
  allToolMetadata,
  getToolMetadata,
  getToolsByCategory,
  getToolsByHomebrewCask,
  getToolsByPlatform,
  getToolsBySource,
  searchTools,
} from '../../src/tools/registry.js';
import { noteTakingToolMetadata } from '../../src/tools/note-taking-metadata.js';
import { browserToolMetadata } from '../../src/plugins/first-party/browser/metadata.js';

describe('browserToolMetadata', () => {
  it('D-01/D-08 defines the current browser catalog in one family-owned source', () => {
    expect(browserToolMetadata.map(tool => [tool.id, tool.label])).toEqual([
      ['safari', 'Safari'],
      ['chrome', 'Google Chrome'],
      ['firefox', 'Firefox'],
      ['arc', 'Arc'],
      ['brave', 'Brave Browser'],
      ['edge', 'Microsoft Edge'],
    ]);

    for (const browser of browserToolMetadata) {
      expect(browser.category).toBe('browser');
      expect(browser.supportedPlatforms).toEqual(['darwin']);
      expect(browser.install?.appPath).toMatch(/^\/Applications\/.+\.app$/);
      expect(browser.externalIds?.defaultbrowser).toBeTruthy();
    }
  });
});

describe('noteTakingToolMetadata', () => {
  it('D-03 seeds the non-plugin note-taking catalog from the tools step', () => {
    expect(noteTakingToolMetadata.map(tool => [tool.id, tool.label])).toEqual([
      ['obsidian', 'Obsidian'],
      ['notion', 'Notion'],
      ['bear', 'Bear'],
    ]);

    expect(getToolsByHomebrewCask('obsidian').map(tool => tool.id)).toEqual(['obsidian']);
    expect(getToolsByHomebrewCask('notion').map(tool => tool.id)).toEqual(['notion']);
    expect(getToolMetadata('bear')?.install?.manualNote).toBe('App Store only');
    expect(getToolMetadata('bear')?.install?.homebrew?.cask).toBeUndefined();
  });
});

describe('ToolMetadataSchema', () => {
  it('D-10/D-11 accepts valid browser and note-taking metadata', () => {
    expect(ToolMetadataSchema.safeParse(browserToolMetadata[0]).success).toBe(true);
    expect(ToolMetadataSchema.safeParse(noteTakingToolMetadata[0]).success).toBe(true);
    expect(() => validateToolMetadata(allToolMetadata)).not.toThrow();
  });

  it.each(['id', 'label', 'category', 'supportedPlatforms'] as const)(
    'D-10/D-11 rejects missing required field %s',
    (field) => {
      const fixture = { ...browserToolMetadata[1] };
      delete fixture[field];

      expect(ToolMetadataSchema.safeParse(fixture).success).toBe(false);
    }
  );

  it('D-12 allows optional arrays to be empty or absent but validates entries when present', () => {
    const base = browserToolMetadata[1];

    expect(ToolMetadataSchema.safeParse({
      ...base,
      configPaths: [],
      dotfilePaths: [],
      variants: [],
    }).success).toBe(true);

    expect(ToolMetadataSchema.safeParse({
      ...base,
      configPaths: [''],
    }).success).toBe(false);
    expect(ToolMetadataSchema.safeParse({
      ...base,
      dotfilePaths: ['   '],
    }).success).toBe(false);
    expect(ToolMetadataSchema.safeParse({
      ...base,
      variants: [''],
    }).success).toBe(false);
  });

  it('D-10 rejects malformed Homebrew identifiers without rejecting valid taps', () => {
    const base = browserToolMetadata[1];

    expect(ToolMetadataSchema.safeParse({
      ...base,
      install: {
        ...base.install,
        homebrew: { cask: 'example/tap/tool.plus@1-2.3' },
      },
    }).success).toBe(true);

    for (const cask of ['', '   ', 'bad cask', 'bad;cask', 'bad$cask']) {
      expect(ToolMetadataSchema.safeParse({
        ...base,
        install: {
          ...base.install,
          homebrew: { cask },
        },
      }).success).toBe(false);
    }
  });
});

describe('tool metadata registry', () => {
  it('D-05/D-06 aggregates plugin-backed and non-plugin metadata', () => {
    expect(allToolMetadata.map(tool => tool.id)).toEqual([
      'safari',
      'chrome',
      'firefox',
      'arc',
      'brave',
      'edge',
      'obsidian',
      'notion',
      'bear',
    ]);
  });

  it('D-13/D-14 answers lookup questions deterministically', () => {
    expect(getToolMetadata('chrome')?.label).toBe('Google Chrome');
    expect(getToolsByCategory('browser').map(tool => tool.id)).toEqual([
      'safari',
      'chrome',
      'firefox',
      'arc',
      'brave',
      'edge',
    ]);
    expect(getToolsByCategory('note-taking').map(tool => tool.id)).toEqual([
      'obsidian',
      'notion',
      'bear',
    ]);
    expect(getToolsByPlatform('darwin').map(tool => tool.id)).toEqual(allToolMetadata.map(tool => tool.id));
    expect(getToolsByHomebrewCask('google-chrome').map(tool => tool.id)).toEqual(['chrome']);
    expect(getToolsByHomebrewCask('safari')).toEqual([]);
    expect(getToolsBySource('first-party').map(tool => tool.id)).toEqual(allToolMetadata.map(tool => tool.id));
    expect(searchTools('CHROME').map(tool => tool.id)).toEqual(['chrome']);
    expect(searchTools('note').map(tool => tool.id)).toEqual(['notion']);
  });
});
