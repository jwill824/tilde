/**
 * Shared step navigation bar component.
 * Renders Back / Skip controls and handles keyboard shortcuts.
 *
 * Usage:
 * ```tsx
 * <StepNav onBack={onBack} isOptional={isOptional} onSkip={onSkip} />
 * ```
 *
 * isInputFocused: pass true when the step contains an active TextInput to prevent
 *   (b) from firing while the user is typing. Back nav re-enables once the field
 *   loses focus (user presses Esc or Tab).
 *
 * onAtFirstStep: called when (b) is pressed on the very first step (no onBack).
 *   The parent should render a transient inline hint in response.
 */
import React from 'react';
import { Box, Text, useInput } from 'ink';

interface StepNavProps {
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
  isInputFocused?: boolean;
  onAtFirstStep?: () => void;
}

/**
 * Renders navigation hints at the bottom of a wizard step.
 * - "← Back" when onBack is provided (press 'b')
 * - "→ Skip" when isOptional and onSkip provided (press 's')
 */
export function StepNav({ onBack, isOptional, onSkip, isInputFocused, onAtFirstStep }: StepNavProps) {
  useInput((input, key) => {
    if (input === 'b' || (key.leftArrow && key.meta)) {
      if (onBack) {
        onBack();
      } else if (onAtFirstStep) {
        onAtFirstStep();
      }
    }
    if (input === 's' && isOptional && onSkip) {
      onSkip();
    }
  }, { isActive: !isInputFocused });

  const hasControls = onBack || onAtFirstStep || (isOptional && onSkip);
  if (!hasControls) return null;

  return (
    <Box marginTop={1} gap={2}>
      {(onBack || onAtFirstStep) && (
        <Text dimColor>← Back (b)</Text>
      )}
      {isOptional && onSkip && (
        <Text dimColor>→ Skip (s)</Text>
      )}
    </Box>
  );
}
