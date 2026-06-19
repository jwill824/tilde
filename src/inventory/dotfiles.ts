import { lstat, readFile } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';
import fg from 'fast-glob';
import { createCaptureFilter, filterDotfiles } from '../capture/filter.js';
import { allToolMetadata, getToolsByConfigPath, getToolsByDotfilePath } from '../tools/registry.js';
import type { ToolMetadata } from '../tools/metadata.js';
import type { InventoryWarning } from './report.js';

export type DotfileScanScope = 'home' | 'dotfiles-repo' | 'workspace';

export type DotfileFindingKind =
  | 'metadata-path'
  | 'alias'
  | 'function'
  | 'export'
  | 'path-edit'
  | 'source'
  | 'tool-init-hook'
  | 'unknown';

export type DotfileFindingClassification = 'known' | 'unknown' | 'ambiguous';

export type DotfileFileState = 'known' | 'unknown' | 'mixed' | 'skipped';

export type DotfileFindingConfidence = 'high' | 'medium' | 'low';

export type RcExportValueKind = 'empty' | 'literal' | 'reference' | 'command-derived' | 'secret-like';

export interface DotfileFinding {
  kind: DotfileFindingKind;
  classification: DotfileFindingClassification;
  toolIds: string[];
  reason: string;
  confidence: DotfileFindingConfidence;
  safeDetails: Record<string, string | string[] | boolean | number>;
}

export interface DotfileFileSummary {
  path: string;
  scope: DotfileScanScope;
  state: DotfileFileState;
  toolIds: string[];
  findings: DotfileFinding[];
  warningIds: string[];
}

export interface DotfileToolSummary {
  toolId: string;
  label: string;
  category: string;
  knownFileCount: number;
  findingCount: number;
  paths: string[];
}

export interface DotfileMap {
  homeDir: string;
  files: DotfileFileSummary[];
  tools: DotfileToolSummary[];
  counts: {
    totalFiles: number;
    knownFiles: number;
    unknownFiles: number;
    mixedFiles: number;
    skippedFiles: number;
    warnings: number;
    knownFindingsCount: number;
    unknownFindingsCount: number;
  };
  warningIds: string[];
}

export interface DotfileScanOptions {
  homeDir?: string;
  dotfilesRepo?: string;
  workspaceRoots?: string[];
  warnings?: InventoryWarning[];
}

interface DotfileCandidate {
  path: string;
  scope: DotfileScanScope;
  queryPath: string;
}

const HOME_RC_CANDIDATES = [
  '.zshrc',
  '.zprofile',
  '.zshenv',
  '.bashrc',
  '.bash_profile',
  '.gitconfig',
  '.vimrc',
] as const;

const WORKSPACE_ROOT_PATTERNS = [
  '.editorconfig',
  '.gitignore',
  'package.json',
  'tsconfig.json',
  'biome.json',
  'eslint.config.js',
] as const;

const WORKSPACE_SHALLOW_PATTERNS = [
  '.config/*',
  '.config/*/*',
  '.vscode/*',
  '.github/*',
] as const;

export function createEmptyDotfileMap(homeDir = process.env.HOME ?? '~'): DotfileMap {
  return {
    homeDir,
    files: [],
    tools: [],
    counts: {
      totalFiles: 0,
      knownFiles: 0,
      unknownFiles: 0,
      mixedFiles: 0,
      skippedFiles: 0,
      warnings: 0,
      knownFindingsCount: 0,
      unknownFindingsCount: 0,
    },
    warningIds: [],
  };
}

export async function scanDotfileMap(options: DotfileScanOptions = {}): Promise<DotfileMap> {
  const homeDir = options.homeDir ?? process.env.HOME ?? '~';
  const warnings = options.warnings ?? [];
  const candidates = await collectCandidates({
    homeDir,
    dotfilesRepo: options.dotfilesRepo,
    workspaceRoots: options.workspaceRoots ?? [],
  });

  const files: DotfileFileSummary[] = [];

  for (const candidate of candidates) {
    const summary = await summarizeCandidate(candidate, warnings);
    if (summary) {
      files.push(summary);
    }
  }

  return buildDotfileMap(homeDir, files, warnings);
}

