import { access } from 'node:fs/promises';
import { createCaptureFilter, filterDotfiles } from '../capture/filter.js';
import { scanDotfiles, scanRcFiles } from '../capture/scanner.js';
import { allToolMetadata } from '../tools/registry.js';
import type { ToolMetadata } from '../tools/metadata.js';
import { listInstalledCasks, listInstalledFormulae, listInstalledOnRequestFormulae } from '../utils/package-manager.js';
import {
  detectLanguages,
  detectVersionManagers,
  type DetectedLanguage,
  type DetectedVersionManager,
} from '../utils/env-detection.js';
import { classifyHomebrewInventory, type ClassifiedHomebrewCask, type ClassifiedHomebrewFormula } from './homebrew.js';
import {
  createEmptyInventoryReport,
  type InventoryEvidence,
  type InventoryInstallState,
  type InventoryReport,
  type InventoryToolFact,
  type InventoryWarning,
  type InventoryWarningSource,
} from './report.js';

type HomebrewResult = {
  formulae: ClassifiedHomebrewFormula[] | null;
  casks: ClassifiedHomebrewCask[] | null;
  available: boolean;
};

const CORE_TOOL_IDS = ['git', 'node', 'npm'] as const;
const SHELL_IDS = ['zsh', 'bash'] as const;

export async function scanInventory(homeDir?: string): Promise<InventoryReport> {
  const resolvedHome = homeDir ?? process.env.HOME ?? '~';
  const report = createEmptyInventoryReport(resolvedHome);
  const warnings = report.warnings;
  const homebrew = await scanHomebrew(warnings);
  const formulaMap = homebrew.formulae === null
    ? null
    : new Map(homebrew.formulae.map(formula => [formula.id, formula]));
  const caskMap = homebrew.casks === null
    ? null
    : new Map(homebrew.casks.map(cask => [cask.id, cask]));

  report.environment = {
    homeDir: resolvedHome,
    shell: process.env.SHELL,
    rcFiles: await scanEnvironmentRcFiles(resolvedHome, warnings),
    detectedLanguages: await scanDetectedLanguages(warnings),
    detectedVersionManagers: await scanDetectedVersionManagers(warnings),
  };

  const matchedFormulae = new Set<string>();
  const matchedCasks = new Set<string>();

  for (const metadata of allToolMetadata) {
    const fact = await createMetadataFact(metadata, {
      formulaMap,
      caskMap,
      homebrewAvailable: homebrew.available,
      warnings,
    });

    const formula = metadata.install?.homebrew?.formula;
    if (formula && fact.evidence.some(evidence => evidence.type === 'homebrew-formula')) {
      matchedFormulae.add(formula);
    }

    const cask = metadata.install?.homebrew?.cask;
    if (cask && fact.evidence.some(evidence => evidence.type === 'homebrew-cask')) {
      matchedCasks.add(cask);
    }

    report.tools.push(fact);
  }

  report.tools.push(...createShellFacts(report.environment.shell));
  report.tools.push(...createCoreToolFacts(report.environment.detectedLanguages, report.environment.detectedVersionManagers));

  report.unmatchedHomebrew = {
    formulae: homebrew.formulae?.filter(formula => !matchedFormulae.has(formula.id)) ?? [],
    casks: homebrew.casks?.filter(cask => !matchedCasks.has(cask.id)) ?? [],
  };

  const requestStatusCounts = countFormulaRequestStatuses(homebrew.formulae ?? []);

  report.homebrew = {
    installedFormulaeCount: homebrew.formulae?.length ?? 0,
    installedCasksCount: homebrew.casks?.length ?? 0,
    matchedFormulaeCount: matchedFormulae.size,
    matchedCasksCount: matchedCasks.size,
    unmatchedFormulaeCount: report.unmatchedHomebrew.formulae.length,
    unmatchedCasksCount: report.unmatchedHomebrew.casks.length,
    directFormulaeCount: requestStatusCounts.direct,
    dependencyFormulaeCount: requestStatusCounts.dependency,
    unknownFormulaeCount: requestStatusCounts.unknown,
  };

  return report;
}

