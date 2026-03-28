#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertMacOS } from './utils/os.js';
import { App } from './app.js';
import { loadConfig } from './config/reader.js';
import { pluginRegistry } from './plugins/registry.js';
import { run } from './utils/exec.js';
import { PluginError } from './plugins/api.js';
import type { PluginCategory, AccountConnectorPlugin } from './plugins/api.js';

const VERSION = '0.1.0';

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
tilde — macOS developer environment bootstrap

Usage: tilde [install] [options]
       tilde context <list|current|switch> [label]
       tilde plugin <list|add|remove> [name]
       tilde config <validate|show|edit> [path]

Options:
  --config <path|url>   Load tilde.config.json (activates config-first mode)
  --yes, --ci           Non-interactive mode (requires --config)
  --reconfigure         Re-run wizard from scratch
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

async function main() {
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

  // Platform check
  try {
    assertMacOS();
  } catch (err) {
    process.stderr.write(`\n${(err as Error).message}\n`);
    process.exit(1);
  }

  // Auto-detect tilde.config.json in cwd if no explicit --config given
  let resolvedConfigPath = configPath;
  if (!resolvedConfigPath) {
    const cwdConfig = resolve(process.cwd(), 'tilde.config.json');
    if (existsSync(cwdConfig)) {
      resolvedConfigPath = cwdConfig;
    }
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

  render(
    React.createElement(App, {
      mode,
      configPath: resolvedConfigPath,
      dryRun,
      resume: resume && !noResume,
      reconfigure,
    })
  );
}

main().catch((err: Error) => {
  if (err instanceof PluginError) {
    process.stderr.write(`Plugin error: ${err.message}\n`);
    process.exit(4);
  }
  if (err.message?.includes('Config validation failed')) {
    process.stderr.write(`Config error: ${err.message}\n`);
    process.exit(2);
  }
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
