import { vi, beforeEach } from 'vitest';
import { runPackageManagerContractTests } from './package-manager.contract.js';
import type { PackageManagerPlugin } from '../../src/plugins/api.js';

// Mock execa at the module level
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: 'test-pkg\n', stderr: '', exitCode: 0 }),
  ExecaError: class ExecaError extends Error {
    stderr = '';
    exitCode = 1;
  },
}));

let homebrewPlugin: PackageManagerPlugin;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../src/plugins/first-party/homebrew/index.js');
  homebrewPlugin = mod.default;
});

runPackageManagerContractTests(
  () => homebrewPlugin,
  () => {} // mock already set up above
);