export function parseShellRcFindings(filePath: string, content: string): DotfileFinding[] {
  const findings: DotfileFinding[] = [];

  for (const [index, line] of content.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const hookFinding = parseKnownHook(trimmed, filePath, index + 1);
    if (hookFinding) {
      findings.push(hookFinding);
      continue;
    }

    const aliasMatch = trimmed.match(/^alias\s+([^=\s]+)=/);
    if (aliasMatch) {
      findings.push(createRcFinding('alias', filePath, index + 1, {
        name: aliasMatch[1],
      }));
      continue;
    }

    const functionMatch = trimmed.match(/^(?:function\s+)?([A-Za-z_][A-Za-z0-9_-]*)\s*(?:\(\))?\s*\{/);
    if (functionMatch) {
      findings.push(createRcFinding('function', filePath, index + 1, {
        name: functionMatch[1],
      }));
      continue;
    }

    const pathMatch = trimmed.match(/^(?:export\s+)?PATH(?:\+)?=(.+)$/);
    if (pathMatch) {
      findings.push(createRcFinding('path-edit', filePath, index + 1, {
        name: 'PATH',
        valueKind: classifyRcExportValue(pathMatch[1] ?? ''),
        editKind: classifyPathEdit(pathMatch[1] ?? ''),
      }));
      continue;
    }

    const exportMatch = trimmed.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)=?(.+)?$/);
    if (exportMatch) {
      findings.push(createRcFinding('export', filePath, index + 1, {
        name: exportMatch[1],
        valueKind: classifyRcExportValue(exportMatch[2] ?? ''),
      }));
      continue;
    }

    const sourceMatch = trimmed.match(/(?:^|&&\s*|\|\|\s*)(?:source|\.)\s+(.+)$/);
    if (sourceMatch) {
      findings.push(createSourceFinding(filePath, index + 1, sourceMatch[1]));
    }
  }

  return findings;
}

