import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { createEmptyInventoryReport, type InventoryReport, type InventoryScanState } from '../inventory/report.js';
import { summarizeInventory } from '../inventory/summary.js';

interface Props {
  inventory?: InventoryReport;
  inventoryState?: InventoryScanState;
  onComplete: (data: { inventory: InventoryReport }) => void;
  onBack?: () => void;
  isOptional?: boolean;
}

export function InventoryStep({ inventory, inventoryState, onComplete, onBack, isOptional: _isOptional }: Props) {
  const scanState = inventoryState ?? {
    status: 'ready' as const,
    report: inventory ?? createEmptyInventoryReport(),
  };
  const report = scanState.report;

  if (scanState.status === 'loading') {
    return (
      <Box flexDirection="column">
        <Text bold>Scanning inventory...</Text>
        <Text dimColor>Setup choices will be available after the scan finishes.</Text>
      </Box>
    );
  }

  const confirmItems = [
    { label: 'Continue', value: 'continue' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
  ];
  const heading = scanState.status === 'failed'
    ? 'Inventory scan failed'
    : 'Inventory scan complete';

  return (
    <Box flexDirection="column">
      <Text bold>{heading}</Text>
      <Box marginTop={1} flexDirection="column">
        {summarizeInventory(report).map(line => (
          <Text
            key={line}
            color={line.startsWith('Warning') ? 'yellow' : 'green'}
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

            onComplete({ inventory: report });
          }}
        />
      </Box>
    </Box>
  );
}
