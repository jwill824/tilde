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
import { BrowserStep } from '../steps/14-browser.js';
import { AIToolsStep } from '../steps/15-ai-tools.js';

const DEFAULT_CONFIGURATIONS = { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true };

// ---------------------------------------------------------------------------
// Navigation types (T007 / T008)
// ---------------------------------------------------------------------------

/**
 * Metadata for a single wizard step.
 */
export interface StepDefinition {
  id: string;
  label: string;
  required: boolean;  // false → skip action is available
}

/**
 * A snapshot pushed onto the history stack when the user advances past a step.
 * Supports back-navigation and value restoration.
 */
export interface StepFrame {
  stepIndex: number;
  values: Record<string, unknown>;  // step-specific form data at the time of leaving
}

/**
 * Full in-memory wizard navigation state.
 */
export interface WizardState {
  steps: StepDefinition[];
  history: StepFrame[];
  currentIndex: number;
}

// ---------------------------------------------------------------------------
// Step registry — all 14 canonical steps (00–13) plus new steps 14–15
// ---------------------------------------------------------------------------
const STEP_REGISTRY: StepDefinition[] = [
  { id: 'config-detection',  label: 'Config Detection',    required: true  }, // 0
  { id: 'env-capture',       label: 'Environment Capture', required: true  }, // 1
  { id: 'shell',             label: 'Shell',               required: true  }, // 2
  { id: 'package-manager',   label: 'Package Manager',     required: true  }, // 3
  { id: 'version-manager',   label: 'Version Manager',     required: true  }, // 4
  { id: 'languages',         label: 'Languages',           required: true  }, // 5
  { id: 'workspace',         label: 'Workspace Directory', required: true  }, // 6
  { id: 'contexts',          label: 'Workspace Contexts',  required: true  }, // 7
  { id: 'git-auth',          label: 'Git Authentication',  required: true  }, // 8
  { id: 'tools',             label: 'Tools & Applications',required: true  }, // 9
  { id: 'app-config',        label: 'Editor Configuration',required: false }, // 10  ← optional
  { id: 'accounts',          label: 'Accounts',            required: false }, // 11  ← optional
  { id: 'secrets-backend',   label: 'Secrets Backend',     required: true  }, // 12
  { id: 'config-export',     label: 'Config Export',       required: true  }, // 13
  { id: 'browser',           label: 'Browser Selection',   required: false }, // 14  ← new optional
  { id: 'ai-tools',          label: 'AI Coding Tools',     required: false }, // 15  ← new optional
];

const LAST_STEP = STEP_REGISTRY.length - 1; // index of final step

// ---------------------------------------------------------------------------
// Component types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Wizard component
// ---------------------------------------------------------------------------

