import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { tildeConfigSchemaMetadata } from '../../src/config/schema-metadata.js';

const BIN = resolve(import.meta.dirname, '../..', 'dist/bin/tilde.js');

const VALID_CONFIG = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  schemaVersion: '1.5',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/Developer/personal/dotfiles',
  contexts: [
    {
      label: 'personal',
      path: '~/Developer/personal',
      git: { name: 'Test User', email: 'test@example.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [],
    },
  ],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: false },
  accounts: [],
  secretsBackend: '1password',
};

async function makeTempProject() {
  const rawDir = await mkdtemp(join(tmpdir(), 'tilde-cli-regression-'));
  const dir = await realpath(rawDir);
  const home = join(dir, 'home');
  await mkdir(home);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, EDITOR: '/usr/bin/false' };
  delete env.TILDE_CONFIG;
  delete env.TILDE_CI;
  return { dir, home, env };
}

async function writeConfig(path: string, overrides: Partial<typeof VALID_CONFIG> = {}) {
  await writeFile(
    path,
    JSON.stringify({ ...VALID_CONFIG, ...overrides }, null, 2) + '\n',
    'utf-8'
  );
}

async function writePartialConfig(path: string) {
  await writeFile(
    path,
    JSON.stringify({
      $schema: VALID_CONFIG.$schema,
      schemaVersion: VALID_CONFIG.schemaVersion,
      os: VALID_CONFIG.os,
      packageManagers: VALID_CONFIG.packageManagers,
      versionManagers: [],
      languages: [],
      workspaceRoot: VALID_CONFIG.workspaceRoot,
      dotfilesRepo: VALID_CONFIG.dotfilesRepo,
      configurations: VALID_CONFIG.configurations,
      accounts: [],
      secretsBackend: VALID_CONFIG.secretsBackend,
    }, null, 2) + '\n',
    'utf-8'
  );
}

async function runCli(args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) {
  return execa('node', [BIN, ...args], {
    cwd: options.cwd,
    env: options.env,
    reject: false,
    timeout: 10_000,
    stdin: 'pipe',
  });
}

