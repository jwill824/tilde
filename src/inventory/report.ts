import type { DetectedLanguage, DetectedVersionManager } from '../utils/env-detection.js';
import type { ToolCategory } from '../tools/metadata.js';

export type InventoryInstallState = 'installed' | 'missing' | 'unknown';

export type InventoryToolCategory = ToolCategory | 'shell' | 'core-tool';

export type InventoryWarningSeverity = 'info' | 'warning' | 'error';

export type InventoryWarningSource = 'homebrew' | 'environment' | 'app-path' | 'scanner';

export type InventoryEvidence =
  | { type: 'homebrew-formula'; id: string }
  | { type: 'homebrew-cask'; id: string }
  | { type: 'app-path'; path: string; exists: boolean }
  | { type: 'command'; command: string; outcome: 'succeeded' | 'failed' | 'unknown'; version?: string }
  | { type: 'shell'; name: string; source: 'process-env' | 'scanner' }
  | { type: 'inconclusive'; source: InventoryWarningSource; reason: string; warningId?: string };

export interface InventoryToolFact {
  toolId: string;
  label: string;
  category: InventoryToolCategory;
  installed: InventoryInstallState;
  evidence: InventoryEvidence[];
  warningIds: string[];
}

export interface InventoryWarning {
  id: string;
  source: InventoryWarningSource;
  severity: InventoryWarningSeverity;
  message: string;
  toolId?: string;
}

export interface InventoryHomebrewAudit {
  formulae: string[];
  casks: string[];
}

export interface InventoryHomebrewSummary {
  installedFormulaeCount: number;
  installedCasksCount: number;
  matchedFormulaeCount: number;
  matchedCasksCount: number;
  unmatchedFormulaeCount: number;
  unmatchedCasksCount: number;
}

export interface InventoryEnvironmentSnapshot {
  homeDir: string;
  shell?: string;
  detectedLanguages: DetectedLanguage[];
  detectedVersionManagers: DetectedVersionManager[];
}

export interface InventoryReport {
  tools: InventoryToolFact[];
  unmatchedHomebrew: InventoryHomebrewAudit;
  homebrew: InventoryHomebrewSummary;
  warnings: InventoryWarning[];
  environment: InventoryEnvironmentSnapshot;
}

export function createEmptyInventoryReport(homeDir = process.env.HOME ?? '~'): InventoryReport {
  return {
    tools: [],
    unmatchedHomebrew: {
      formulae: [],
      casks: [],
    },
    homebrew: {
      installedFormulaeCount: 0,
      installedCasksCount: 0,
      matchedFormulaeCount: 0,
      matchedCasksCount: 0,
      unmatchedFormulaeCount: 0,
      unmatchedCasksCount: 0,
    },
    warnings: [],
    environment: {
      homeDir,
      shell: process.env.SHELL,
      detectedLanguages: [],
      detectedVersionManagers: [],
    },
  };
}
