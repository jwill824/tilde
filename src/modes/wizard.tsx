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
import { ContextsStep } from '../steps/07-contexts.js';
import { ToolsStep } from '../steps/09-tools.js';
import { AppConfigStep } from '../steps/10-app-config.js';
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
// Logic tree: determines next step given current step and accumulated config
// ---------------------------------------------------------------------------

export function getNextStep(step: number, config: Partial<TildeConfig>): number {
  switch (step) {
    case 5: {
      // Contexts → skip to tools if no context has a GitHub account (no secrets needed)
      const hasAccount = (config.contexts ?? []).some(c => c.github?.username);
      if (!hasAccount) return 6; // → tools (skip nothing, same sequence here)
      return 6;
    }
    case 6: {
      // Tools → skip app-config if no editor tool is in the tools list
      const EDITOR_TOOLS = ['cursor', 'vscode', 'neovim', 'vim', 'webstorm', 'zed'];
      const hasEditor = (config.tools ?? []).some(t => EDITOR_TOOLS.includes(t.toLowerCase()));
      if (!hasEditor) return 8; // skip app-config (step 7), go to secrets-backend (step 8)
      return 7;
    }
    default:
      return step + 1;
  }
}

// ---------------------------------------------------------------------------
// Step registry — 12 canonical steps (languages absorbed into contexts)
// ---------------------------------------------------------------------------
const STEP_REGISTRY: StepDefinition[] = [
  { id: 'config-detection',  label: 'Config Detection',    required: true  }, // 0
  { id: 'env-capture',       label: 'Environment Capture', required: true  }, // 1
  { id: 'shell',             label: 'Shell',               required: true  }, // 2
  { id: 'package-manager',   label: 'Package Manager',     required: true  }, // 3
  { id: 'version-manager',   label: 'Version Manager',     required: true  }, // 4
  { id: 'contexts',          label: 'Workspace & Contexts',required: true  }, // 5 (absorbs workspace/lang/git-auth/accounts)
  { id: 'tools',             label: 'Tools & Applications',required: true  }, // 6
  { id: 'app-config',        label: 'Editor Configuration',required: false }, // 7
  { id: 'secrets-backend',   label: 'Secrets Backend',     required: true  }, // 8
  { id: 'config-export',     label: 'Config Export',       required: true  }, // 9
  { id: 'browser',           label: 'Browser Selection',   required: false }, // 10
  { id: 'ai-tools',          label: 'AI Coding Tools',     required: false }, // 11
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

      const nextStep = getNextStep(currentStep, merged as Partial<TildeConfig>);
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
  // Restore values from history when navigating back to a step
  const prevFrame = history.find(f => f.stepIndex === currentStep);
  const initialValues: Record<string, unknown> = prevFrame?.values ?? {};

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
            onExit={onExit}
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
                `Environment scan: ${data.captureReport.dotfiles.length} dotfiles, ${data.captureReport.brewPackages.length} brew packages` +
                (data.captureReport.detectedLanguages.length > 0 ? `, ${data.captureReport.detectedLanguages.length} languages detected` : '')
              );
            }}
          />
        )}
        {currentStep === 2 && (
          <ShellStep
            defaultShell={((initialValues.shell ?? config.shell) as 'zsh' | 'bash' | 'fish' | undefined) ?? 'zsh'}
            onBack={onBack}
            isOptional={false}
            initialValues={initialValues}
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
            initialValues={initialValues}
            onComplete={(data) => advance(
              { packageManagers: data.packageManagers } as Partial<TildeConfig>,
              `Package managers: ${data.packageManagers.join(', ')}`
            )}
          />
        )}
        {currentStep === 4 && (
          <VersionManagerStep
            onBack={onBack}
            isOptional={false}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { versionManagers: data.versionManagers },
              `Version managers: ${data.versionManagers.length === 0 ? 'none' : data.versionManagers.map(v => v.name).join(', ')}`
            )}
          />
        )}
        {currentStep === 5 && (
          <ContextsStep
            defaultGitName={captureReport ? parseGitconfig(captureReport.rcFiles['.gitconfig'] ?? '').name : undefined}
            defaultGitEmail={captureReport ? parseGitconfig(captureReport.rcFiles['.gitconfig'] ?? '').email : undefined}
            initialContexts={canGoBack ? (config.contexts ?? []) : []}
            detectedLanguages={captureReport?.detectedLanguages}
            onBack={onBack}
            isOptional={false}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { workspaceRoot: data.workspaceRoot, dotfilesRepo: data.dotfilesRepo, contexts: data.contexts },
              `Workspace: ${data.workspaceRoot} | Contexts: ${data.contexts.map(c => c.label).join(', ')}`
            )}
          />
        )}
        {currentStep === 6 && (
          <ToolsStep
            defaultTools={captureReport ? captureReport.brewPackages.join(', ') : undefined}
            onBack={onBack}
            isOptional={false}
            initialValues={initialValues}
            onComplete={(data) => advance(
              {
                tools: data.tools,
                configurations: { ...(config.configurations ?? DEFAULT_CONFIGURATIONS), direnv: data.configurations.direnv },
              },
              `Tools: ${data.tools.length === 0 ? 'none' : data.tools.slice(0, 3).join(', ')}${data.tools.length > 3 ? '…' : ''}`
            )}
          />
        )}
        {currentStep === 7 && (
          <AppConfigStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { configurations: { ...(config.configurations ?? DEFAULT_CONFIGURATIONS), ...data.configurations },
                editors: data.editors },
              `Config domains: ${Object.entries(data.configurations).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`
            )}
          />
        )}
        {currentStep === 8 && (
          <SecretsBackendStep
            onBack={onBack}
            isOptional={false}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { secretsBackend: data.secretsBackend },
              `Secrets backend: ${data.secretsBackend}`
            )}
          />
        )}
        {currentStep === 9 && (
          <ConfigExportStep
            config={config as TildeConfig}
            onBack={onBack}
            isOptional={false}
            onComplete={() => {
              clearCheckpoint().catch(() => {});
              // Advance to step 11 (Browser) rather than terminating the wizard
              void advance({}, 'Configuration exported');
            }}
          />
        )}
        {currentStep === 10 && (
          <BrowserStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { browser: data.browser },
              `Browsers: ${data.browser.selected.length === 0 ? 'none' : data.browser.selected.join(', ')}`
            )}
          />
        )}
        {currentStep === 11 && (
          <AIToolsStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            initialValues={initialValues}
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
