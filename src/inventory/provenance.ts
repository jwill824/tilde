import type { TildeConfig } from '../config/schema.js';
import { getToolMetadata } from '../tools/registry.js';
import type { InventoryEvidence, InventoryReport, InventoryToolCategory, InventoryToolFact } from './report.js';

export type ProvenanceLabel =
  | 'tilde-managed'
  | 'already-installed'
  | 'homebrew-dependency'
  | 'manual-install'
  | 'manual-gui'
  | 'os-provided'
  | 'unknown';

export interface ToolProvenance {
  toolId: string;
  label: string;
  category: InventoryToolCategory;
  installed: InventoryToolFact['installed'];
  selected: boolean;
  provenance: ProvenanceLabel;
  detail: string;
  action: string;
  evidence: InventoryEvidence[];
  warningIds: string[];
}

export interface ProvenanceGroupSummary {
  provenance: ProvenanceLabel;
  count: number;
  examples: string[];
  remaining: number;
}

export const PROVENANCE_LABELS: Record<ProvenanceLabel, string> = {
  'tilde-managed': 'tilde-managed',
  'already-installed': 'already installed',
  'homebrew-dependency': 'Homebrew dependency',
  'manual-install': 'manual install',
  'manual-gui': 'manual GUI',
  'os-provided': 'OS-provided',
  unknown: 'unknown',
};

const PROVENANCE_ORDER: ProvenanceLabel[] = [
  'tilde-managed',
  'already-installed',
  'homebrew-dependency',
  'manual-install',
  'manual-gui',
  'os-provided',
  'unknown',
];

export function deriveInventoryProvenance(
  report: InventoryReport,
  config?: TildeConfig
): ToolProvenance[] {
  const selectedToolIds = getSelectedToolIds(config);
  const factsById = new Map(report.tools.map(tool => [tool.toolId, tool]));

  for (const selectedToolId of selectedToolIds) {
    if (!factsById.has(selectedToolId)) {
      const metadata = getToolMetadata(selectedToolId);
      factsById.set(selectedToolId, {
        toolId: selectedToolId,
        label: metadata?.label ?? selectedToolId,
        category: metadata?.category ?? 'core-tool',
        installed: 'unknown',
        evidence: [{ type: 'inconclusive', source: 'scanner', reason: 'No inventory fact was collected for this selected tool.' }],
        warningIds: [],
      });
    }
  }

  return [...factsById.values()].map(tool => {
    const selected = selectedToolIds.has(tool.toolId);
    const provenance = classifyToolProvenance(tool, selected);

    return {
      toolId: tool.toolId,
      label: tool.label,
      category: tool.category,
      installed: tool.installed,
      selected,
      provenance,
      detail: buildDetail(tool, provenance, selected),
      action: buildAction(tool, provenance, selected),
      evidence: tool.evidence,
      warningIds: tool.warningIds,
    };
  });
}

export function summarizeProvenanceGroups(
  provenance: ToolProvenance[],
  maxExamples = 3
): ProvenanceGroupSummary[] {
  return PROVENANCE_ORDER.map(label => {
    const tools = provenance.filter(tool => tool.provenance === label);
    return {
      provenance: label,
      count: tools.length,
      examples: tools.slice(0, maxExamples).map(tool => tool.label),
      remaining: Math.max(0, tools.length - maxExamples),
    };
  }).filter(group => group.count > 0);
}

export function formatProvenanceSummaryLine(report: InventoryReport, config?: TildeConfig): string {
  const groups = summarizeProvenanceGroups(deriveInventoryProvenance(report, config));
  const formattedGroups = groups.map(group => {
    const examples = group.examples.join(', ');
    const more = group.remaining > 0 ? `, +${group.remaining} more` : '';
    return `${PROVENANCE_LABELS[group.provenance]} ${group.count}${examples ? ` (${examples}${more})` : ''}`;
  });

  return `Provenance: ${formattedGroups.length > 0 ? formattedGroups.join('; ') : 'none'}`;
}

function classifyToolProvenance(tool: InventoryToolFact, selected: boolean): ProvenanceLabel {
  if (selected) return 'tilde-managed';
  if (hasHomebrewEvidence(tool.evidence, 'dependency')) return 'homebrew-dependency';
  if (hasHomebrewEvidence(tool.evidence, 'direct')) return 'already-installed';
  if (isScannerOwnedOsTool(tool)) return 'os-provided';
  if (hasExistingAppPathEvidence(tool.evidence)) return 'manual-gui';
  if (tool.installed === 'installed' && getToolMetadata(tool.toolId)?.install?.manualNote) return 'manual-install';
  if (tool.installed === 'installed') return 'already-installed';
  return 'unknown';
}

