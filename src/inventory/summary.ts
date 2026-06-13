import type { InventoryReport, InventoryToolFact } from './report.js';

export function getInstalledKnownToolFacts(report: InventoryReport): InventoryToolFact[] {
  return report.tools.filter(tool => tool.installed === 'installed' && tool.category !== 'shell' && tool.category !== 'core-tool');
}

export function summarizeInventory(report: InventoryReport): string[] {
  const installedKnownTools = getInstalledKnownToolFacts(report);
  const installedKnownToolSummary = installedKnownTools.length > 0
    ? installedKnownTools.map(tool => tool.label).join(', ')
    : 'none';
  const lines = [
    `Known installed tools: ${installedKnownToolSummary}`,
    `Homebrew formulae: ${report.homebrew.installedFormulaeCount} installed, ${report.homebrew.unmatchedFormulaeCount} unmatched`,
    `Homebrew casks: ${report.homebrew.installedCasksCount} installed, ${report.homebrew.unmatchedCasksCount} unmatched`,
  ];

  for (const warning of report.warnings) {
    lines.push(`Warning: ${warning.message}`);
  }

  return lines;
}
