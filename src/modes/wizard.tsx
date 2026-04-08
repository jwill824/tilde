import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { TildeConfig } from '../config/schema.js';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '../state/checkpoint.js';
import { ConfigDetectionStep } from '../steps/config-detection.js';
import { EnvCaptureStep } from '../steps/env-capture.js';
import type { EnvironmentCaptureReport } from '../capture/scanner.js';
import { parseGitconfig } from '../capture/parser.js';
import { ShellStep } from '../steps/shell.js';
import { PackageManagerStep } from '../steps/package-manager.js';
import { VersionManagerStep } from '../steps/version-manager.js';
import { ContextsStep } from '../steps/contexts.js';
import { ToolsStep } from '../steps/tools.js';
import { AppConfigStep } from '../steps/app-config.js';
import { SecretsBackendStep } from '../steps/secrets-backend.js';
import { ConfigExportStep } from '../steps/config-export.js';
import { BrowserStep } from '../steps/browser.js';
import { AIToolsStep } from '../steps/ai-tools.js';
import { ApplyStep } from '../steps/apply.js';

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
      // Contexts → always proceed to tools (step 6); no skip logic needed here
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
  { id: 'browser',           label: 'Browser Selection',   required: false }, // 9
  { id: 'ai-tools',          label: 'AI Coding Tools',     required: false }, // 10
  { id: 'config-export',     label: 'Config Export',       required: true  }, // 11 (was 9)
  { id: 'apply',             label: 'Apply & Finish',      required: true  }, // 12 (new)
];

const LAST_STEP = STEP_REGISTRY.length - 1; // index of final step

// ---------------------------------------------------------------------------
// Component types
// ---------------------------------------------------------------------------

interface CompletedStep {
  id: number;
  summary: string[];
}

