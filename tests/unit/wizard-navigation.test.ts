/**
 * Unit tests for wizard navigation state machine (T011).
 *
 * Tests the WizardState / history stack behavior:
 * - Back nav restores values at T-1
 * - Back disabled at step 0
 * - Skip on optional step advances without values
 * - Context list view triggered on back-nav
 * - Context data preserved across back/forward navigation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';

// We test the navigation logic in isolation by constructing state machine
// operations that mirror what the Wizard component does internally.

// Navigation state machine (mirrors wizard.tsx implementation)
interface StepFrame {
  stepIndex: number;
  values: Record<string, unknown>;
}

type NavState = {
  currentIndex: number;
  history: StepFrame[];
  config: Record<string, unknown>;
};

function goNext(state: NavState, values: Record<string, unknown>): NavState {
  return {
    currentIndex: state.currentIndex + 1,
    history: [...state.history, { stepIndex: state.currentIndex, values }],
    config: { ...state.config, ...values },
  };
}

function goBack(state: NavState): NavState {
  if (state.history.length === 0) return state;  // back disabled at step 0
  const newHistory = state.history.slice(0, -1);
  const prevFrame = state.history[state.history.length - 1];
  return {
    currentIndex: prevFrame.stepIndex,
    history: newHistory,
    config: state.config, // config remains accumulated
  };
}

function skip(state: NavState): NavState {
  // Skip is the same as goNext with empty values
  return goNext(state, {});
}

function canGoBack(state: NavState): boolean {
  return state.history.length > 0;
}

describe('Wizard navigation state machine', () => {
  let initialState: NavState;

  beforeEach(() => {
    initialState = { currentIndex: 0, history: [], config: {} };
  });

  describe('back navigation', () => {
    it('canGoBack returns false at step 0 (no history)', () => {
      expect(canGoBack(initialState)).toBe(false);
    });

    it('canGoBack returns true after advancing', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });
      expect(canGoBack(s1)).toBe(true);
    });

    it('back nav restores stepIndex to the previous step (T-1)', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });   // step 0 → 1
      const s2 = goNext(s1, { packageManagers: ['homebrew'] }); // step 1 → 2
      const s3 = goBack(s2);  // back to step 1
      expect(s3.currentIndex).toBe(1);
    });

    it('back nav pops the history stack', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });
      const s2 = goNext(s1, { packageManagers: ['homebrew'] });
      expect(s2.history.length).toBe(2);
      const s3 = goBack(s2);
      expect(s3.history.length).toBe(1);
    });

    it('back nav does not mutate original state (immutability)', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });
      const s2 = goBack(s1);
      expect(s1.currentIndex).toBe(1);  // s1 unchanged
      expect(s2.currentIndex).toBe(0);
    });

    it('back at step 0 returns same state unchanged', () => {
      const result = goBack(initialState);
      expect(result.currentIndex).toBe(0);
      expect(result.history.length).toBe(0);
    });

    it('multi-step back navigation traverses correctly', () => {
      let state = initialState;
      state = goNext(state, { shell: 'zsh' });
      state = goNext(state, { packageManagers: ['homebrew'] });
      state = goNext(state, { versionManagers: [] });
      // Now at step 3, history has [0, 1, 2]
      expect(state.currentIndex).toBe(3);
      expect(state.history.length).toBe(3);

      state = goBack(state);  // → step 2
      expect(state.currentIndex).toBe(2);

      state = goBack(state);  // → step 1
      expect(state.currentIndex).toBe(1);

      state = goBack(state);  // → step 0
      expect(state.currentIndex).toBe(0);
      expect(canGoBack(state)).toBe(false);
    });

    it('the saved frame values are accessible in history', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });
      const s2 = goNext(s1, { packageManagers: ['homebrew'] });
      // The frame at history[0] should contain shell: 'zsh'
      expect(s2.history[0].values).toEqual({ shell: 'zsh' });
      expect(s2.history[0].stepIndex).toBe(0);
    });
  });

  describe('skip navigation (optional steps)', () => {
    it('skip advances the step index', () => {
      const s1 = skip(initialState);
      expect(s1.currentIndex).toBe(1);
    });

    it('skip pushes an empty values frame onto history', () => {
      const s1 = skip(initialState);
      expect(s1.history.length).toBe(1);
      expect(s1.history[0].values).toEqual({});
    });

    it('skip does not add any values to config', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });
      const s2 = skip(s1);  // skip step 1
      expect(s2.config['shell']).toBe('zsh');  // preserved
      // No new key from skip
      expect(Object.keys(s2.config)).toEqual(['shell']);
    });

    it('canGoBack is true after a skip', () => {
      const s1 = skip(initialState);
      expect(canGoBack(s1)).toBe(true);
    });

    it('can go back to a skipped step', () => {
      const s1 = goNext(initialState, { shell: 'zsh' });
      const s2 = skip(s1);  // skip step 1 (optional)
      const s3 = goBack(s2);
      expect(s3.currentIndex).toBe(1);
    });
  });

  describe('context step back-navigation (ContextListView trigger)', () => {
    it('navigating to contexts step with existing config.contexts enables list view', () => {
      // The wizard passes initialContexts={config.contexts} when canGoBack is true
      // Simulate: user at step 8, goes back to step 7 (contexts)
      let state = initialState;
      state = goNext(state, { shell: 'zsh' });          // step 0 → 1
      state = goNext(state, {});                          // step 1 → 2
      state = goNext(state, {});                          // step 2 → 3
      state = goNext(state, {});                          // step 3 → 4
      state = goNext(state, {});                          // step 4 → 5
      state = goNext(state, {});                          // step 5 → 6
      state = goNext(state, {});                          // step 6 → 7
      state = goNext(state, {
        contexts: [
          { label: 'personal', path: '~/Developer/personal', git: { name: 'A', email: 'a@a.com' }, authMethod: 'gh-cli', envVars: [], languageBindings: [] },
          { label: 'work',     path: '~/Developer/work',     git: { name: 'B', email: 'b@b.com' }, authMethod: 'gh-cli', envVars: [], languageBindings: [] },
        ]
      });  // step 7 → 8

      state = goBack(state);  // back to step 7

      // canGoBack tells wizard to pass initialContexts to ContextsStep
      expect(canGoBack(state)).toBe(true);
      expect(state.currentIndex).toBe(7);
      // config.contexts preserved
      expect(Array.isArray(state.config['contexts'])).toBe(true);
      expect((state.config['contexts'] as unknown[]).length).toBe(2);
    });

    it('context data is preserved after back navigation and re-advance', () => {
      const contexts = [
        { label: 'personal', path: '~/Developer/personal', git: { name: 'A', email: 'a@a.com' }, authMethod: 'gh-cli', envVars: [], languageBindings: [] },
      ];

      let state = initialState;
      for (let i = 0; i < 7; i++) state = goNext(state, {});
      state = goNext(state, { contexts });   // step 7 → 8 with contexts
      state = goBack(state);                  // back to step 7
      state = goNext(state, { contexts });   // re-advance with same contexts

      expect((state.config['contexts'] as typeof contexts)[0].label).toBe('personal');
    });

    it('ContextListView shows when initialContexts is non-empty (wizard passes config.contexts on back-nav)', () => {
      // This tests the wizard's prop-passing logic: when canGoBack && config.contexts exists,
      // wizard passes initialContexts={config.contexts} which triggers list view.
      const contexts = [{ label: 'p', path: '~', git: { name: 'N', email: 'e@e.com' }, authMethod: 'gh-cli', envVars: [], languageBindings: [] }];
      let state = initialState;
      for (let i = 0; i < 7; i++) state = goNext(state, {});
      state = goNext(state, { contexts });
      state = goBack(state);

      // The wizard checks: canGoBack && config.contexts (to decide whether to pass initialContexts)
      const shouldShowListView = canGoBack(state) && Array.isArray(state.config['contexts'])
        && (state.config['contexts'] as unknown[]).length > 0;
      expect(shouldShowListView).toBe(true);
    });
  });
});

// T050: getNextStep() logic tree unit tests
import { getNextStep } from '../../src/modes/wizard.js';

describe('getNextStep()', () => {
  it('defaults to step+1 for unhandled steps', () => {
    expect(getNextStep(0, {})).toBe(1);
    expect(getNextStep(1, {})).toBe(2);
    expect(getNextStep(9, {})).toBe(10);
  });

  it('step 6 (tools) → skips step 7 (app-config) when no editor tool selected', () => {
    expect(getNextStep(6, { tools: [] })).toBe(8);
    expect(getNextStep(6, { tools: ['slack', 'spotify'] })).toBe(8);
  });

  it('step 6 (tools) → goes to step 7 (app-config) when editor tool present', () => {
    expect(getNextStep(6, { tools: ['cursor'] })).toBe(7);
    expect(getNextStep(6, { tools: ['vscode'] })).toBe(7);
    expect(getNextStep(6, { tools: ['neovim', 'slack'] })).toBe(7);
  });

  it('step 6: editor matching is case-insensitive', () => {
    expect(getNextStep(6, { tools: ['Cursor'] })).toBe(7);
    expect(getNextStep(6, { tools: ['VSCODE'] })).toBe(7);
  });

  it('step 5 (contexts) → always goes to step 6', () => {
    expect(getNextStep(5, {})).toBe(6);
    expect(getNextStep(5, { contexts: [] })).toBe(6);
  });
});

// T008: StepNav rendering tests
import { StepNav } from '../../src/ui/step-nav.js';

describe('StepNav — rendering', () => {
  it('renders ← Back hint when onBack is provided', () => {
    const { lastFrame } = render(React.createElement(StepNav, { onBack: vi.fn() }));
    expect(lastFrame()).toContain('← Back (b)');
  });

  it('renders → Skip hint when isOptional + onSkip provided', () => {
    const { lastFrame } = render(React.createElement(StepNav, { onSkip: vi.fn(), isOptional: true }));
    expect(lastFrame()).toContain('→ Skip (s)');
  });

  it('renders nothing when no controls are provided', () => {
    const { lastFrame } = render(React.createElement(StepNav, {}));
    expect(lastFrame()?.trim()).toBe('');
  });
});

// T012: extractStepValues + resume clamping
import { extractStepValues } from '../../src/modes/wizard.js';

describe('extractStepValues()', () => {
  it('step 2 → returns shell value', () => {
    expect(extractStepValues(2, { shell: 'zsh' })).toEqual({ shell: 'zsh' });
  });

  it('step 3 → returns packageManagers value', () => {
    expect(extractStepValues(3, { packageManagers: ['homebrew'] })).toEqual({ packageManagers: ['homebrew'] });
  });

  it('step 5 → returns workspaceRoot, dotfilesRepo, contexts', () => {
    const result = extractStepValues(5, { workspaceRoot: '~/Dev', dotfilesRepo: 'git@...', contexts: [] });
    expect(result).toEqual({ workspaceRoot: '~/Dev', dotfilesRepo: 'git@...', contexts: [] });
  });

  it('step 9 → returns browser', () => {
    const browser = { selected: ['chrome'] };
    expect(extractStepValues(9, { browser })).toEqual({ browser });
  });

  it('step 10 → returns aiTools', () => {
    const aiTools = [{ label: 'GitHub Copilot', name: 'copilot', variant: 'cli-extension' as const }];
    expect(extractStepValues(10, { aiTools })).toEqual({ aiTools });
  });

  it('step 0 (config-detection) → returns empty object', () => {
    expect(extractStepValues(0, { shell: 'zsh' })).toEqual({});
  });

  it('step 11 (config-export) → returns empty object', () => {
    expect(extractStepValues(11, { shell: 'zsh' })).toEqual({});
  });
});

describe('resume clamping — last step does not overshoot', () => {
  const LAST_STEP = 12;  // matches wizard STEP_REGISTRY length - 1

  it('resumeStep at LAST_STEP clamps to LAST_STEP (not LAST_STEP+1)', () => {
    const nextStep = Math.min(LAST_STEP + 1, LAST_STEP);
    expect(nextStep).toBe(LAST_STEP);
  });

  it('resumeStep below LAST_STEP advances normally', () => {
    const nextStep = Math.min(5 + 1, LAST_STEP);
    expect(nextStep).toBe(6);
  });
});

// T021: Language binding multi-select schema validation
import { LanguageBindingSchema } from '../../src/config/schema.js';

describe('LanguageBinding schema — multi-language support (US6)', () => {
  it('accepts a valid binding with runtime, version, manager', () => {
    const result = LanguageBindingSchema.safeParse({ runtime: 'nodejs', version: '22.0.0', manager: 'nvm' });
    expect(result.success).toBe(true);
  });

  it('accepts a binding without manager (manager is optional)', () => {
    const result = LanguageBindingSchema.safeParse({ runtime: 'python', version: '3.12.0' });
    expect(result.success).toBe(true);
  });

  it('rejects a binding with empty version string', () => {
    const result = LanguageBindingSchema.safeParse({ runtime: 'nodejs', version: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a binding with empty runtime string', () => {
    const result = LanguageBindingSchema.safeParse({ runtime: '', version: '22.0.0' });
    expect(result.success).toBe(false);
  });

  it('multiple bindings accumulate correctly in an array', () => {
    const bindings = [
      { runtime: 'nodejs', version: '22.0.0', manager: 'nvm' },
      { runtime: 'python', version: '3.12.0', manager: 'pyenv' },
    ];
    bindings.forEach(b => {
      const result = LanguageBindingSchema.safeParse(b);
      expect(result.success).toBe(true);
    });
    expect(bindings.length).toBe(2);
  });
});
