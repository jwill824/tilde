import { vi, beforeEach } from 'vitest';
import { runEnvLoaderContractTests } from './env-loader.contract.js';
import type { EnvLoaderPlugin } from '../../src/plugins/api.js';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  ExecaError: class ExecaError extends Error {
    stderr = '';
    exitCode = 1;
  },
}));

let direnvPlugin: EnvLoaderPlugin;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../src/plugins/first-party/direnv/index.js');
  direnvPlugin = mod.default;
});

runEnvLoaderContractTests(
  () => direnvPlugin,
  () => {}
);
