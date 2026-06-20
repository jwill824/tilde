import { describe, expect, it } from 'vitest';
import type { TildeConfig } from '../../src/config/schema.js';
import { createEmptyInventoryReport, type InventoryReport, type InventoryToolFact } from '../../src/inventory/report.js';
import {
  deriveInventoryProvenance,
  formatProvenanceSummaryLine,
  summarizeProvenanceGroups,
} from '../../src/inventory/provenance.js';

describe('inventory provenance', () => {
  it('keeps selected tools tilde-managed while preserving installed evidence detail', () => {
    const report = reportWithTools([
      fact({
        toolId: 'homebrew',
        label: 'Homebrew',
        category: 'package-manager',
        evidence: [{ type: 'homebrew-formula', id: 'brew', requestStatus: 'direct' }],
      }),
      fact({
        toolId: 'vfox',
        label: 'vfox',
        category: 'version-manager',
        evidence: [{ type: 'homebrew-formula', id: 'vfox', requestStatus: 'dependency' }],
      }),
      fact({
        toolId: 'vscode',
        label: 'Visual Studio Code',
        category: 'editor',
        evidence: [{ type: 'app-path', path: '/Applications/Visual Studio Code.app', exists: true }],
      }),
      fact({
        toolId: 'git',
        label: 'GitHub CLI',
        category: 'account-connector',
        evidence: [{ type: 'command', command: 'gh', outcome: 'succeeded', version: '2.0.0' }],
      }),
    ]);

    const provenance = deriveInventoryProvenance(report, config({
      packageManagers: ['homebrew'],
      versionManagers: [{ name: 'vfox' }],
      editors: { primary: 'vscode', additional: [] },
      tools: ['git'],
    }));

    expect(provenance).toEqual(expect.arrayContaining([
      expect.objectContaining({
        toolId: 'homebrew',
        provenance: 'tilde-managed',
        detail: expect.stringContaining('direct'),
        action: expect.stringContaining('Skip install'),
      }),
      expect.objectContaining({
        toolId: 'vfox',
        provenance: 'tilde-managed',
        detail: expect.stringContaining('dependency'),
        action: expect.stringContaining('dependency'),
      }),
      expect.objectContaining({
        toolId: 'vscode',
        provenance: 'tilde-managed',
        detail: expect.stringContaining('Application bundle exists'),
      }),
      expect.objectContaining({
        toolId: 'git',
        provenance: 'tilde-managed',
        detail: expect.stringContaining('command gh'),
      }),
    ]));
  });

  it('labels unselected direct and dependency Homebrew facts with user-facing provenance', () => {
    const report = reportWithTools([
      fact({
        toolId: 'ripgrep',
        label: 'ripgrep',
        category: 'core-tool',
        evidence: [{ type: 'homebrew-formula', id: 'ripgrep', requestStatus: 'direct' }],
      }),
      fact({
        toolId: 'openssl',
        label: 'OpenSSL',
        category: 'core-tool',
        evidence: [{ type: 'homebrew-formula', id: 'openssl@3', requestStatus: 'dependency' }],
      }),
    ]);

    const provenance = deriveInventoryProvenance(report);

    expect(provenance).toEqual([
      expect.objectContaining({
        toolId: 'ripgrep',
        provenance: 'already-installed',
        detail: expect.stringContaining('direct'),
      }),
      expect.objectContaining({
        toolId: 'openssl',
        provenance: 'homebrew-dependency',
        detail: expect.stringContaining('dependency'),
      }),
    ]);
  });

  it('uses metadata-backed manual GUI evidence and scanner-owned OS-provided labels only where appropriate', () => {
    const report = reportWithTools([
      fact({
        toolId: 'bear',
        label: 'Bear',
        category: 'note-taking',
        evidence: [{ type: 'app-path', path: '/Applications/Bear.app', exists: true }],
      }),
      fact({
        toolId: 'shell:zsh',
        label: 'zsh',
        category: 'shell',
        evidence: [{ type: 'shell', name: 'zsh', source: 'process-env' }],
      }),
      fact({
        toolId: 'core-tool:node',
        label: 'node',
        category: 'core-tool',
        evidence: [{ type: 'command', command: 'node', outcome: 'succeeded', version: '22.0.0' }],
      }),
      fact({
        toolId: 'custom-core-tool',
        label: 'Custom Core Tool',
        category: 'core-tool',
        evidence: [{ type: 'command', command: 'custom-core-tool', outcome: 'succeeded' }],
      }),
    ]);

    const provenance = deriveInventoryProvenance(report);

    expect(provenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ toolId: 'bear', provenance: 'manual-gui' }),
      expect.objectContaining({ toolId: 'shell:zsh', provenance: 'os-provided' }),
      expect.objectContaining({ toolId: 'core-tool:node', provenance: 'os-provided' }),
      expect.objectContaining({ toolId: 'custom-core-tool', provenance: 'already-installed' }),
    ]));
  });

  it('keeps inconclusive and selected missing facts non-blocking with warning ids preserved', () => {
    const report = reportWithTools([
      fact({
        toolId: 'unknown-tool',
        label: 'Unknown Tool',
        category: 'core-tool',
        installed: 'unknown',
        evidence: [{
          type: 'inconclusive',
          source: 'scanner',
          reason: 'No matching scanner evidence.',
          warningId: 'scanner:unknown-tool',
        }],
        warningIds: ['scanner:unknown-tool'],
      }),
    ]);

    const provenance = deriveInventoryProvenance(report, config({ tools: ['missing-selected-tool'] }));

    expect(provenance).toEqual(expect.arrayContaining([
      expect.objectContaining({
        toolId: 'unknown-tool',
        provenance: 'unknown',
        warningIds: ['scanner:unknown-tool'],
        action: expect.stringContaining('Leave'),
      }),
      expect.objectContaining({
        toolId: 'missing-selected-tool',
        provenance: 'tilde-managed',
        installed: 'unknown',
        action: expect.stringContaining('Proceed cautiously'),
      }),
    ]));
  });

  it('groups summaries with at most three examples and a remaining count', () => {
    const report = reportWithTools([
      fact({ toolId: 'tool-a', label: 'Tool A', category: 'core-tool', evidence: [{ type: 'command', command: 'a', outcome: 'succeeded' }] }),
      fact({ toolId: 'tool-b', label: 'Tool B', category: 'core-tool', evidence: [{ type: 'command', command: 'b', outcome: 'succeeded' }] }),
      fact({ toolId: 'tool-c', label: 'Tool C', category: 'core-tool', evidence: [{ type: 'command', command: 'c', outcome: 'succeeded' }] }),
      fact({ toolId: 'tool-d', label: 'Tool D', category: 'core-tool', evidence: [{ type: 'command', command: 'd', outcome: 'succeeded' }] }),
    ]);

    const groups = summarizeProvenanceGroups(deriveInventoryProvenance(report));
    const installedGroup = groups.find(group => group.provenance === 'already-installed');
    const line = formatProvenanceSummaryLine(report);

    expect(installedGroup).toEqual(expect.objectContaining({
      count: 4,
      examples: ['Tool A', 'Tool B', 'Tool C'],
      remaining: 1,
    }));
    expect(line).toContain('already installed 4 (Tool A, Tool B, Tool C, +1 more)');
  });
});

function reportWithTools(tools: InventoryToolFact[]): InventoryReport {
  return {
    ...createEmptyInventoryReport('/Users/tester'),
    tools,
  };
}

function fact(overrides: Partial<InventoryToolFact> & Pick<InventoryToolFact, 'toolId' | 'label' | 'category' | 'evidence'>): InventoryToolFact {
  return {
    installed: 'installed',
    warningIds: [],
    ...overrides,
  };
}

function config(overrides: Partial<TildeConfig> = {}): TildeConfig {
  return {
    $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
    version: '1',
    schemaVersion: '1.6',
    os: 'macos',
    shell: 'zsh',
    packageManagers: [],
    versionManagers: [],
    languages: [],
    workspaceRoot: '~/Developer',
    dotfilesRepo: '~/dotfiles',
    contexts: [{ label: 'work', path: '~/Developer' }],
    tools: [],
    configurations: {},
    accounts: [],
    secretsBackend: 'env-only',
    browser: { selected: [], default: null },
    editors: { primary: null, additional: [] },
    aiTools: [],
    ...overrides,
  };
}
