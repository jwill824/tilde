import { discoverConfig as defaultDiscoverConfig, formatNoConfigError } from './config-discovery.js';

export type ConfigPathSource = 'flag' | 'env' | 'positional' | 'discovered';

export interface ConfigCommandContext {
  command: string;
  configExample: string;
}

export interface ResolvedConfigPath {
  path: string;
  source: ConfigPathSource;
}

export interface ConfigResolutionOptions {
  flagConfigPath?: string;
  envConfigPath?: string;
  positionalConfigPath?: string;
  command: ConfigCommandContext;
  discoverConfig?: () => Promise<string | null>;
}

export type ConfigResolutionResult =
  | { found: true; resolved: ResolvedConfigPath }
  | { found: false; message: string };

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

export async function resolveConfigPath(options: ConfigResolutionOptions): Promise<ConfigResolutionResult> {
  const flagConfigPath = nonEmpty(options.flagConfigPath);
  if (flagConfigPath) {
    return { found: true, resolved: { path: flagConfigPath, source: 'flag' } };
  }

  const envConfigPath = nonEmpty(options.envConfigPath);
  if (envConfigPath) {
    return { found: true, resolved: { path: envConfigPath, source: 'env' } };
  }

  const positionalConfigPath = nonEmpty(options.positionalConfigPath);
  if (positionalConfigPath) {
    return { found: true, resolved: { path: positionalConfigPath, source: 'positional' } };
  }

  const discover = options.discoverConfig ?? defaultDiscoverConfig;
  const discovered = await discover();
  if (discovered) {
    return { found: true, resolved: { path: discovered, source: 'discovered' } };
  }

  return {
    found: false,
    message: await formatNoConfigError(options.command),
  };
}

function isEnoent(error: Error & { code?: string }): boolean {
  return error.code === 'ENOENT';
}

export function formatConfigLoadError(
  resolved: ResolvedConfigPath,
  error: Error & { code?: string },
  _context: ConfigCommandContext
): string {
  if (isEnoent(error)) {
    if (resolved.source === 'flag') {
      return [
        `Config file from --config was not found: ${resolved.path}`,
        `No auto-discovery fallback was attempted. Fix the path or run tilde to create a config.`,
      ].join('\n');
    }

    if (resolved.source === 'env') {
      return [
        `Config file from TILDE_CONFIG was not found: ${resolved.path}`,
        `TILDE_CONFIG is set; fix or unset TILDE_CONFIG before running tilde again.`,
      ].join('\n');
    }

    if (resolved.source === 'positional') {
      return [
        `Config file from the positional path was not found: ${resolved.path}`,
        `No auto-discovery fallback was attempted. Fix the path or omit it to use standard discovery.`,
      ].join('\n');
    }
  }

  return `Error loading selected config ${resolved.path}: ${error.message}`;
}
