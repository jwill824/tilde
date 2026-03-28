import ignore from 'ignore';

export type GitignoreFilter = ReturnType<typeof ignore>;

export const defaultSecretPatterns: string[] = [
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  'secrets.*',
  'node_modules/',
  '.DS_Store',
  '*.log',
];

export function createFilter(patterns: string[]): GitignoreFilter {
  return ignore().add(patterns);
}

export function isExcluded(filePath: string, filter: GitignoreFilter): boolean {
  // ignore package requires relative paths without leading slash
  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  return filter.ignores(normalized);
}
