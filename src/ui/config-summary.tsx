import React from 'react';
import { Box, Text } from 'ink';
import type { TildeConfig } from '../config/schema.js';

interface Props {
  config: TildeConfig;
}

export function ConfigSummary({ config }: Props) {
  const enabledDomains = Object.entries(config.configurations)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const toolsList = config.tools.length > 0 ? config.tools.join(', ') : 'none';

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Configuration Summary</Text>
      </Box>

      {/* Header row: OS | shell | packageManagers */}
      <Box marginBottom={1}>
        <Text bold>OS: </Text>
        <Text>{config.os}</Text>
        <Text bold>  Shell: </Text>
        <Text>{config.shell}</Text>
        <Text bold>  Package Managers: </Text>
        <Text>{(config.packageManagers ?? ['homebrew']).join(', ')}</Text>
      </Box>

      {/* Contexts table */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Contexts:</Text>
        {config.contexts.map((ctx) => (
          <Box key={ctx.label} marginLeft={2}>
            <Text color="cyan">{ctx.label}</Text>
            <Text> — {ctx.path} | {ctx.git.email} | {ctx.authMethod}</Text>
          </Box>
        ))}
      </Box>

      {/* Tools */}
      <Box marginBottom={1}>
        <Text bold>Tools: </Text>
        <Text>{toolsList}</Text>
      </Box>

      {/* Configurations: enabled domains */}
      <Box marginBottom={1}>
        <Text bold>Configurations: </Text>
        <Text>{enabledDomains.length > 0 ? enabledDomains.join(', ') : 'none'}</Text>
      </Box>

      {/* Secrets backend */}
      <Box marginBottom={config.browser?.selected?.length || config.aiTools?.length ? 1 : 0}>
        <Text bold>Secrets backend: </Text>
        <Text>{config.secretsBackend}</Text>
      </Box>

      {/* Browser — only shown when configured */}
      {!!config.browser?.selected?.length && (
        <Box marginBottom={config.aiTools?.length ? 1 : 0}>
          <Text bold>Browser: </Text>
          <Text>{config.browser.selected.join(', ')}</Text>
        </Box>
      )}

      {/* AI Coding Tools — only shown when configured */}
      {!!config.aiTools?.length && (
        <Box>
          <Text bold>AI Coding Tools: </Text>
          <Text>{config.aiTools.map(t => t.label).join(', ')}</Text>
        </Box>
      )}
    </Box>
  );
}