async function scanHomebrew(warnings: InventoryWarning[]): Promise<HomebrewResult> {
  const [formulae, casks, installedOnRequestFormulae] = await Promise.all([
    scanHomebrewList('formulae', listInstalledFormulae, warnings),
    scanHomebrewList('casks', listInstalledCasks, warnings),
    scanHomebrewRequestState(warnings),
  ]);
  const available = formulae !== null || casks !== null || installedOnRequestFormulae !== null;

  return {
    available,
    formulae: formulae === null
      ? null
      : classifyHomebrewInventory({
        formulae,
        casks: casks ?? [],
        installedOnRequestFormulae: installedOnRequestFormulae ?? [],
        requestStatusAvailable: installedOnRequestFormulae !== null,
      }).formulae,
    casks: casks === null
      ? null
      : classifyHomebrewInventory({
        formulae: formulae ?? [],
        casks,
        installedOnRequestFormulae: installedOnRequestFormulae ?? [],
        requestStatusAvailable: installedOnRequestFormulae !== null,
      }).casks,
  };
}

async function scanHomebrewList(
  name: 'formulae' | 'casks',
  helper: () => Promise<string[]>,
  warnings: InventoryWarning[]
): Promise<string[] | null> {
  try {
    return await helper();
  } catch {
    warnings.push(createWarning('homebrew', `Homebrew ${name} could not be read; related inventory facts are unknown.`));
    return null;
  }
}

async function scanHomebrewRequestState(warnings: InventoryWarning[]): Promise<string[] | null> {
  try {
    return await listInstalledOnRequestFormulae();
  } catch {
    warnings.push(createWarning(
      'homebrew',
      'Homebrew direct/dependency request state could not be read; formula request status is unknown.',
      undefined,
      'homebrew-request-state-unavailable'
    ));
    return null;
  }
}

async function scanDetectedLanguages(warnings: InventoryWarning[]): Promise<DetectedLanguage[]> {
  try {
    return await detectLanguages();
  } catch {
    warnings.push(createWarning('environment', 'Language detection failed; core language facts may be unknown.'));
    return [];
  }
}

async function scanEnvironmentRcFiles(homeDir: string, warnings: InventoryWarning[]): Promise<Record<string, string>> {
  try {
    const filter = createCaptureFilter();
    const dotfiles = await scanDotfiles(homeDir);
    const { included } = filterDotfiles(dotfiles, filter);
    return await scanRcFiles(included);
  } catch {
    warnings.push(createWarning('environment', 'Shell and git rc files could not be read; related wizard defaults may be unavailable.'));
    return {};
  }
}

async function scanDetectedVersionManagers(warnings: InventoryWarning[]): Promise<DetectedVersionManager[]> {
  try {
    return await detectVersionManagers();
  } catch {
    warnings.push(createWarning('environment', 'Version manager detection failed; related facts may be unknown.'));
    return [];
  }
}

async function createMetadataFact(
  metadata: ToolMetadata,
  context: {
    formulaMap: Map<string, ClassifiedHomebrewFormula> | null;
    caskMap: Map<string, ClassifiedHomebrewCask> | null;
    homebrewAvailable: boolean;
    warnings: InventoryWarning[];
  }
): Promise<InventoryToolFact> {
  const evidence: InventoryEvidence[] = [];
  const warningIds: string[] = [];
  const formula = metadata.install?.homebrew?.formula;
  const cask = metadata.install?.homebrew?.cask;
  let installedEvidence = false;
  let missingEvidence = false;
  let unknownEvidence = false;

  if (metadata.id === 'homebrew') {
    if (context.homebrewAvailable) {
      evidence.push({ type: 'command', command: 'brew', outcome: 'succeeded' });
      installedEvidence = true;
    } else {
      const warningId = firstWarningId(context.warnings, 'homebrew');
      if (warningId) {
        warningIds.push(warningId);
        evidence.push({
          type: 'inconclusive',
          source: 'homebrew',
          reason: 'Could not confirm Homebrew command availability from helper calls.',
          warningId,
        });
        unknownEvidence = true;
      }
    }
  }

  if (formula) {
    if (context.formulaMap === null) {
      const warningId = firstWarningId(context.warnings, 'homebrew');
      warningIds.push(...optionalWarningId(warningId));
      evidence.push({
        type: 'inconclusive',
        source: 'homebrew',
        reason: `Could not determine whether Homebrew formula ${formula} is installed.`,
        warningId,
      });
      unknownEvidence = true;
    } else if (context.formulaMap.has(formula)) {
      const classifiedFormula = context.formulaMap.get(formula);
      evidence.push({
        type: 'homebrew-formula',
        id: formula,
        requestStatus: classifiedFormula?.requestStatus ?? 'unknown',
      });
      installedEvidence = true;
    } else {
      missingEvidence = true;
    }
  }

  if (cask) {
    if (context.caskMap === null) {
      const warningId = firstWarningId(context.warnings, 'homebrew');
      warningIds.push(...optionalWarningId(warningId));
      evidence.push({
        type: 'inconclusive',
        source: 'homebrew',
        reason: `Could not determine whether Homebrew cask ${cask} is installed.`,
        warningId,
      });
      unknownEvidence = true;
    } else if (context.caskMap.has(cask)) {
      evidence.push({ type: 'homebrew-cask', id: cask, requestStatus: 'direct' });
      installedEvidence = true;
    } else {
      missingEvidence = true;
    }
  }

  const appPath = metadata.install?.appPath;
  if (appPath) {
    const appPathEvidence = await checkAppPath(metadata.id, appPath, context.warnings);
    evidence.push(appPathEvidence.evidence);
    warningIds.push(...appPathEvidence.warningIds);

    if (appPathEvidence.evidence.type === 'app-path') {
      if (appPathEvidence.evidence.exists) {
        installedEvidence = true;
      } else {
        missingEvidence = true;
      }
    } else {
      unknownEvidence = true;
    }
  }

  const installed = resolveInstallState({ installedEvidence, missingEvidence, unknownEvidence });

  return {
    toolId: metadata.id,
    label: metadata.label,
    category: metadata.category,
    installed,
    evidence,
    warningIds: uniqueStrings(warningIds),
  };
}

