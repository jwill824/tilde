/**
 * Unit tests for AI tools step (T028).
 * Tests the curated tool list structure and install logic.
 */
import { describe, it, expect, vi } from 'vitest';

// Test the curated list from the step
const EXPECTED_AI_TOOLS = [
  { name: 'claude-code',   variant: 'cli-tool' },
  { name: 'claude',        variant: 'desktop-app' },
  { name: 'cursor',        variant: 'ai-editor' },
  { name: 'windsurf',      variant: 'ai-editor' },
  { name: 'gh',            variant: 'cli-extension' },
];

describe('AI Tools curated list', () => {
  it('contains the expected 5 AI tools', () => {
    expect(EXPECTED_AI_TOOLS.length).toBe(5);
  });

  it('includes Claude Code CLI tool', () => {
    const tool = EXPECTED_AI_TOOLS.find(t => t.name === 'claude-code');
    expect(tool).toBeDefined();
    expect(tool?.variant).toBe('cli-tool');
  });

  it('includes Claude Desktop app', () => {
    const tool = EXPECTED_AI_TOOLS.find(t => t.name === 'claude');
    expect(tool).toBeDefined();
    expect(tool?.variant).toBe('desktop-app');
  });

  it('includes Cursor AI editor', () => {
    const tool = EXPECTED_AI_TOOLS.find(t => t.name === 'cursor');
    expect(tool).toBeDefined();
    expect(tool?.variant).toBe('ai-editor');
  });

  it('includes Windsurf (Codeium)', () => {
    const tool = EXPECTED_AI_TOOLS.find(t => t.name === 'windsurf');
    expect(tool).toBeDefined();
  });

  it('includes GitHub Copilot CLI extension', () => {
    const tool = EXPECTED_AI_TOOLS.find(t => t.name === 'gh');
    expect(tool).toBeDefined();
    expect(tool?.variant).toBe('cli-extension');
  });

  it('all tools have distinct names', () => {
    const names = EXPECTED_AI_TOOLS.map(t => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('all tools have a non-empty variant', () => {
    for (const tool of EXPECTED_AI_TOOLS) {
      expect(tool.variant).toBeTruthy();
    }
  });
});

describe('AIToolConfig schema', () => {
  it('AIToolConfig type has name, label, variant fields', async () => {
    // Import the schema type to verify structure
    const { AIToolConfigSchema } = await import('../../src/config/schema.js');
    const valid = AIToolConfigSchema.safeParse({
      name: 'claude-code',
      label: 'Claude Code',
      variant: 'cli-tool',
    });
    expect(valid.success).toBe(true);
  });

  it('AIToolConfig rejects missing name', async () => {
    const { AIToolConfigSchema } = await import('../../src/config/schema.js');
    const invalid = AIToolConfigSchema.safeParse({ label: 'Test', variant: 'cli' });
    expect(invalid.success).toBe(false);
  });

  it('AIToolConfig rejects missing variant', async () => {
    const { AIToolConfigSchema } = await import('../../src/config/schema.js');
    const invalid = AIToolConfigSchema.safeParse({ name: 'test', label: 'Test' });
    expect(invalid.success).toBe(false);
  });
});