export function classifyRcExportValue(rawValue: string): RcExportValueKind {
  const value = rawValue.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (!value) {
    return 'empty';
  }

  if (/^(ghp_|sk-|AKIA|xox[bp]-|op:\/\/)/.test(value)) {
    return 'secret-like';
  }

  if (/\$\(|`/.test(value)) {
    return 'command-derived';
  }

  if (/\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+}/.test(value)) {
    return 'reference';
  }

  return 'literal';
}

async function collectCandidates(options: {
  homeDir: string;
  dotfilesRepo?: string;
  workspaceRoots: string[];
}): Promise<DotfileCandidate[]> {
  const candidates = new Map<string, DotfileCandidate>();

  addCandidates(candidates, await collectMetadataCandidates(options.homeDir, 'home', options.homeDir));
  addCandidates(candidates, await collectHomeDotfileCandidates(options.homeDir));

  if (options.dotfilesRepo) {
    const dotfilesRepo = expandHomePath(options.dotfilesRepo, options.homeDir);
    addCandidates(candidates, await collectRootAndShallowCandidates(dotfilesRepo, 'dotfiles-repo'));
  }

  for (const workspaceRoot of options.workspaceRoots) {
    addCandidates(candidates, await collectWorkspaceCandidates(workspaceRoot));
  }

  return [...candidates.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function collectMetadataCandidates(homeDir: string, scope: DotfileScanScope, rootDir: string): Promise<DotfileCandidate[]> {
  const candidates: DotfileCandidate[] = [];
  const metadataPaths = uniqueStrings(allToolMetadata.flatMap(metadata => [
    ...(metadata.configPaths ?? []),
    ...(metadata.dotfilePaths ?? []),
  ]));

  for (const metadataPath of metadataPaths) {
    const absolutePath = expandHomePath(metadataPath, homeDir);
    const stat = await statIfExists(absolutePath);
    if (!stat) {
      continue;
    }

    if (stat.isFile() || stat.isSymbolicLink()) {
      candidates.push({
        path: absolutePath,
        scope,
        queryPath: toRegistryQueryPath(absolutePath, rootDir),
      });
      continue;
    }

    if (stat.isDirectory()) {
      const files = await fg(['**/*'], {
        cwd: absolutePath,
        onlyFiles: true,
        dot: true,
        deep: 2,
        followSymbolicLinks: false,
        absolute: true,
      });

      for (const filePath of files) {
        candidates.push({
          path: filePath,
          scope,
          queryPath: toRegistryQueryPath(filePath, rootDir),
        });
      }
    }
  }

  return candidates;
}

async function collectHomeDotfileCandidates(homeDir: string): Promise<DotfileCandidate[]> {
  const files = await fg(['.*'], {
    cwd: homeDir,
    onlyFiles: true,
    dot: true,
    deep: 1,
    followSymbolicLinks: false,
    absolute: true,
  });
  const explicitRcFiles = HOME_RC_CANDIDATES.map(fileName => resolve(homeDir, fileName));
  const filter = createCaptureFilter();
  const { included } = filterDotfiles([...files, ...explicitRcFiles], filter);

  return uniqueStrings(included).map(filePath => ({
    path: filePath,
    scope: 'home',
    queryPath: toRegistryQueryPath(filePath, homeDir),
  }));
}

async function collectRootAndShallowCandidates(rootDir: string, scope: DotfileScanScope): Promise<DotfileCandidate[]> {
  const files = await fg(['.*', '.config/*', '.vscode/*', '.github/*'], {
    cwd: rootDir,
    onlyFiles: true,
    dot: true,
    deep: 1,
    followSymbolicLinks: false,
    absolute: true,
  });

  return files.map(filePath => ({
    path: filePath,
    scope,
    queryPath: toRegistryQueryPath(filePath, rootDir),
  }));
}

async function collectWorkspaceCandidates(workspaceRoot: string): Promise<DotfileCandidate[]> {
  const files = await fg([...WORKSPACE_ROOT_PATTERNS, ...WORKSPACE_SHALLOW_PATTERNS], {
    cwd: workspaceRoot,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: false,
    absolute: true,
  });

  return files.map(filePath => ({
    path: filePath,
    scope: 'workspace',
    queryPath: toRegistryQueryPath(filePath, workspaceRoot),
  }));
}

async function summarizeCandidate(
  candidate: DotfileCandidate,
  warnings: InventoryWarning[]
): Promise<DotfileFileSummary | undefined> {
  const stat = await statIfExists(candidate.path);
  if (!stat) {
    return undefined;
  }

  if (stat.isSymbolicLink()) {
    const warning = pushDotfileWarning(warnings, `Skipped symlink dotfile candidate: ${candidate.path}`);
    return {
      path: candidate.path,
      scope: candidate.scope,
      state: 'skipped',
      toolIds: [],
      findings: [],
      warningIds: [warning.id],
    };
  }

  if (!stat.isFile()) {
    return undefined;
  }

  let content: string;
  try {
    content = await readFile(candidate.path, 'utf-8');
  } catch {
    const warning = pushDotfileWarning(warnings, `Skipped unreadable dotfile candidate: ${candidate.path}`);
    return {
      path: candidate.path,
      scope: candidate.scope,
      state: 'skipped',
      toolIds: [],
      findings: [],
      warningIds: [warning.id],
    };
  }

  const findings = createMetadataFindings(candidate.queryPath);
  if (isRcFile(candidate.path)) {
    findings.push(...parseShellRcFindings(candidate.path, content));
  }

  if (findings.length === 0) {
    findings.push({
      kind: 'unknown',
      classification: 'unknown',
      toolIds: [],
      reason: 'unmatched-path',
      confidence: 'low',
      safeDetails: {
        pathKind: candidate.queryPath.startsWith('~/.') ? 'dotfile' : 'config',
      },
    });
  }

  const toolIds = uniqueStrings(findings.flatMap(finding => finding.toolIds)).sort();

  return {
    path: candidate.path,
    scope: candidate.scope,
    state: classifyFileState(findings),
    toolIds,
    findings,
    warningIds: [],
  };
}

function createMetadataFindings(queryPath: string): DotfileFinding[] {
  const findings: DotfileFinding[] = [];
  const configTools = getToolsByConfigPath(queryPath);
  const dotfileTools = getToolsByDotfilePath(queryPath);

  findings.push(...createMetadataPathFindings(queryPath, configTools, 'config-path'));
  findings.push(...createMetadataPathFindings(queryPath, dotfileTools, 'dotfile-path'));

  return findings;
}

function createMetadataPathFindings(
  queryPath: string,
  tools: ToolMetadata[],
  matchType: 'config-path' | 'dotfile-path'
): DotfileFinding[] {
  return tools.map(tool => ({
    kind: 'metadata-path',
    classification: 'known',
    toolIds: [tool.id],
    reason: matchType,
    confidence: 'high',
    safeDetails: {
      matchedPath: findMatchedMetadataPath(queryPath, tool, matchType) ?? queryPath,
      matchType,
    },
  }));
}

function findMatchedMetadataPath(
  queryPath: string,
  tool: ToolMetadata,
  matchType: 'config-path' | 'dotfile-path'
): string | undefined {
  const paths = matchType === 'config-path'
    ? tool.configPaths ?? []
    : tool.dotfilePaths ?? [];

  return paths.find(path => pathMatches(path, queryPath));
}

function buildDotfileMap(homeDir: string, files: DotfileFileSummary[], warnings: InventoryWarning[]): DotfileMap {
  const toolSummaries = new Map<string, DotfileToolSummary>();

  for (const file of files) {
    for (const finding of file.findings) {
      for (const toolId of finding.toolIds) {
        const metadata = allToolMetadata.find(tool => tool.id === toolId);
        const summary = toolSummaries.get(toolId) ?? {
          toolId,
          label: metadata?.label ?? toolId,
          category: metadata?.category ?? 'unknown',
          knownFileCount: 0,
          findingCount: 0,
          paths: [],
        };

        summary.findingCount += 1;
        if (!summary.paths.includes(file.path)) {
          summary.paths.push(file.path);
          summary.knownFileCount += 1;
        }
        toolSummaries.set(toolId, summary);
      }
    }
  }

  const dotfileWarnings = warnings.filter(warning => warning.source === 'dotfiles');

  return {
    homeDir,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    tools: [...toolSummaries.values()].sort((a, b) => a.toolId.localeCompare(b.toolId)),
    counts: {
      totalFiles: files.length,
      knownFiles: files.filter(file => file.state === 'known').length,
      unknownFiles: files.filter(file => file.state === 'unknown').length,
      mixedFiles: files.filter(file => file.state === 'mixed').length,
      skippedFiles: files.filter(file => file.state === 'skipped').length,
      warnings: dotfileWarnings.length,
      knownFindingsCount: files.reduce((count, file) => count + file.findings.filter(isKnownRcFinding).length, 0),
      unknownFindingsCount: files.reduce((count, file) => count + file.findings.filter(isUnknownRcFinding).length, 0),
    },
    warningIds: dotfileWarnings.map(warning => warning.id),
  };
}

function parseKnownHook(trimmed: string, filePath: string, line: number): DotfileFinding | undefined {
  const hook = knownHookForLine(trimmed);
  if (!hook) {
    return undefined;
  }

  return {
    kind: 'tool-init-hook',
    classification: 'known',
    toolIds: [hook.toolId],
    reason: 'rc-file-content',
    confidence: 'high',
    safeDetails: {
      filePath,
      line,
      toolId: hook.toolId,
      hookKind: hook.hookKind,
    },
  };
}

function knownHookForLine(trimmed: string): { toolId: string; hookKind: string } | undefined {
  if (/\bdirenv\s+hook\b/.test(trimmed)) {
    return { toolId: 'direnv', hookKind: 'shell-hook' };
  }

  if (/\bvfox\s+activate\b/.test(trimmed)) {
    return { toolId: 'vfox', hookKind: 'shell-hook' };
  }

  if (/\bop\s+signin\b/.test(trimmed)) {
    return { toolId: '1password', hookKind: 'runtime-init' };
  }

  if (/\bbrew\s+shellenv\b/.test(trimmed)) {
    return { toolId: 'homebrew', hookKind: 'shellenv' };
  }

  return undefined;
}

function createRcFinding(
  kind: Exclude<DotfileFindingKind, 'metadata-path' | 'unknown' | 'tool-init-hook'>,
  filePath: string,
  line: number,
  safeDetails: Record<string, string | string[] | boolean | number>
): DotfileFinding {
  return {
    kind,
    classification: 'unknown',
    toolIds: [],
    reason: 'rc-file-content',
    confidence: 'medium',
    safeDetails: {
      filePath,
      line,
      ...safeDetails,
    },
  };
}

function createSourceFinding(filePath: string, line: number, rawTarget: string): DotfileFinding {
  const target = stripInlineComment(rawTarget).trim().replace(/^(['"])(.*)\1$/, '$2');
  const sourceKind = classifySourceTarget(target);
  const safeDetails: Record<string, string | number> = {
    filePath,
    line,
    sourceKind,
  };

  if (sourceKind !== 'command-derived') {
    safeDetails.target = target;
  }

  return {
    kind: 'source',
    classification: 'unknown',
    toolIds: [],
    reason: 'rc-file-content',
    confidence: 'medium',
    safeDetails,
  };
}

function classifySourceTarget(target: string): 'literal' | 'reference' | 'command-derived' {
  if (/\$\(|`/.test(target)) {
    return 'command-derived';
  }

  if (/\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+}/.test(target)) {
    return 'reference';
  }

  return 'literal';
}

