import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const {
  mockListInstalledFormulae,
  mockListInstalledCasks,
  mockListInstalledOnRequestFormulae,
  mockDetectLanguages,
  mockDetectVersionManagers,
  mockAccess,
} = vi.hoisted(() => ({
  mockListInstalledFormulae: vi.fn(),
  mockListInstalledCasks: vi.fn(),
  mockListInstalledOnRequestFormulae: vi.fn(),
  mockDetectLanguages: vi.fn(),
  mockDetectVersionManagers: vi.fn(),
  mockAccess: vi.fn(),
}));

vi.mock('../../src/utils/package-manager.js', () => ({
  listInstalledFormulae: mockListInstalledFormulae,
  listInstalledCasks: mockListInstalledCasks,
  listInstalledOnRequestFormulae: mockListInstalledOnRequestFormulae,
}));

vi.mock('../../src/utils/env-detection.js', () => ({
  detectLanguages: mockDetectLanguages,
  detectVersionManagers: mockDetectVersionManagers,
}));

vi.mock('../../src/tools/registry.js', () => ({
  allToolMetadata: MOCK_TOOL_METADATA,
  getToolMetadata: (id: string) => MOCK_TOOL_METADATA.find(tool => tool.id === id),
  getToolsByConfigPath: (path: string) => path === '~/.config/test-cli' || path.startsWith('~/.config/test-cli/')
    ? [MOCK_TOOL_METADATA.find(tool => tool.id === 'test-cli')]
    : [],
  getToolsByDotfilePath: () => [],
}));

const MOCK_TOOL_METADATA = [
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
    {
      id: 'test-cli',
      label: 'Test CLI',
      category: 'package-manager',
      supportedPlatforms: ['darwin'],
      source: 'first-party',
      install: {
        homebrew: {
          formula: 'test-cli',
        },
      },
      configPaths: ['~/.config/test-cli'],
    },
    {
      id: 'test-editor-installed',
      label: 'Installed Test Editor',
      category: 'editor',
      supportedPlatforms: ['darwin'],
      source: 'local',
      install: {
        appPath: '/Applications/Installed Test Editor.app',
      },
    },
    {
      id: 'test-editor-missing',
      label: 'Missing Test Editor',
      category: 'editor',
      supportedPlatforms: ['darwin'],
      source: 'local',
      install: {
        appPath: '/Applications/Missing Test Editor.app',
      },
    },
    {
      id: 'test-cask',
      label: 'Test Cask',
      category: 'note-taking',
      supportedPlatforms: ['darwin'],
      source: 'first-party',
      install: {
        homebrew: {
          cask: 'test-cask',
        },
      },
    },
  ];

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: mockAccess,
  };
});