async function checkAppPath(
  toolId: string,
  appPath: string,
  warnings: InventoryWarning[]
): Promise<{ evidence: InventoryEvidence; warningIds: string[] }> {
  try {
    await access(appPath);
    return {
      evidence: { type: 'app-path', path: appPath, exists: true },
      warningIds: [],
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return {
        evidence: { type: 'app-path', path: appPath, exists: false },
        warningIds: [],
      };
    }

    const warning = createWarning('app-path', `Could not check app path for ${toolId}; app bundle state is unknown.`, toolId);
    warnings.push(warning);
    return {
      evidence: {
        type: 'inconclusive',
        source: 'app-path',
        reason: `Could not check app path ${appPath}.`,
        warningId: warning.id,
      },
      warningIds: [warning.id],
    };
  }
}

function createShellFacts(activeShell?: string): InventoryToolFact[] {
  return SHELL_IDS.map(shell => {
    const isActive = activeShell?.split('/').pop() === shell;
    return {
      toolId: `shell:${shell}`,
      label: shell,
      category: 'shell',
      installed: isActive ? 'installed' : 'unknown',
      evidence: isActive
        ? [{ type: 'shell', name: shell, source: 'process-env' }]
        : [{ type: 'inconclusive', source: 'environment', reason: `Shell ${shell} was not the active process shell.` }],
      warningIds: [],
    };
  });
}

function createCoreToolFacts(
  languages: DetectedLanguage[],
  versionManagers: DetectedVersionManager[]
): InventoryToolFact[] {
  return CORE_TOOL_IDS.map(toolId => {
    const language = languages.find(detected => detected.name === toolId);
    const versionManager = versionManagers.find(detected => detected.name === toolId);
    const version = language?.version;
    const installed = language || versionManager;

    return {
      toolId: `core-tool:${toolId}`,
      label: toolId,
      category: 'core-tool',
      installed: installed ? 'installed' : 'unknown',
      evidence: installed
        ? [{ type: 'command', command: toolId, outcome: 'succeeded', version }]
        : [{ type: 'inconclusive', source: 'environment', reason: `Core tool ${toolId} was not detected.` }],
      warningIds: [],
    };
  });
}

function resolveInstallState(evidence: {
  installedEvidence: boolean;
  missingEvidence: boolean;
  unknownEvidence: boolean;
}): InventoryInstallState {
  if (evidence.installedEvidence) return 'installed';
  if (evidence.unknownEvidence) return 'unknown';
  if (evidence.missingEvidence) return 'missing';
  return 'unknown';
}

function createWarning(source: InventoryWarningSource, message: string, toolId?: string, id?: string): InventoryWarning {
  return {
    id: id ?? `${source}:${message}`,
    source,
    severity: 'warning',
    message,
    toolId,
  };
}

function firstWarningId(warnings: InventoryWarning[], source: InventoryWarningSource): string | undefined {
  return warnings.find(warning => warning.source === source)?.id;
}

function optionalWarningId(id: string | undefined): string[] {
  return id ? [id] : [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function isMissingPathError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

function countFormulaRequestStatuses(formulae: ClassifiedHomebrewFormula[]): Record<'direct' | 'dependency' | 'unknown', number> {
  return formulae.reduce<Record<'direct' | 'dependency' | 'unknown', number>>((counts, formula) => {
    counts[formula.requestStatus] += 1;
    return counts;
  }, {
    direct: 0,
    dependency: 0,
    unknown: 0,
  });
}
