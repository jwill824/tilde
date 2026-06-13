import { describe, it, expect } from 'vitest';

describe('Homebrew inventory classification', () => {
  it('classifies installed formulae and casks by Homebrew request status', async () => {
    const { classifyHomebrewInventory } = await import('../../src/inventory/homebrew.js');

    const classified = classifyHomebrewInventory({
      formulae: ['git', 'ripgrep', 'node'],
      casks: ['visual-studio-code'],
      installedOnRequestFormulae: ['git'],
      requestStatusAvailable: true,
    });

    expect(classified.formulae).toEqual([
      { id: 'git', requestStatus: 'direct' },
      { id: 'ripgrep', requestStatus: 'dependency' },
      { id: 'node', requestStatus: 'dependency' },
    ]);
    expect(classified.casks).toEqual([
      { id: 'visual-studio-code', requestStatus: 'direct' },
    ]);
  });

  it('marks formula request status unknown when request-state data is unavailable', async () => {
    const { classifyHomebrewInventory } = await import('../../src/inventory/homebrew.js');

    const classified = classifyHomebrewInventory({
      formulae: ['git', 'ripgrep', 'node'],
      casks: ['visual-studio-code'],
      installedOnRequestFormulae: [],
      requestStatusAvailable: false,
    });

    expect(classified.formulae).toEqual([
      { id: 'git', requestStatus: 'unknown' },
      { id: 'ripgrep', requestStatus: 'unknown' },
      { id: 'node', requestStatus: 'unknown' },
    ]);
    expect(classified.casks).toEqual([
      { id: 'visual-studio-code', requestStatus: 'direct' },
    ]);
  });
});
