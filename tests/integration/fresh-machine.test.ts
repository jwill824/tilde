import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../../src/config/writer.js', () => ({
  writeConfig: vi.fn().mockResolvedValue('/fake/dotfiles/tilde.config.json'),
}));

vi.mock('../../src/state/checkpoint.js', () => ({
  saveCheckpoint: vi.fn().mockResolvedValue({
    schemaVersion: 1,
    sessionId: 'test',
    startedAt: new Date().toISOString(),
    lastCompletedStep: -1,
    partialConfig: {},
  }),
  loadCheckpoint: vi.fn().mockResolvedValue(null),
  clearCheckpoint: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn().mockRejectedValue(new Error('ENOENT')),
  };
});

describe('Fresh machine simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wizard without crashing on fresh machine', async () => {
    const { App } = await import('../../src/app.js');
    const { lastFrame } = render(React.createElement(App, { mode: 'wizard' }));
    expect(lastFrame()).toContain('tilde');
  });

  it('wizard shows no resume prompt when no checkpoint', async () => {
    const { loadCheckpoint } = await import('../../src/state/checkpoint.js');
    vi.mocked(loadCheckpoint).mockResolvedValue(null);

    const { App } = await import('../../src/app.js');
    const { lastFrame } = render(React.createElement(App, { mode: 'wizard' }));

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(lastFrame()).not.toContain('Resume from step');
    expect(lastFrame()).toContain('tilde');
  });
});
