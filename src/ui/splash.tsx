import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { EnvironmentSnapshot } from '../utils/environment.js';

const NUM_TILDES = 15;
const NUM_ROWS = 5;
const FRAME_MS = 50;
const DURATION_MS = 1800;

function buildWave(phase: number): string[] {
  const width = NUM_TILDES * 2;
  const grid: string[][] = Array.from({ length: NUM_ROWS }, () =>
    Array(width).fill(' ')
  );

  for (let t = 0; t < NUM_TILDES; t++) {
    const sine = Math.sin(t * 0.5 + phase);
    const row = Math.round(((sine + 1) / 2) * (NUM_ROWS - 1));
    grid[row][t * 2] = '~';
  }

  return grid.map(row => row.join(''));
}

interface SplashProps {
  environment: EnvironmentSnapshot;
  onDone: () => void;
}

export function Splash({ environment, onDone }: SplashProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPhase(p => p + 0.2), FRAME_MS);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      onDone();
    }, DURATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // onDone is a stable mount-time callback; adding it would require
    // parent to memoize and adds unnecessary complexity
  }, []);

  const rows = buildWave(phase);
  const shellDisplay = environment.shellVersion
    ? `${environment.shellName} ${environment.shellVersion}`
    : environment.shellName;

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      {rows.map((row, i) => (
        <Text key={`wave-row-${i}`} color="cyan">
          {row}
        </Text>
      ))}
      <Box marginTop={1} gap={2}>
        <Text bold color="cyan">
          tilde
        </Text>
        <Text dimColor>developer environment bootstrap</Text>
        <Text color="cyan" dimColor>
          v{environment.tildeVersion}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Box gap={2}>
          <Text dimColor>OS</Text>
          <Text color="cyan">{environment.os}</Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>Arch</Text>
          <Text color="cyan">{environment.arch}</Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>Shell</Text>
          <Text color="cyan">{shellDisplay}</Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>tilde</Text>
          <Text color="cyan">v{environment.tildeVersion}</Text>
        </Box>
      </Box>
    </Box>
  );
}

/** Compact single-line header locked at top after the splash wave clears. */
export function CompactHeader({ tildeVersion }: { tildeVersion: string }) {
  return (
    <Box marginBottom={1} gap={1}>
      <Text color="cyan">~</Text>
      <Text bold color="cyan">
        tilde
      </Text>
      <Text dimColor>developer environment bootstrap</Text>
      <Text color="cyan" dimColor>
        v{tildeVersion}
      </Text>
    </Box>
  );
}
