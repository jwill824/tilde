import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, Static, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { TildeConfig } from '../config/schema.js';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '../state/checkpoint.js';
import { ConfigDetectionStep } from '../steps/00-config-detection.js';
import { EnvCaptureStep } from '../steps/01-env-capture.js';
import type { EnvironmentCaptureReport } from '../capture/scanner.js';
import { parseGitconfig } from '../capture/parser.js';
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
  onExit?: () => void;
}

export function Wizard({ initialStep = 0, initialConfig = {}, onComplete, onExit }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [config, setConfig] = useState<Partial<TildeConfig>>(initialConfig);
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [captureReport, setCaptureReport] = useState<EnvironmentCaptureReport | null>(null);

  // Checkpoint/resume state
  const [resumeStatus, setResumeStatus] = useState<'loading' | 'prompt' | 'ready'>('loading');
  const [resumeStep, setResumeStep] = useState(-1);
  const [resumeConfig, setResumeConfig] = useState<Partial<TildeConfig>>({});

  useEffect(() => {
    loadCheckpoint().then((checkpoint) => {
      if (checkpoint && checkpoint.lastCompletedStep > -1) {
        setResumeStep(checkpoint.lastCompletedStep);
        setResumeConfig(checkpoint.partialConfig as Partial<TildeConfig>);
        setResumeStatus('prompt');
      } else {
        setResumeStatus('ready');
      }
    }).catch(() => {
      setResumeStatus('ready');
    });
  }, []);

  // Allow Escape to trigger graceful exit when caller provides onExit
  useInput((_input, key) => {
    if (key.escape && onExit) {
      onExit();
    }
  }, { isActive: !!onExit });

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
      {resumeStatus === 'loading' && (
        <Text dimColor>Loading...</Text>
      )}

      {resumeStatus === 'prompt' && (
        <Box flexDirection="column">
          <Text color="yellow">A previous session was found (last completed step: {resumeStep}).</Text>
          <Text dimColor>Use ↑↓ to navigate, Enter to select</Text>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: `Resume from step ${resumeStep + 1}`, value: 'resume' },
                { label: 'Start over', value: 'start-over' },
              ]}
              onSelect={(item) => {
                if (item.value === 'resume') {
                  setConfig(resumeConfig);
                  setCurrentStep(resumeStep + 1);
                } else {
                  setCurrentStep(0);
                }
                setResumeStatus('ready');
              }}
            />
          </Box>
        </Box>
      )}

      {resumeStatus === 'ready' && (
        <>
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
          <EnvCaptureStep
            onComplete={(data) => {
              setCaptureReport(data.captureReport);
              const rcFiles = data.captureReport.rcFiles;
              const detectedShell =
                rcFiles['.zshrc'] !== undefined ? 'zsh' :
                rcFiles['.bash_profile'] !== undefined ? 'bash' : undefined;
              advance(
                detectedShell ? { shell: detectedShell } : {},
                `Environment scan: ${data.captureReport.dotfiles.length} dotfiles, ${data.captureReport.brewPackages.length} brew packages`
              );
            }}
          />
        )}
        {currentStep === 2 && (
          <ShellStep
            defaultShell={config.shell ?? 'zsh'}
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
            defaultGitName={captureReport ? parseGitconfig(captureReport.rcFiles['.gitconfig'] ?? '').name : undefined}
            defaultGitEmail={captureReport ? parseGitconfig(captureReport.rcFiles['.gitconfig'] ?? '').email : undefined}
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
            defaultTools={captureReport ? captureReport.brewPackages.join(', ') : undefined}
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
              clearCheckpoint().catch(() => {});
              onComplete?.(config as TildeConfig);
            }}
          />
        )}
      </Box>
        </>
      )}
    </Box>
  );
}