function buildDetail(tool: InventoryToolFact, provenance: ProvenanceLabel, selected: boolean): string {
  const formulaEvidence = tool.evidence.find(evidence => evidence.type === 'homebrew-formula');
  if (formulaEvidence?.type === 'homebrew-formula') {
    return selected
      ? `Selected by config; Homebrew formula ${formulaEvidence.id} is already present as ${formulaEvidence.requestStatus}.`
      : `Homebrew formula ${formulaEvidence.id} is present as ${formulaEvidence.requestStatus}.`;
  }

  const caskEvidence = tool.evidence.find(evidence => evidence.type === 'homebrew-cask');
  if (caskEvidence?.type === 'homebrew-cask') {
    return selected
      ? `Selected by config; Homebrew cask ${caskEvidence.id} is already present.`
      : `Homebrew cask ${caskEvidence.id} is present.`;
  }

  const appEvidence = tool.evidence.find(evidence => evidence.type === 'app-path');
  if (appEvidence?.type === 'app-path') {
    return appEvidence.exists
      ? `Application bundle exists at ${appEvidence.path}.`
      : `Application bundle was not found at ${appEvidence.path}.`;
  }

  const commandEvidence = tool.evidence.find(evidence => evidence.type === 'command');
  if (commandEvidence?.type === 'command') {
    const version = commandEvidence.version ? ` (${commandEvidence.version})` : '';
    return `Detected command ${commandEvidence.command}${version}.`;
  }

  const shellEvidence = tool.evidence.find(evidence => evidence.type === 'shell');
  if (shellEvidence?.type === 'shell') {
    return `Detected shell ${shellEvidence.name}.`;
  }

  const manualNote = getToolMetadata(tool.toolId)?.install?.manualNote;
  if (manualNote) return manualNote;

  if (provenance === 'os-provided') return 'Known scanner-owned core tool or shell.';
  if (provenance === 'already-installed') return 'Installed, but not selected by current config.';
  return 'Scanner evidence is insufficient or inconclusive.';
}

function buildAction(tool: InventoryToolFact, provenance: ProvenanceLabel, selected: boolean): string {
  if (selected && tool.installed === 'installed') {
    const dependencyEvidence = hasHomebrewEvidence(tool.evidence, 'dependency');
    return dependencyEvidence
      ? 'Skip install; selected tool is already present as a dependency.'
      : 'Skip install; selected tool is already present.';
  }

  if (selected && tool.installed === 'missing') return 'Install according to the current config.';
  if (selected) return 'Proceed cautiously with configured action; inventory could not confirm current state.';
  if (provenance === 'unknown') return 'Leave present state unchanged; scanner evidence is inconclusive.';
  return 'Leave present and unmanaged.';
}

function getSelectedToolIds(config?: TildeConfig): Set<string> {
  const selected = new Set<string>();
  if (!config) return selected;

  for (const packageManager of config.packageManagers ?? []) selected.add(packageManager);
  for (const versionManager of config.versionManagers ?? []) selected.add(versionManager.name);
  for (const tool of config.tools ?? []) selected.add(tool);
  for (const browser of config.browser?.selected ?? []) selected.add(browser);
  if (config.browser?.default) selected.add(config.browser.default);
  if (config.editors?.primary) selected.add(config.editors.primary);
  for (const editor of config.editors?.additional ?? []) selected.add(editor);
  for (const aiTool of config.aiTools ?? []) selected.add(aiTool.name);

  return selected;
}

function hasHomebrewEvidence(evidence: InventoryEvidence[], requestStatus: 'direct' | 'dependency'): boolean {
  return evidence.some(item => item.type === 'homebrew-formula' && item.requestStatus === requestStatus) ||
    evidence.some(item => item.type === 'homebrew-cask' && item.requestStatus === requestStatus);
}

function hasExistingAppPathEvidence(evidence: InventoryEvidence[]): boolean {
  return evidence.some(item => item.type === 'app-path' && item.exists);
}

function isScannerOwnedOsTool(tool: InventoryToolFact): boolean {
  if (tool.installed !== 'installed') return false;
  if (!tool.toolId.startsWith('shell:') && !tool.toolId.startsWith('core-tool:')) return false;

  return tool.evidence.some(item =>
    item.type === 'shell' ||
    (item.type === 'command' && item.outcome === 'succeeded')
  );
}