describe('CLI regression — #45', () => {
  it('produces non-empty stdout on --version', async () => {
    const result = await execa('node', [BIN, '--version'], { reject: false, timeout: 10_000 });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it('produces non-empty stdout on --help', async () => {
    const result = await execa('node', [BIN, '--help'], { reject: false, timeout: 10_000 });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  // FR-002: CLI should reject invalid arguments with a meaningful error message.
  // Currently unimplemented — the CLI ignores unknown flags and launches the wizard.
  // Tracked as a follow-on implementation task.
  it.todo('prints a meaningful error message for invalid arguments (FR-002)');
});

describe('CLI plugin list', () => {
  it('explains first-party plugin ownership', async () => {
    const result = await execa('node', [BIN, 'plugin', 'list'], { reject: false, timeout: 10_000 });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('homebrew');
    expect(result.stdout).toContain('first-party (built in)');
  });
});

describe('CLI config discovery and override behavior', () => {
  it.each([
    ['install', ['install'], 'tilde install --config <path>'],
    ['update shell', ['update', 'shell'], 'tilde update <resource> --config <path>'],
    ['config validate', ['config', 'validate'], 'tilde config validate --config <path>'],
    ['config show', ['config', 'show'], 'tilde config show --config <path>'],
    ['config edit', ['config', 'edit'], 'tilde config edit --config <path>'],
    ['context list', ['context', 'list'], 'tilde context list --config <path>'],
    ['context current', ['context', 'current'], 'tilde context current --config <path>'],
    ['context switch', ['context', 'switch', 'personal'], 'tilde context switch <label> --config <path>'],
    ['startup CI', ['--ci'], 'tilde --ci --config <path>'],
    ['reconfigure', ['--reconfigure'], 'tilde --reconfigure --config <path>'],
  ])('prints shared no-config guidance for %s', async (_name, args, example) => {
    const { dir, env } = await makeTempProject();
    const result = await runCli(args, { cwd: dir, env });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Searched:');
    expect(result.stderr).toContain('Run the wizard to create one: tilde');
    expect(result.stderr).toContain('~/.config/tilde/tilde.config.json');
    expect(result.stderr).toContain(example);
  });

  it('prints config schema without resolving a user config path', async () => {
    const { dir, home, env } = await makeTempProject();
    const result = await runCli(['config', 'schema'], {
      cwd: dir,
      env: {
        ...env,
        HOME: home,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('tilde.config.json schema');
    expect(result.stdout).toContain('schemaVersion');
    expect(result.stdout).toContain('required');
    expect(result.stdout).toContain('version');
    expect(result.stdout).toContain('deprecated');
    expect(result.stdout).not.toContain('Searched:');
    expect(result.stdout).not.toContain('Run the wizard to create one');
  });

  it('prints machine-readable config schema metadata as JSON', async () => {
    const { dir, env } = await makeTempProject();
    const result = await runCli(['config', 'schema', '--json'], { cwd: dir, env });
    const parsed = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(parsed).toEqual(tildeConfigSchemaMetadata);
    expect(parsed.schemaVersion).toBe(tildeConfigSchemaMetadata.schemaVersion);
    expect(parsed.fields).toEqual(expect.any(Array));
  });

  it('auto-discovers config validate when no path is passed', async () => {
    const { dir, env } = await makeTempProject();
    await writeConfig(join(dir, 'tilde.config.json'));
    const result = await runCli(['config', 'validate'], { cwd: dir, env });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Config is valid');
  });

  it('auto-discovers config show when no path is passed', async () => {
    const { dir, env } = await makeTempProject();
    await writeConfig(join(dir, 'tilde.config.json'));
    const result = await runCli(['config', 'show'], { cwd: dir, env });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"schemaVersion"');
  });

  it('auto-discovers config edit and uses the configured editor', async () => {
    const { dir, env } = await makeTempProject();
    const configPath = join(dir, 'tilde.config.json');
    const editorLog = join(dir, 'editor.log');
    const editorPath = join(dir, 'editor-stub.js');
    await writeConfig(configPath);
    await writeFile(
      editorPath,
      `#!/usr/bin/env node\nimport { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(editorLog)}, process.argv[2] ?? '');\n`,
      'utf-8'
    );
    await chmod(editorPath, 0o755);

    const result = await runCli(['config', 'edit'], {
      cwd: dir,
      env: { ...env, EDITOR: editorPath },
    });

    expect(result.exitCode).toBe(0);
    expect(await readFile(editorLog, 'utf-8')).toBe(configPath);
  });

  it('auto-discovers context list/current/switch when no path is passed', async () => {
    const { dir, env } = await makeTempProject();
    await writeConfig(join(dir, 'tilde.config.json'), {
      contexts: [
        {
          ...VALID_CONFIG.contexts[0],
          path: dir,
        },
      ],
    });

    const list = await runCli(['context', 'list'], { cwd: dir, env });
    const current = await runCli(['context', 'current'], { cwd: dir, env });
    const switched = await runCli(['context', 'switch', 'personal'], { cwd: dir, env });

    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('personal');
    expect(current.exitCode).toBe(0);
    expect(current.stdout).toContain('personal');
    expect(switched.exitCode).toBe(0);
    expect(switched.stdout).toContain('Switched to context: personal');
  });

  it('missing --config fails without falling back to valid cwd config', async () => {
    const { dir, env } = await makeTempProject();
    const missing = join(dir, 'missing.json');
    await writeConfig(join(dir, 'tilde.config.json'));
    const result = await runCli(['config', 'validate', '--config', missing], { cwd: dir, env });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('--config');
    expect(result.stderr).toContain(missing);
    expect(result.stderr).toContain('No auto-discovery fallback was attempted');
    expect(result.stderr).not.toContain('Searched:');
    expect(result.stdout).not.toContain('Config is valid');
  });

  it('missing TILDE_CONFIG fails without falling back to valid cwd config', async () => {
    const { dir, env } = await makeTempProject();
    const missing = join(dir, 'missing-env.json');
    await writeConfig(join(dir, 'tilde.config.json'));
    const result = await runCli(['config', 'validate'], {
      cwd: dir,
      env: { ...env, TILDE_CONFIG: missing },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('TILDE_CONFIG is set');
    expect(result.stderr).toContain('fix or unset TILDE_CONFIG');
    expect(result.stderr).not.toContain('Searched:');
    expect(result.stdout).not.toContain('Config is valid');
  });

  it('invalid explicit config reports selected-file parse errors without searched paths', async () => {
    const { dir, env } = await makeTempProject();
    const invalid = join(dir, 'invalid.json');
    await writeFile(invalid, '{ invalid json', 'utf-8');
    await writeConfig(join(dir, 'tilde.config.json'));
    const result = await runCli(['config', 'validate', '--config', invalid], { cwd: dir, env });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(invalid);
    expect(result.stderr).toContain('Failed to parse config as JSON');
    expect(result.stderr).not.toContain('Searched:');
  });

  it.each([
    ['startup --config', ['--config']],
    ['reconfigure --config', ['--reconfigure', '--config']],
  ])('%s with a partial config reaches interactive recovery instead of schema preflight', async (_name, args) => {
    const { dir, env } = await makeTempProject();
    const partial = join(dir, 'partial.json');
    await writePartialConfig(partial);

    const result = await runCli([...args, partial], { cwd: dir, env });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('open a new terminal and run: tilde');
    expect(result.stderr).not.toContain('Invalid config');
    expect(result.stderr).not.toContain('Required');
    expect(result.stderr).not.toContain('Searched:');
  });
});