function classifyPathEdit(value: string): 'assignment' | 'prepend' | 'append' | 'reference' {
  const normalized = value.trim().replace(/^(['"])(.*)\1$/, '$2');
  const pathRefIndex = normalized.indexOf('$PATH');

  if (pathRefIndex === -1) {
    return 'assignment';
  }

  if (pathRefIndex === 0) {
    return 'append';
  }

  if (pathRefIndex > 0) {
    return 'prepend';
  }

  return 'reference';
}

function stripInlineComment(value: string): string {
  const commentIndex = value.indexOf(' #');
  return commentIndex === -1 ? value : value.slice(0, commentIndex);
}

function classifyFileState(findings: DotfileFinding[]): DotfileFileState {
  const hasKnown = findings.some(finding => finding.classification === 'known');
  const hasUnknown = findings.some(finding => finding.classification === 'unknown');

  if (hasKnown && hasUnknown) {
    return 'mixed';
  }

  if (hasKnown) {
    return 'known';
  }

  return 'unknown';
}

function pushDotfileWarning(warnings: InventoryWarning[], message: string): InventoryWarning {
  const warning: InventoryWarning = {
    id: `dotfiles-${warnings.filter(existing => existing.source === 'dotfiles').length + 1}`,
    source: 'dotfiles',
    severity: 'warning',
    message,
  };
  warnings.push(warning);
  return warning;
}

function isRcFile(filePath: string): boolean {
  return HOME_RC_CANDIDATES.includes(basename(filePath) as typeof HOME_RC_CANDIDATES[number]);
}

function isKnownRcFinding(finding: DotfileFinding): boolean {
  return finding.kind === 'tool-init-hook' && finding.classification === 'known';
}

function isUnknownRcFinding(finding: DotfileFinding): boolean {
  return finding.classification === 'unknown' &&
    finding.kind !== 'metadata-path' &&
    finding.kind !== 'unknown';
}

function addCandidates(target: Map<string, DotfileCandidate>, candidates: DotfileCandidate[]): void {
  for (const candidate of candidates) {
    target.set(`${candidate.scope}:${candidate.path}`, candidate);
  }
}

function expandHomePath(filePath: string, homeDir: string): string {
  if (filePath === '~') {
    return homeDir;
  }

  if (filePath.startsWith('~/')) {
    return resolve(homeDir, filePath.slice(2));
  }

  return resolve(filePath);
}

function toRegistryQueryPath(filePath: string, rootDir: string): string {
  const relativePath = relative(rootDir, filePath);
  if (!relativePath || relativePath.startsWith('..') || relativePath.split(sep).includes('..')) {
    return filePath;
  }

  return `~/${relativePath.split(sep).join('/')}`;
}

async function statIfExists(filePath: string) {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (isMissingPathError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function pathMatches(knownPath: string, queryPath: string): boolean {
  const normalizedKnownPath = normalizePath(knownPath);
  const normalizedQueryPath = normalizePath(queryPath);

  return normalizedQueryPath === normalizedKnownPath ||
    normalizedQueryPath.startsWith(`${normalizedKnownPath}/`);
}

function normalizePath(filePath: string): string {
  return filePath.trim().replace(/\/+$/, '');
}
