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
    `Homebrew formulae: ${report.homebrew.directFormulaeCount} direct, ${report.homebrew.dependencyFormulaeCount} dependencies, ${report.homebrew.unknownFormulaeCount} unknown`,
    `Homebrew casks: ${report.homebrew.installedCasksCount} installed, ${report.homebrew.unmatchedCasksCount} unmatched`,
    `Dotfiles: ${report.dotfiles.counts.knownFiles} known, ${report.dotfiles.counts.unknownFiles} unknown, ${report.dotfiles.counts.warnings} warnings`,
  ];

  if (report.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of report.warnings) {
      lines.push(`Warning: ${warning.message}`);
    }
  }

  return lines;
}
