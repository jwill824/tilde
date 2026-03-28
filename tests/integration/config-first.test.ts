import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = join(__dirname, '../fixtures/tilde.config.json');

vi.mock('../../src/installer/index.js', () => ({
  installAll: vi.fn().mockResolvedValue({
    packages: { installed: [], skipped: [], failed: [] },
    languages: [],
    errors: [],
  }),
}));

vi.mock('../../src/dotfiles/writer.js', () => ({
  writeAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/plugins/registry.js', () => ({
  pluginRegistry: {},
}));

describe('ConfigFirstMode integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ConfigSummary content from fixture config', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    await new Promise((r) => setTimeout(r, 300));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Configuration Summary');
    expect(frame).toContain('personal');
    expect(frame).toContain('test@example.com');
    expect(frame).toContain('zsh');
    expect(frame).toContain('homebrew');
    expect(frame).toContain('1password');
  });

  it('shows Apply and Cancel options after loading valid config', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    await new Promise((r) => setTimeout(r, 300));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Apply this configuration');
    expect(frame).toContain('Cancel');
  });

  it('calls installAll and writeAll after confirm selection', async () => {
    const { installAll } = await import('../../src/installer/index.js');
    const { writeAll } = await import('../../src/dotfiles/writer.js');
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');

    const onComplete = vi.fn();
    const { stdin } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    // Wait for config to load and confirm prompt to appear
    await new Promise((r) => setTimeout(r, 300));

    // Press Enter to select "Apply this configuration" (default / first item)
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 300));

    expect(installAll).toHaveBeenCalled();
    expect(writeAll).toHaveBeenCalled();
  });

  it('calls onComplete when cancel is selected', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { stdin } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    await new Promise((r) => setTimeout(r, 300));

    // Arrow down to Cancel, then Enter
    stdin.write('\x1b[B');
    await new Promise((r) => setTimeout(r, 50));
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 100));

    expect(onComplete).toHaveBeenCalled();
  });
});
