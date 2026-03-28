import React, { useEffect } from 'react';
import { Box, Text } from 'ink';

const ASCII_ART = [
  '  _   _ _     _      ',
  ' | |_(_) | __| | ___ ',
  " | __| | |/ _` |/ _ \\",
  ' | |_| | | (_| |  __/',
  "  \\__|_|_|\\__,_|\\___|",
];

interface SplashProps {
  version: string;
  onDone: () => void;
  /** ms to display before calling onDone (default: 1200) */
  duration?: number;
}

export function Splash({ version, onDone, duration = 1200 }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={0}
      marginBottom={1}
      alignSelf="flex-start"
    >
      <Box marginTop={1} flexDirection="column">
        {ASCII_ART.map((line, i) => (
          <Text key={i} color="cyan" bold>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1} marginBottom={1} flexDirection="row" gap={2}>
        <Text dimColor>macOS developer environment bootstrap</Text>
        <Text color="cyan" dimColor>
          v{version}
        </Text>
      </Box>
    </Box>
  );
}
