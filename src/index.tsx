#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
export { PluginError } from './plugins/api.js';
import { assertMacOS } from './utils/os.js';
import { App } from './app.js';
import { loadConfig } from './config/reader.js';
import { pluginRegistry } from './plugins/registry.js';
import { run } from './utils/exec.js';
import { discoverConfig, formatNoConfigError } from './utils/config-discovery.js';
import type { PluginCategory, AccountConnectorPlugin } from './plugins/api.js';

export function readPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // Try parent and grandparent to support different output structures (dist/ and dist/src/)
    for (const rel of ['../package.json', '../../package.json']) {
      const pkgPath = resolve(__dirname, rel);
      if (existsSync(pkgPath)) {
        const raw = readFileSync(pkgPath, 'utf8');
        return (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
      }
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

const VERSION = readPackageVersion();

function parseCliArgs() {
  // Check env vars first
  const envConfig = process.env.TILDE_CONFIG;
  const envCi = process.env.TILDE_CI === '1' || process.env.TILDE_CI === 'true';

  let args: ReturnType<typeof parseArgs>['values'];
  let positionals: string[];
  try {
    const parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        config: { type: 'string', short: 'c' },
        yes: { type: 'boolean', short: 'y' },
        ci: { type: 'boolean' },
        reconfigure: { type: 'boolean' },
        resume: { type: 'boolean' },
        'no-resume': { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        verbose: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
      strict: false,
    });
    args = parsed.values;
    positionals = parsed.positionals;
  } catch (err) {
    process.stderr.write(`Error parsing arguments: ${(err as Error).message}\n`);
    process.exit(1);
  }

  if (args.help) {
    process.stdout.write(`
tilde — developer environment bootstrap

Usage: tilde [install] [options]
       tilde update <resource> [--config <path>]
       tilde context <list|current|switch> [label]
       tilde plugin <list|add|remove> [name]
       tilde config <validate|show|edit> [path]

Resources for tilde update:
  shell, editor, applications, browser, ai-tools, contexts, languages

Options:
  --config <path|url>   Load tilde.config.json (activates config-first mode)
  --yes, --ci           Non-interactive mode (requires --config)
  --reconfigure         Load existing config and re-run wizard with all fields pre-populated
  --resume              Resume from last checkpoint
  --no-resume           Ignore checkpoint, start fresh
  --dry-run             Print planned actions without executing
  --verbose             Show full command output
  --version, -v         Show version
  --help, -h            Show this help

Environment variables:
  TILDE_CONFIG          Path to config file (same as --config)
  TILDE_STATE_DIR       Override ~/.tilde/ state directory
  TILDE_NO_COLOR        Disable color output
  TILDE_CI              Equivalent to --ci flag
`);
    process.exit(0);
  }

  if (args.version) {
    process.stdout.write(`tilde v${VERSION}\n`);
    process.exit(0);
  }

  return {
    configPath: (args.config as string | undefined) ?? envConfig,
    ci: Boolean(args.yes || args.ci || envCi),
    reconfigure: Boolean(args.reconfigure),
    resume: Boolean(args.resume),
    noResume: Boolean(args['no-resume']),
    dryRun: Boolean(args['dry-run']),
    verbose: Boolean(args.verbose),
    positionals,
  };
}

async function handleContextSubcommand(sub: string, label: string | undefined, configPath: string | undefined) {
  const cwdConfig = resolve(process.cwd(), 'tilde.config.json');
  const cfgPath = configPath || (existsSync(cwdConfig) ? cwdConfig : 'tilde.config.json');
  let config;
  try {
    config = await loadConfig(cfgPath);
  } catch (err) {
    process.stderr.write(`Error loading config: ${(err as Error).message}\n`);
    process.exit(1);
  }

  if (sub === 'list') {
    for (const ctx of config.contexts) {
      process.stdout.write(`${ctx.label}  ${ctx.path}  ${ctx.git.email}\n`);
    }
    process.exit(0);
  }

  if (sub === 'current') {
    const cwd = process.cwd();
    const match = config.contexts.find(ctx => {
      const expanded = ctx.path.startsWith('~/') ? ctx.path.replace(/^~\//, process.env.HOME + '/') : ctx.path;
      return cwd.startsWith(expanded);
    });
    process.stdout.write(match ? `${match.label}\n` : 'none\n');
    process.exit(0);
  }

  if (sub === 'switch') {
    if (!label) {
      process.stderr.write('Error: tilde context switch requires a <label>\n');
      process.exit(1);
    }
    const ctx = config.contexts.find(c => c.label === label);
    if (!ctx) {
      process.stderr.write(`Error: context "${label}" not found\n`);
      process.exit(1);
    }
    const connector = pluginRegistry.get<AccountConnectorPlugin>('account-connector', 'gh-cli');
    if (connector && ctx.github?.username) {
      await connector.switchAccount(ctx.github.username);
    }
    process.stdout.write(`Switched to context: ${label}\n`);
    process.exit(0);
  }

  process.stderr.write(`Unknown context subcommand: ${sub}\n`);
  process.exit(1);
}

async function handlePluginSubcommand(sub: string, name: string | undefined) {
  if (sub === 'list') {
    const categories: PluginCategory[] = ['package-manager', 'secrets-backend', 'account-connector', 'env-loader', 'version-manager'];
    for (const cat of categories) {
      for (const p of pluginRegistry.getAll(cat)) {
        process.stdout.write(`${p.id}  ${p.version}  ${p.source}\n`);
      }
    }
    process.exit(0);
  }

  if (sub === 'add') {
    if (!name) {
      process.stderr.write('Error: tilde plugin add requires a <name>\n');
      process.exit(1);
    }
    await run('npm', ['install', `tilde-plugin-${name}`]);
    process.stdout.write(`Plugin tilde-plugin-${name} installed\n`);
    process.exit(0);
  }

  if (sub === 'remove') {
    if (!name) {
      process.stderr.write('Error: tilde plugin remove requires a <name>\n');
      process.exit(1);
    }
    await run('npm', ['uninstall', `tilde-plugin-${name}`]);
    process.stdout.write(`Plugin tilde-plugin-${name} removed\n`);
    process.exit(0);
  }

  process.stderr.write(`Unknown plugin subcommand: ${sub}\n`);
  process.exit(1);
}

async function handleConfigSubcommand(sub: string, pathArg: string | undefined, configPath: string | undefined) {
  const cwdConfig = resolve(process.cwd(), 'tilde.config.json');
  const cfgPath = pathArg || configPath || (existsSync(cwdConfig) ? cwdConfig : 'tilde.config.json');

  if (sub === 'validate') {
    try {
      await loadConfig(cfgPath);
      process.stdout.write('✓ Config is valid\n');
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(2);
    }
    process.exit(0);
  }

  if (sub === 'show') {
    try {
      const config = await loadConfig(cfgPath);
      process.stdout.write(JSON.stringify(config, null, 2) + '\n');
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (sub === 'edit') {
    const editor = process.env.EDITOR || 'vim';
    await run(editor, [cfgPath]);
    process.exit(0);
  }

  process.stderr.write(`Unknown config subcommand: ${sub}\n`);
  process.exit(1);
}

export async function main() {
  // Disable colors if requested
  if (process.env.TILDE_NO_COLOR) {
    process.env.FORCE_COLOR = '0';
  }

  const { configPath, ci, reconfigure, resume, noResume, dryRun, positionals } = parseCliArgs();

  // Handle subcommands before rendering
  const [subcommand, sub, arg] = positionals;

  if (subcommand === 'context') {
    await handleContextSubcommand(sub ?? 'list', arg, configPath);
    return;
  }

  if (subcommand === 'plugin') {
    await handlePluginSubcommand(sub ?? 'list', arg);
    return;
  }

  if (subcommand === 'config') {
    await handleConfigSubcommand(sub ?? 'show', arg, configPath);
    return;
  }

  // T016: tilde update <resource> subcommand
  if (subcommand === 'update' || subcommand === 'install') {
    // Both 'install' and 'update' require a discoverable config
    const resolvedForCmd = configPath ?? await discoverConfig();

    if (!resolvedForCmd) {
      // T013: config-required error — do NOT launch wizard
      process.stderr.write(formatNoConfigError(subcommand) + '\n');
      process.exit(2);
    }

    if (subcommand === 'update') {
      const resource = sub;
      const { UpdateCommand } = await import('./modes/update.js');
      render(React.createElement(UpdateCommand, {
        resource: resource ?? '',
        configPath: resolvedForCmd,
      }));
      return;
    }

    // subcommand === 'install': handled by config-first mode below
    // fall through with resolvedForCmd
    const { App: AppForInstall } = await import('./app.js');
    render(React.createElement(AppForInstall, {
      mode: 'config-first',
      configPath: resolvedForCmd,
      dryRun,
      resume: false,
      reconfigure: false,
      version: VERSION,
    }));
    return;
  }

  // Platform check
  try {
    assertMacOS();
  } catch (err) {
    process.stderr.write(`\n${(err as Error).message}\n`);
    process.exit(1);
  }

  // Auto-discover tilde.config.json using standard search order (T012)
  let resolvedConfigPath = configPath;
  if (!resolvedConfigPath) {
    resolvedConfigPath = await discoverConfig() ?? undefined;
  }

  // Determine mode
  let mode: 'wizard' | 'config-first' | 'non-interactive';
  if (ci) {
    if (!resolvedConfigPath) {
      process.stderr.write('Error: --ci/--yes requires --config <path>\n');
      process.exit(3);
    }
    mode = 'non-interactive';
  } else if (resolvedConfigPath) {
    mode = 'config-first';
  } else {
    mode = 'wizard';
  }

  // Guard: Ink requires a TTY for raw mode. When tilde is invoked from a piped
  // install script (curl | bash), stdin is not a TTY — exit cleanly with a message.
  if (!process.stdin.isTTY && mode !== 'non-interactive') {
    process.stdout.write('✓ tilde is installed — open a new terminal and run: tilde\n');
    process.exit(0);
  }

  render(
    React.createElement(App, {
      mode,
      configPath: resolvedConfigPath,
      dryRun,
      resume: resume && !noResume,
      reconfigure,
      version: VERSION,
    })
  );
}

