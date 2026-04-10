/**
 * Unit tests for ConfigSummary component (T017 / US5).
 * Verifies that browser and AI coding tools sections are rendered
 * when configured, and omitted when absent.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ConfigSummary } from '../../src/ui/config-summary.js';
import type { TildeConfig } from '../../src/config/schema.js';

const BASE_CONFIG: TildeConfig = {
  schemaVersion: '1.4',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
  versionManagers: [],
  contexts: [
    {
      label: 'personal',
      path: '~/Developer',
      git: { name: 'Dev', email: 'dev@example.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [],
    },
  ],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: false },
  secretsBackend: 'none',
};

describe('ConfigSummary — browser and AI tools sections', () => {
  it('renders Browser section when browser.selected is non-empty', () => {
    const config = { ...BASE_CONFIG, browser: { selected: ['chrome', 'brave'] } };
    const { lastFrame } = render(React.createElement(ConfigSummary, { config }));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Browser:');
    expect(frame).toContain('chrome');
    expect(frame).toContain('brave');
  });

  it('omits Browser section when browser is undefined', () => {
    const { lastFrame } = render(React.createElement(ConfigSummary, { config: BASE_CONFIG }));
    expect(lastFrame()).not.toContain('Browser:');
  });

  it('omits Browser section when browser.selected is empty', () => {
    const config = { ...BASE_CONFIG, browser: { selected: [] } };
    const { lastFrame } = render(React.createElement(ConfigSummary, { config }));
    expect(lastFrame()).not.toContain('Browser:');
  });

  it('renders AI Coding Tools section when aiTools is non-empty', () => {
    const config = {
      ...BASE_CONFIG,
      aiTools: [{ label: 'GitHub Copilot', name: 'copilot', variant: 'cli-extension' as const }],
    };
    const { lastFrame } = render(React.createElement(ConfigSummary, { config }));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('AI Coding Tools:');
    expect(frame).toContain('GitHub Copilot');
  });

  it('omits AI Coding Tools section when aiTools is undefined', () => {
    const { lastFrame } = render(React.createElement(ConfigSummary, { config: BASE_CONFIG }));
    expect(lastFrame()).not.toContain('AI Coding Tools:');
  });

  it('omits AI Coding Tools section when aiTools is empty array', () => {
    const config = { ...BASE_CONFIG, aiTools: [] };
    const { lastFrame } = render(React.createElement(ConfigSummary, { config }));
    expect(lastFrame()).not.toContain('AI Coding Tools:');
  });

  it('renders both Browser and AI Coding Tools when both configured', () => {
    const config = {
      ...BASE_CONFIG,
      browser: { selected: ['firefox'] },
      aiTools: [{ label: 'Claude Code', name: 'claude-code', variant: 'cli-tool' as const }],
    };
    const { lastFrame } = render(React.createElement(ConfigSummary, { config }));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Browser:');
    expect(frame).toContain('AI Coding Tools:');
    expect(frame).toContain('firefox');
    expect(frame).toContain('Claude Code');
  });
});
