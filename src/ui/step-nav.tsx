/**
 * Shared step navigation bar component.
 * Renders Back / Skip controls and handles keyboard shortcuts.
 *
 * Usage:
 * ```tsx
 * <StepNav onBack={onBack} isOptional={isOptional} onSkip={onSkip} />
 * ```
 */
import React from 'react';
import { Box, Text, useInput } from 'ink';

interface StepNavProps {
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
}

/**
 * Renders navigation hints at the bottom of a wizard step.
 * - "← Back" when onBack is provided (press 'b')
 * - "→ Skip" when isOptional and onSkip provided (press 's')
 */
export function StepNav({ onBack, isOptional, onSkip }: StepNavProps) {
  useInput((input, key) => {
    if ((input === 'b' || (key.leftArrow && key.meta)) && onBack) {
      onBack();
    }
    if (input === 's' && isOptional && onSkip) {
      onSkip();
    }
  });

  const hasControls = onBack || (isOptional && onSkip);
  if (!hasControls) return null;

  return (
    <Box marginTop={1} gap={2}>
      {onBack && (
        <Text dimColor>← Back (b)</Text>
      )}
      {isOptional && onSkip && (
        <Text dimColor>→ Skip (s)</Text>
      )}
    </Box>
  );
}