export function Wizard({ initialStep = 0, initialConfig = {}, onComplete, onExit }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [config, setConfig] = useState<Partial<TildeConfig>>(initialConfig);
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [captureReport, setCaptureReport] = useState<EnvironmentCaptureReport | null>(null);

  // Navigation history stack (T007)
  const [history, setHistory] = useState<StepFrame[]>([]);

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

  /**
   * Advance to the next step. Pushes current step onto history stack.
   * (T007: goNext)
   */
  const advance = useCallback(
    async (stepData: Partial<TildeConfig>, summary: string) => {
      const merged = { ...config, ...stepData };
      setConfig(merged);
      setCompletedSteps(prev => [...prev, { id: currentStep, summary }]);

      // Push current step onto history
      setHistory(prev => [...prev, { stepIndex: currentStep, values: stepData as Record<string, unknown> }]);

      try {
        await saveCheckpoint(currentStep, merged as Partial<TildeConfig>);
      } catch {
        // Non-fatal: continue even if checkpoint fails
      }

      const nextStep = currentStep + 1;
      if (nextStep > LAST_STEP) {
        onComplete?.(merged as TildeConfig);
      } else {
        setCurrentStep(nextStep);
      }
    },
    [currentStep, config, onComplete]
  );

  /**
   * Skip the current (optional) step. Same as advance with empty values.
   * (T007: skip)
   */
  const skip = useCallback(async () => {
    await advance({}, `${STEP_REGISTRY[currentStep]?.label ?? 'Step'}: skipped`);
  }, [advance, currentStep]);

  /**
   * Go back to the previous step by popping from the history stack.
   * (T007: goBack)
   */
  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    const prevFrame = history[history.length - 1];
    setHistory(newHistory);
    setCurrentStep(prevFrame.stepIndex);
    // Also remove the last completed step entry
    setCompletedSteps(prev => prev.slice(0, -1));
  }, [history]);

  // Whether back navigation is available for the current step
  const canGoBack = history.length > 0;
  // Whether current step is optional
  const isCurrentOptional = !(STEP_REGISTRY[currentStep]?.required ?? true);
  // onBack handler — only passed when back-nav is available
  const onBack = canGoBack ? goBack : undefined;

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
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              {},
              `Config detection: ${data.mode === 'config-first' ? `using ${data.configPath}` : 'starting fresh wizard'}`
            )}
          />
        )}
        {currentStep === 1 && (
          <EnvCaptureStep
            onBack={onBack}
            isOptional={false}
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
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { shell: data.shell },
              `Shell: ${data.shell}`
            )}
          />
        )}
        {currentStep === 3 && (
          <PackageManagerStep
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { packageManager: data.packageManager },
              `Package manager: ${data.packageManager}`
            )}
          />
        )}
        {currentStep === 4 && (
          <VersionManagerStep
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { versionManagers: data.versionManagers },
              `Version managers: ${data.versionManagers.length === 0 ? 'none' : data.versionManagers.map(v => v.name).join(', ')}`
            )}
          />
        )}
        {currentStep === 5 && (
          <LanguagesStep
            versionManagers={config.versionManagers ?? []}
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { languages: data.languages },
              `Languages: ${data.languages.length === 0 ? 'none' : data.languages.map(l => `${l.name}@${l.version}`).join(', ')}`
            )}
          />
        )}
        {currentStep === 6 && (
          <WorkspaceStep
            onBack={onBack}
            isOptional={false}
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
            initialContexts={canGoBack ? (config.contexts ?? []) : []}
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { contexts: data.contexts },
              `Contexts: ${data.contexts.map(c => c.label).join(', ')}`
            )}
          />
        )}
        {currentStep === 8 && (
          <GitAuthStep
            contexts={config.contexts ?? []}
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { contexts: data.contexts },
              `Git auth: ${data.contexts.map(c => `${c.label}→${c.authMethod}`).join(', ')}`
            )}
          />
        )}
        {currentStep === 9 && (
          <ToolsStep
            defaultTools={captureReport ? captureReport.brewPackages.join(', ') : undefined}
            onBack={onBack}
            isOptional={false}
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
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            onComplete={(data) => advance(
              { configurations: { ...(config.configurations ?? DEFAULT_CONFIGURATIONS), ...data.configurations },
                editors: data.editors },
              `Config domains: ${Object.entries(data.configurations).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`
            )}
          />
        )}
        {currentStep === 11 && (
          <AccountsStep
            contexts={config.contexts ?? []}
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            onComplete={(data) => advance(
              { contexts: data.contexts },
              `Accounts configured`
            )}
          />
        )}
        {currentStep === 12 && (
          <SecretsBackendStep
            onBack={onBack}
            isOptional={false}
            onComplete={(data) => advance(
              { secretsBackend: data.secretsBackend },
              `Secrets backend: ${data.secretsBackend}`
            )}
          />
        )}
        {currentStep === 13 && (
          <ConfigExportStep
            config={config as TildeConfig}
            onBack={onBack}
            isOptional={false}
            onComplete={() => {
              clearCheckpoint().catch(() => {});
              onComplete?.(config as TildeConfig);
            }}
          />
        )}
        {currentStep === 14 && (
          <BrowserStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            onComplete={(data) => advance(
              { browser: data.browser },
              `Browsers: ${data.browser.selected.length === 0 ? 'none' : data.browser.selected.join(', ')}`
            )}
          />
        )}
        {currentStep === 15 && (
          <AIToolsStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            onComplete={(data) => advance(
              { aiTools: data.aiTools },
              `AI tools: ${data.aiTools.length === 0 ? 'none' : data.aiTools.map(t => t.label).join(', ')}`
            )}
          />
        )}
      </Box>
        </>
      )}
    </Box>
  );
}
