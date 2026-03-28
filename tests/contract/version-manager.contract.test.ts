import { vi, beforeEach } from 'vitest';
import { runVersionManagerContractTests } from './version-manager.contract.js';
import type { VersionManagerPlugin } from '../../src/plugins/api.js';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  ExecaError: class ExecaError extends Error {
    stderr = '';
    exitCode = 1;
  },
}));

let vfoxPlugin: VersionManagerPlugin;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../src/plugins/first-party/vfox/index.js');
  vfoxPlugin = mod.default;
});

runVersionManagerContractTests(
  () => vfoxPlugin,
  () => {}
);
