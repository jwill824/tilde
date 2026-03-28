#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { parseArgs } from 'node:util';
import { assertMacOS } from './utils/os.js';
import { App } from './app.js';

const VERSION = '0.1.0';

function parseCliArgs() {
  // Check env vars first
  const envConfig = process.env.TILDE_CONFIG;
  const envCi = process.env.TILDE_CI === '1' || process.env.TILDE_CI === 'true';

  let args: ReturnType<typeof parseArgs>['values'];
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
  } catch (err) {
    process.stderr.write(`Error parsing arguments: ${(err as Error).message}\n`);
    process.exit(1);
  }

  if (args.help) {
    process.stdout.write(`
tilde — macOS developer environment bootstrap

Usage: tilde [install] [options]

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
  };
}

async function main() {
  // Disable colors if requested
  if (process.env.TILDE_NO_COLOR) {
    process.env.FORCE_COLOR = '0';
  }

  const { configPath, ci, reconfigure, resume, noResume, dryRun } = parseCliArgs();

  // Platform check
  try {
    assertMacOS();
  } catch (err) {
    process.stderr.write(`\n${(err as Error).message}\n`);
    process.exit(1);
  }

  // Determine mode
  let mode: 'wizard' | 'config-first' | 'non-interactive';
  if (ci) {
    if (!configPath) {
      process.stderr.write('Error: --ci/--yes requires --config <path>\n');
      process.exit(3);
    }
    mode = 'non-interactive';
  } else if (configPath) {
    mode = 'config-first';
  } else {
    mode = 'wizard';
  }

  render(
    React.createElement(App, {
      mode,
      configPath,
      dryRun,
      resume: resume && !noResume,
      reconfigure,
    })
  );
}

main().catch((err: Error) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
