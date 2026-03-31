#!/usr/bin/env node
import { main, PluginError } from '../src/index.js';

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
