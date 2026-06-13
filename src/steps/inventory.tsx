import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { InventoryReport } from '../inventory/report.js';
import { summarizeInventory } from '../inventory/summary.js';

interface Props {
  inventory: InventoryReport;
  onComplete: (data: { inventory: InventoryReport }) => void;
  onBack?: () => void;
  isOptional?: boolean;
}

export function InventoryStep({ inventory, onComplete, onBack, isOptional: _isOptional }: Props) {
  const confirmItems = [
    { label: 'Continue', value: 'continue' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
  ];

  return (
    <Box flexDirection="column">
      <Text bold>Inventory scan complete</Text>
      <Box marginTop={1} flexDirection="column">
        {summarizeInventory(inventory).map(line => (
          <Text
            key={line}
            color={line.startsWith('Warning:') ? 'yellow' : 'green'}
          >
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={confirmItems}
          onSelect={(item) => {
            if (item.value === 'back' && onBack) {
              onBack();
              return;
            }

            onComplete({ inventory });
          }}
        />
      </Box>
    </Box>
  );
}
