import React, { useState, useCallback } from 'react';
import { Box, Text, Static } from 'ink';
import type { TildeConfig } from '../config/schema.js';
import { saveCheckpoint } from '../state/checkpoint.js';
import { ConfigDetectionStep } from '../steps/00-config-detection.js';
import { ShellStep } from '../steps/02-shell.js';
import { PackageManagerStep } from '../steps/03-package-manager.js';
import { VersionManagerStep } from '../steps/04-version-manager.js';
import { LanguagesStep } from '../steps/05-languages.js';
import { WorkspaceStep } from '../steps/06-workspace.js';
import { ContextsStep } from '../steps/07-contexts.js';
import { GitAuthStep } from '../steps/08-git-auth.js';
import { ToolsStep } from '../steps/09-tools.js';
import { AppConfigStep } from '../steps/10-app-config.js';
import { AccountsStep } from '../steps/11-accounts.js';
import { SecretsBackendStep } from '../steps/12-secrets-backend.js';
import { ConfigExportStep } from '../steps/13-config-export.js';

const DEFAULT_CONFIGURATIONS = { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true };

interface CompletedStep {
  id: number;
  summary: string;
}

interface WizardProps {
  initialStep?: number;
  initialConfig?: Partial<TildeConfig>;
  onComplete?: (config: TildeConfig) => void;
}

export function Wizard({ initialStep = 0, initialConfig = {}, onComplete }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [config, setConfig] = useState<Partial<TildeConfig>>(initialConfig);
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);

  const advance = useCallback(
    async (stepData: Partial<TildeConfig>, summary: string) => {
      const merged = { ...config, ...stepData };
      setConfig(merged);
      setCompletedSteps(prev => [...prev, { id: currentStep, summary }]);

      try {
        await saveCheckpoint(currentStep, merged as Partial<TildeConfig>);
      } catch {
        // Non-fatal: continue even if checkpoint fails
      }

      const nextStep = currentStep + 1;
      if (nextStep > 13) {
        onComplete?.(merged as TildeConfig);
      } else {
        setCurrentStep(nextStep);
      }
    },
    [currentStep, config, onComplete]
  );

  return (
    <Box flexDirection="column">
      <Static items={completedSteps}>
        {(step) => (
          <Box key={step.id}>
            <Text color="green">✓ </Text>
            <Text dimColor>{step.summary}</Text>
          </Box>
        )}
      </Static>

      <Box marginTop={completedSteps.length > 0 ? 1 : 0}>
        {currentStep === 0 && (
          <ConfigDetectionStep
            onComplete={(data) => advance(
              {},
              `Config detection: ${data.mode === 'config-first' ? `using ${data.configPath}` : 'starting fresh wizard'}`
            )}
          />
        )}
        {currentStep === 1 && (
          <Box>
            <Text dimColor>Skipping environment capture (Phase 2 feature)...</Text>
          </Box>
        )}
        {currentStep === 2 && (
          <ShellStep
            onComplete={(data) => advance(
              { shell: data.shell },
              `Shell: ${data.shell}`
            )}
          />
        )}
        {currentStep === 3 && (
          <PackageManagerStep
            onComplete={(data) => advance(
              { packageManager: data.packageManager },
              `Package manager: ${data.packageManager}`
            )}
          />
        )}
        {currentStep === 4 && (
          <VersionManagerStep
            onComplete={(data) => advance(
              { versionManagers: data.versionManagers },
              `Version managers: ${data.versionManagers.length === 0 ? 'none' : data.versionManagers.map(v => v.name).join(', ')}`
            )}
          />
        )}
        {currentStep === 5 && (
          <LanguagesStep
            versionManagers={config.versionManagers ?? []}
            onComplete={(data) => advance(
              { languages: data.languages },
              `Languages: ${data.languages.length === 0 ? 'none' : data.languages.map(l => `${l.name}@${l.version}`).join(', ')}`
            )}
          />
        )}
        {currentStep === 6 && (
          <WorkspaceStep
            onComplete={(data) => advance(
              { workspaceRoot: data.workspaceRoot, dotfilesRepo: data.dotfilesRepo },
              `Workspace: ${data.workspaceRoot}, dotfiles: ${data.dotfilesRepo}`
            )}
          />
        )}
        {currentStep === 7 && (
          <ContextsStep
            workspaceRoot={config.workspaceRoot ?? '~/Developer'}
            onComplete={(data) => advance(
              { contexts: data.contexts },
              `Contexts: ${data.contexts.map(c => c.label).join(', ')}`
            )}
          />
        )}
        {currentStep === 8 && (
          <GitAuthStep
            contexts={config.contexts ?? []}
            onComplete={(data) => advance(
              { contexts: data.contexts },
              `Git auth: ${data.contexts.map(c => `${c.label}→${c.authMethod}`).join(', ')}`
            )}
          />
        )}
        {currentStep === 9 && (
          <ToolsStep
            onComplete={(data) => advance(
              {
                tools: data.tools,
                configurations: { ...(config.configurations ?? DEFAULT_CONFIGURATIONS), direnv: data.configurations.direnv },
              },
              `Tools: ${data.tools.length === 0 ? 'none' : data.tools.slice(0, 3).join(', ')}${data.tools.length > 3 ? '…' : ''}`
            )}
          />
        )}
        {currentStep === 10 && (
          <AppConfigStep
            onComplete={(data) => advance(
              { configurations: { ...(config.configurations ?? DEFAULT_CONFIGURATIONS), ...data.configurations } },
              `Config domains: ${Object.entries(data.configurations).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`
            )}
          />
        )}
        {currentStep === 11 && (
          <AccountsStep
            contexts={config.contexts ?? []}
            onComplete={(data) => advance(
              { contexts: data.contexts },
              `Accounts configured`
            )}
          />
        )}
        {currentStep === 12 && (
          <SecretsBackendStep
            onComplete={(data) => advance(
              { secretsBackend: data.secretsBackend },
              `Secrets backend: ${data.secretsBackend}`
            )}
          />
        )}
        {currentStep === 13 && (
          <ConfigExportStep
            config={config as TildeConfig}
            onComplete={() => {
              onComplete?.(config as TildeConfig);
            }}
          />
        )}
      </Box>
    </Box>
  );
}