describe('inventory scanner', () => {
  let tmpHome: string;
  let originalShell: string | undefined;

  beforeEach(async () => {
    tmpHome = join(tmpdir(), `tilde-inventory-test-${randomUUID()}`);
    await mkdir(tmpHome, { recursive: true });
    await mkdir(join(tmpHome, '.config', 'test-cli'), { recursive: true });
    await writeFile(join(tmpHome, '.config', 'test-cli', 'config.json'), '{}\n');
    await writeFile(join(tmpHome, '.unknownrc'), 'custom=true\n');
    originalShell = process.env.SHELL;
    process.env.SHELL = '/bin/zsh';

    mockListInstalledFormulae.mockResolvedValue(['test-cli', 'ripgrep']);
    mockListInstalledCasks.mockResolvedValue(['test-cask', 'unknown-cask']);
    mockListInstalledOnRequestFormulae.mockResolvedValue(['test-cli']);
    mockDetectLanguages.mockResolvedValue([
      { name: 'node', version: '22.0.0' },
      { name: 'git', version: '2.45.0' },
    ]);
    mockDetectVersionManagers.mockResolvedValue([{ name: 'npm' }]);
    mockAccess.mockImplementation(async (path: string) => {
      if (path === '/Applications/Installed Test Editor.app') {
        return;
      }

      throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    });
  });

  afterEach(async () => {
    if (originalShell === undefined) {
      delete process.env.SHELL;
    } else {
      process.env.SHELL = originalShell;
    }

    await rm(tmpHome, { recursive: true, force: true });
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns report sections with evidence-backed known Homebrew facts and unmatched audit data', async () => {
    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    expect(report).toEqual(expect.objectContaining({
      tools: expect.any(Array),
      unmatchedHomebrew: expect.any(Object),
      homebrew: expect.any(Object),
      dotfiles: expect.any(Object),
      warnings: expect.any(Array),
      environment: expect.any(Object),
    }));

    const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
    expect(formulaFact).toEqual(expect.objectContaining({
      installed: 'installed',
      evidence: expect.arrayContaining([
        expect.objectContaining({ type: 'homebrew-formula', id: 'test-cli' }),
      ]),
    }));

    const caskFact = report.tools.find(tool => tool.toolId === 'test-cask');
    expect(caskFact).toEqual(expect.objectContaining({
      installed: 'installed',
      evidence: expect.arrayContaining([
        expect.objectContaining({ type: 'homebrew-cask', id: 'test-cask' }),
      ]),
    }));

    expect(report.unmatchedHomebrew.formulae).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ripgrep' }),
    ]));
    expect(report.unmatchedHomebrew.casks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'unknown-cask' }),
    ]));
  });

  it('adds request status to known and unmatched Homebrew facts', async () => {
    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
    expect(formulaFact?.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'homebrew-formula',
        id: 'test-cli',
        requestStatus: 'direct',
      }),
    ]));

    expect(report.unmatchedHomebrew.formulae).toEqual([
      { id: 'ripgrep', requestStatus: 'dependency' },
    ]);
    expect(report.unmatchedHomebrew.casks).toEqual([
      { id: 'unknown-cask', requestStatus: 'direct' },
    ]);
  });

  it('records app-path evidence for installed and missing metadata paths', async () => {
    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    const installedEditor = report.tools.find(tool => tool.toolId === 'test-editor-installed');
    expect(installedEditor).toEqual(expect.objectContaining({
      installed: 'installed',
      evidence: expect.arrayContaining([
        expect.objectContaining({
          type: 'app-path',
          path: '/Applications/Installed Test Editor.app',
          exists: true,
        }),
      ]),
    }));

    const missingEditor = report.tools.find(tool => tool.toolId === 'test-editor-missing');
    expect(missingEditor).toEqual(expect.objectContaining({
      installed: 'missing',
      evidence: expect.arrayContaining([
        expect.objectContaining({
          type: 'app-path',
          path: '/Applications/Missing Test Editor.app',
          exists: false,
        }),
      ]),
    }));
  });

  it('adds scanner-owned shell and core-tool facts without widening metadata categories', async () => {
    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);
    const factIds = report.tools.map(tool => tool.toolId);

    expect(factIds).toEqual(expect.arrayContaining([
      'shell:zsh',
      'shell:bash',
      'core-tool:git',
      'core-tool:node',
      'core-tool:npm',
    ]));

    expect(report.tools.find(tool => tool.toolId === 'shell:zsh')).toEqual(expect.objectContaining({
      category: 'shell',
      installed: 'installed',
      evidence: expect.arrayContaining([
        expect.objectContaining({ type: 'shell', name: 'zsh' }),
      ]),
    }));

    expect(report.tools.find(tool => tool.toolId === 'core-tool:node')).toEqual(expect.objectContaining({
      category: 'core-tool',
      installed: 'installed',
      evidence: expect.arrayContaining([
        expect.objectContaining({ type: 'command', command: 'node' }),
      ]),
    }));
  });

  it('keeps the report usable with warnings and unknown facts when Homebrew helpers fail', async () => {
    mockListInstalledFormulae.mockRejectedValueOnce(new Error('brew not found'));

    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'homebrew',
        severity: 'warning',
      }),
    ]));

    const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
    expect(formulaFact).toEqual(expect.objectContaining({
      installed: 'unknown',
      evidence: expect.arrayContaining([
        expect.objectContaining({ type: 'inconclusive', source: 'homebrew' }),
      ]),
    }));

    expect(report.unmatchedHomebrew.formulae).toEqual([]);
  });

  it('keeps installed Homebrew facts and warns when request-state lookup fails', async () => {
    mockListInstalledOnRequestFormulae.mockRejectedValueOnce(new Error('unsupported'));

    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'homebrew-request-state-unavailable',
        source: 'homebrew',
        severity: 'warning',
      }),
    ]));

    const formulaFact = report.tools.find(tool => tool.toolId === 'test-cli');
    expect(formulaFact).toEqual(expect.objectContaining({
      installed: 'installed',
      evidence: expect.arrayContaining([
        expect.objectContaining({
          type: 'homebrew-formula',
          id: 'test-cli',
          requestStatus: 'unknown',
        }),
      ]),
    }));

    expect(report.unmatchedHomebrew.formulae).toEqual([
      { id: 'ripgrep', requestStatus: 'unknown' },
    ]);
  });

  it('marks Homebrew installed when helper calls prove the brew command is available', async () => {
    mockListInstalledFormulae.mockResolvedValueOnce([]);
    mockListInstalledCasks.mockResolvedValueOnce([]);
    mockListInstalledOnRequestFormulae.mockResolvedValueOnce([]);

    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    const homebrewFact = report.tools.find(tool => tool.toolId === 'homebrew');
    expect(homebrewFact).toEqual(expect.objectContaining({
      installed: 'installed',
      evidence: expect.arrayContaining([
        { type: 'command', command: 'brew', outcome: 'succeeded' },
      ]),
    }));
  });

  it('attaches a dotfile map and includes concise aggregate dotfile summary output', async () => {
    const { scanInventory } = await import('../../src/inventory/scan.js');
    const { summarizeInventory } = await import('../../src/inventory/summary.js');

    const report = await scanInventory(tmpHome);
    const summary = summarizeInventory(report);

    expect(report.dotfiles).toEqual(expect.objectContaining({
      files: expect.arrayContaining([
        expect.objectContaining({
          path: join(tmpHome, '.config', 'test-cli', 'config.json'),
          state: 'known',
          toolIds: ['test-cli'],
        }),
        expect.objectContaining({
          path: join(tmpHome, '.unknownrc'),
          state: 'unknown',
        }),
      ]),
      counts: expect.objectContaining({
        knownFiles: 1,
        unknownFiles: 1,
      }),
    }));
    expect(summary).toContain('Dotfiles: 1 known, 1 unknown, 0 warnings');
    expect(summary.some(line => line.includes(join(tmpHome, '.unknownrc')))).toBe(false);
  });

  it('keeps Homebrew unknown with warning-backed evidence when helper calls fail', async () => {
    mockListInstalledFormulae.mockRejectedValueOnce(new Error('formulae unavailable'));
    mockListInstalledCasks.mockRejectedValueOnce(new Error('casks unavailable'));
    mockListInstalledOnRequestFormulae.mockRejectedValueOnce(new Error('request state unavailable'));

    const { scanInventory } = await import('../../src/inventory/scan.js');

    const report = await scanInventory(tmpHome);

    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'homebrew',
        severity: 'warning',
      }),
    ]));

    const homebrewFact = report.tools.find(tool => tool.toolId === 'homebrew');
    expect(homebrewFact).toEqual(expect.objectContaining({
      installed: 'unknown',
      warningIds: expect.arrayContaining([expect.any(String)]),
      evidence: expect.arrayContaining([
        expect.objectContaining({
          type: 'inconclusive',
          source: 'homebrew',
          warningId: expect.any(String),
        }),
      ]),
    }));
  });
});