/** Derive sidebar summary lines from accumulated config for a given step index. */
function makeSummaryLines(stepIdx: number, cfg: Partial<TildeConfig>): string[] {
  switch (stepIdx) {
    case 0: return [];
    case 1: return [];
    case 2: return cfg.shell ? [cfg.shell] : [];
    case 3: return cfg.packageManagers?.length ? [cfg.packageManagers.join(', ')] : [];
    case 4: return cfg.versionManagers?.length
      ? [cfg.versionManagers.map(v => v.name).join(', ')]
      : ['none'];
    case 5: {
      const lines: string[] = [];
      if (cfg.workspaceRoot) lines.push(cfg.workspaceRoot);
      (cfg.contexts ?? []).forEach(c => lines.push(`• ${c.label}`));
      return lines;
    }
    case 6: {
      const tools = cfg.tools ?? [];
      if (!tools.length) return [];
      const preview = tools.slice(0, 4).join(', ');
      return [tools.length > 4 ? `${preview}…` : preview];
    }
    case 7: {
      const cfgs = cfg.configurations ?? {};
      const active = Object.entries(cfgs).filter(([, v]) => v).map(([k]) => k);
      return active.length ? [active.join(', ')] : [];
    }
    case 8: return cfg.secretsBackend ? [cfg.secretsBackend] : [];
    case 9: return cfg.browser?.selected?.length ? [cfg.browser.selected.join(', ')] : [];
    case 10: return (cfg as Record<string, unknown>).aiTools
      ? [((cfg as Record<string, unknown>).aiTools as Array<{label: string}>).map(t => t.label).join(', ')]
      : [];
    case 11: return [];  // config export
    case 12: return [];  // apply
    default: return [];
  }
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
  // Last popped frame when navigating back — used to restore initialValues
  const [poppedFrame, setPoppedFrame] = useState<StepFrame | null>(null);

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
    async (stepData: Partial<TildeConfig>, summary: string[]) => {
      const merged = { ...config, ...stepData };
      setConfig(merged);
      setCompletedSteps(prev => [...prev, { id: currentStep, summary }]);
      setPoppedFrame(null); // clear any back-nav restore frame on forward advance

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
    await advance({}, ['skipped']);
  }, [advance, currentStep]);

  /**
   * Go back to the previous step by popping from the history stack.
   * (T007: goBack)
   */
  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    const popped = history[history.length - 1];
    setHistory(newHistory);
    setCurrentStep(popped.stepIndex);
    setPoppedFrame(popped); // preserve values so the returned-to step can restore them
    // Also remove the last completed step entry
    setCompletedSteps(prev => prev.slice(0, -1));
  }, [history]);

  // Whether back navigation is available for the current step
  const canGoBack = history.length > 0;
  // Whether current step is optional
  const isCurrentOptional = !(STEP_REGISTRY[currentStep]?.required ?? true);
  // onBack handler — only passed when back-nav is available
  const onBack = canGoBack ? goBack : undefined;
  // Restore values when navigating back: prefer the just-popped frame (goBack),
  // fall back to an earlier frame for the same step (resume/multi-back scenarios)
  const prevFrame = poppedFrame?.stepIndex === currentStep
    ? poppedFrame
    : history.find(f => f.stepIndex === currentStep);
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
                  // Reconstruct synthetic completed steps so sidebar shows ✓ for prior steps
                  setCompletedSteps(
                    STEP_REGISTRY.slice(0, resumeStep + 1).map((_, idx) => ({
                      id: idx,
                      summary: makeSummaryLines(idx, resumeConfig),
                    }))
                  );
                  // Populate history so back-nav works from the resumed step
                  setHistory(
                    STEP_REGISTRY.slice(0, resumeStep + 1).map((_, idx) => ({
                      stepIndex: idx,
                      values: {},  // per-step values not stored in checkpoint; steps fall back to config
                    }))
                  );
                } else {
                  setCurrentStep(0);
                }
                setResumeStatus('ready');
              }}
            />
          </Box>
        </Box>
      )}

      {resumeStatus === 'ready' && (() => {
        const completedStepSet = new Set(completedSteps.map(s => s.id));
        return (
          <Box flexDirection="row" alignItems="flex-start">

            {/* ── Left: step progress sidebar ── */}
            <Box flexDirection="column" marginRight={3}>
              {STEP_REGISTRY.map((step, idx) => {
                const done = completedStepSet.has(idx);
                const active = idx === currentStep;
                const summary = completedSteps.find(s => s.id === idx)?.summary ?? [];
                return (
                  <Box key={idx} flexDirection="column">
                    <Box>
                      <Text color={done ? 'green' : active ? 'cyan' : undefined} dimColor={!done && !active}>
                        {done ? '✓' : active ? '▶' : ' '}{' '}
                      </Text>
                      <Text
                        bold={active}
                        color={done ? 'green' : active ? 'cyan' : undefined}
                        dimColor={!done && !active}
                      >
                        {step.label}
                      </Text>
                      {!step.required && !done && <Text dimColor> (opt)</Text>}
                    </Box>
                    {done && summary.map((line, i) => (
                      <Box key={i} marginLeft={2}>
                        <Text dimColor>{line}</Text>
                      </Box>
                    ))}
                  </Box>
                );
              })}
              <Box marginTop={1}>
                <Text dimColor>▶ current  ✓ done  (opt) optional</Text>
              </Box>
            </Box>

            {/* ── Right: active step content ── */}
            <Box flexDirection="column" flexGrow={1}>
        {currentStep === 0 && (
          <ConfigDetectionStep
            onBack={onBack}
            onExit={onExit}
            isOptional={false}
            onComplete={(_data) => advance(
              {},
              []
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
                [
                  `${data.captureReport.dotfiles.length} dotfiles, ${data.captureReport.brewPackages.length} brew pkgs`,
                  ...(data.captureReport.detectedLanguages.length > 0
                    ? [`${data.captureReport.detectedLanguages.length} languages`]
                    : []),
                ]
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
              [data.shell]
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
              [data.packageManagers.join(', ')]
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
              [data.versionManagers.length === 0 ? 'none' : data.versionManagers.map(v => v.name).join(', ')]
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
              [
                data.workspaceRoot,
                ...data.contexts.map(c => `• ${c.label}`),
              ]
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
              data.tools.length === 0 ? [] : [
                data.tools.slice(0, 4).join(', ') + (data.tools.length > 4 ? '…' : ''),
              ]
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
              [Object.entries(data.configurations).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none']
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
              [data.secretsBackend]
            )}
          />
        )}
        {currentStep === 9 && (
          <BrowserStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { browser: data.browser },
              [data.browser.selected.length === 0 ? 'none' : data.browser.selected.join(', ')]
            )}
          />
        )}
        {currentStep === 10 && (
          <AIToolsStep
            onBack={onBack}
            isOptional={isCurrentOptional}
            onSkip={isCurrentOptional ? skip : undefined}
            initialValues={initialValues}
            onComplete={(data) => advance(
              { aiTools: data.aiTools },
              [data.aiTools.length === 0 ? 'none' : data.aiTools.map(t => t.label).join(', ')]
            )}
          />
        )}
        {currentStep === 11 && (
          <ConfigExportStep
            config={config as TildeConfig}
            onBack={onBack}
            isOptional={false}
            onComplete={() => {
              clearCheckpoint().catch(() => {});
              void advance({}, ['saved']);
            }}
          />
        )}
        {currentStep === 12 && (
          <ApplyStep
            config={config as TildeConfig}
            onBack={onBack}
            onComplete={() => void advance({}, [])}
          />
        )}
            </Box>
          </Box>
        );
      })()}
    </Box>
  );
}
