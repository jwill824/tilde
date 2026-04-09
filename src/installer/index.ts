import type { TildeConfig } from '../config/schema.js';
import type { PluginRegistry } from '../plugins/registry.js';
import type { PackageManagerPlugin, VersionManagerPlugin } from '../plugins/api.js';
import { PluginError } from '../plugins/api.js';

export interface InstallResult {
  packages: {
    installed: string[];
    skipped: string[];
    failed: string[];
  };
  languages: Array<{
    name: string;
    version: string;
    alreadyInstalled: boolean;
  }>;
  errors: PluginError[];
}

export async function installAll(
  config: TildeConfig,
  registry: PluginRegistry,
  opts?: { dryRun?: boolean; onProgress?: (msg: string) => void }
): Promise<InstallResult> {
  const { dryRun = false, onProgress } = opts ?? {};
  const result: InstallResult = {
    packages: { installed: [], skipped: [], failed: [] },
    languages: [],
    errors: [],
  };

  const log = (msg: string) => onProgress?.(msg);

  // 1. Install packages via active package manager
  const pkgManager = registry.getFirst<PackageManagerPlugin>('package-manager');
  if (!pkgManager) {
    throw new PluginError('installer', 'No package manager plugin registered', 'NO_PLUGIN');
  }

  const allTools = [...config.tools];
  // Add direnv if configuration.direnv is enabled
  if (config.configurations.direnv && !allTools.includes('direnv')) {
    allTools.unshift('direnv');
  }

  if (allTools.length > 0) {
    if (dryRun) {
      log(`[dry-run] Would install packages: ${allTools.join(', ')}`);
      result.packages.installed = allTools;
    } else {
      log(`Installing ${allTools.length} packages via ${pkgManager.name}...`);
      const pkgResult = await pkgManager.installPackages(allTools);
      result.packages = pkgResult;
      log(`  ✓ installed: ${pkgResult.installed.length}, skipped: ${pkgResult.skipped.length}, failed: ${pkgResult.failed.length}`);
    }
  }

  // 2. Install language versions via version managers
  for (const lang of (config.languages ?? [])) {
    const vmPlugin = registry.get<VersionManagerPlugin>('version-manager', lang.manager);
    if (!vmPlugin) {
      log(`Warning: No version manager plugin found for "${lang.manager}", skipping ${lang.name}@${lang.version}`);
      continue;
    }

    if (dryRun) {
      log(`[dry-run] Would install ${lang.name}@${lang.version} via ${lang.manager}`);
      result.languages.push({ name: lang.name, version: lang.version, alreadyInstalled: false });
      continue;
    }

    try {
      log(`Installing ${lang.name}@${lang.version} via ${lang.manager}...`);
      const langResult = await vmPlugin.installVersion(lang.name, lang.version);
      result.languages.push({ name: lang.name, version: lang.version, alreadyInstalled: langResult.alreadyInstalled });
      log(`  ✓ ${lang.name}@${lang.version} ${langResult.alreadyInstalled ? '(already installed)' : 'installed'}`);
    } catch (err) {
      const pluginErr = err instanceof PluginError
        ? err
        : new PluginError(lang.manager, `Failed to install ${lang.name}@${lang.version}`, 'INSTALL_FAILED', err as Error);
      result.errors.push(pluginErr);
      log(`  ✗ Failed to install ${lang.name}@${lang.version}: ${pluginErr.message}`);
    }
  }

  return result;
}
