import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

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
  version: string;
  onDone: () => void;
}

export function Splash({ version, onDone }: SplashProps) {
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

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1}>
      {rows.map((row, i) => (
        <Text key={i} color="cyan">
          {row}
        </Text>
      ))}
      <Box marginTop={1} gap={2}>
        <Text bold color="cyan">
          tilde
        </Text>
        <Text dimColor>macOS developer environment bootstrap</Text>
        <Text color="cyan" dimColor>
          v{version}
        </Text>
      </Box>
    </Box>
  );
}

/** Compact single-line header locked at top after the splash wave clears. */
export function CompactHeader({ version }: { version: string }) {
  return (
    <Box marginBottom={1} gap={1}>
      <Text color="cyan">~</Text>
      <Text bold color="cyan">
        tilde
      </Text>
      <Text dimColor>macOS developer environment bootstrap</Text>
      <Text color="cyan" dimColor>
        v{version}
      </Text>
    </Box>
  );
}
