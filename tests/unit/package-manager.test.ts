import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExeca } = vi.hoisted(() => ({
  mockExeca: vi.fn(),
}));

vi.mock('execa', () => ({
  execa: mockExeca,
}));

describe('Homebrew package manager helpers', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('lists installed-on-request formulae through the Homebrew command boundary', async () => {
    mockExeca.mockResolvedValue({
      stdout: 'git\n\nripgrep\n',
    });

    const { listInstalledOnRequestFormulae } = await import('../../src/utils/package-manager.js');

    await expect(listInstalledOnRequestFormulae()).resolves.toEqual(['git', 'ripgrep']);

    expect(mockExeca).toHaveBeenCalledWith('brew', ['list', '--installed-on-request', '--formula', '--full-name'], {
      reject: true,
    });
  });
});
