import React, { useState, useCallback } from 'react';
import {
  Popover,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Text,
  TextField,
} from '@shopify/polaris';
import { CalendarIcon } from '@shopify/polaris-icons';

interface DateRangeSelectorProps {
  fromDate: string;
  toDate: string;
  onDateChange: (from: string, to: string) => void;
}

const formatLocalDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  fromDate,
  toDate,
  onDateChange,
}) => {
  const [popoverActive, setPopoverActive] = useState(false);
  const [activePreset, setActivePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [tempFrom, setTempFrom] = useState(fromDate);
  const [tempTo, setTempTo] = useState(toDate);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  const handleSelectPreset = useCallback(
    (preset: 'today' | 'week' | 'month') => {
      setActivePreset(preset);
      const now = new Date();
      const todayStr = formatLocalDateStr(now);

      let newFrom = todayStr;
      let newTo = todayStr;

      if (preset === 'today') {
        newFrom = todayStr;
        newTo = todayStr;
      } else if (preset === 'week') {
        // Start of current week (Monday)
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));
        newFrom = formatLocalDateStr(startOfWeek);
        newTo = todayStr;
      } else if (preset === 'month') {
        // Start of current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        newFrom = formatLocalDateStr(startOfMonth);
        newTo = todayStr;
      }

      setTempFrom(newFrom);
      setTempTo(newTo);
      onDateChange(newFrom, newTo);
      setPopoverActive(false);
    },
    [onDateChange]
  );

  const handleApplyCustom = useCallback(() => {
    const todayStr = formatLocalDateStr(new Date());
    if (tempFrom === todayStr && tempTo === todayStr) {
      setActivePreset('today');
    } else {
      setActivePreset('custom');
    }
    onDateChange(tempFrom, tempTo);
    setPopoverActive(false);
  }, [tempFrom, tempTo, onDateChange]);

  // Determine button label text based on active state and selected date range
  let buttonLabel = 'Select Date';
  if (activePreset === 'today') {
    buttonLabel = 'Today';
  } else if (activePreset === 'week') {
    buttonLabel = 'This Week';
  } else if (activePreset === 'month') {
    buttonLabel = 'This Month';
  } else {
    // Custom date selection
    if (fromDate === toDate) {
      // Single date selected
      buttonLabel = new Date(fromDate).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } else {
      // Date range selected
      const formattedFrom = new Date(fromDate).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });
      const formattedTo = new Date(toDate).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      buttonLabel = `${formattedFrom} – ${formattedTo}`;
    }
  }

  const activator = (
    <Button icon={CalendarIcon} onClick={togglePopoverActive} disclosure>
      {buttonLabel}
    </Button>
  );

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      onClose={togglePopoverActive}
      ariaHaspopup={false}
    >
      <Box padding="400" minWidth="320px">
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Select Date Range
          </Text>

          <InlineStack gap="200">
            <Button
              size="micro"
              variant={activePreset === 'today' ? 'primary' : 'secondary'}
              onClick={() => handleSelectPreset('today')}
            >
              Today
            </Button>
            <Button
              size="micro"
              variant={activePreset === 'week' ? 'primary' : 'secondary'}
              onClick={() => handleSelectPreset('week')}
            >
              This Week
            </Button>
            <Button
              size="micro"
              variant={activePreset === 'month' ? 'primary' : 'secondary'}
              onClick={() => handleSelectPreset('month')}
            >
              This Month
            </Button>
          </InlineStack>

          <BlockStack gap="200">
            <Text as="p" variant="bodySm" tone="subdued">
              Custom Range
            </Text>
            <InlineStack gap="200">
              <Box width="48%">
                <TextField
                  label="From"
                  type="date"
                  value={tempFrom}
                  onChange={setTempFrom}
                  autoComplete="off"
                />
              </Box>
              <Box width="48%">
                <TextField
                  label="To"
                  type="date"
                  value={tempTo}
                  onChange={setTempTo}
                  autoComplete="off"
                />
              </Box>
            </InlineStack>
          </BlockStack>

          <InlineStack align="end" gap="200">
            <Button size="micro" onClick={() => setPopoverActive(false)}>
              Cancel
            </Button>
            <Button size="micro" variant="primary" onClick={handleApplyCustom}>
              Apply
            </Button>
          </InlineStack>
        </BlockStack>
      </Box>
    </Popover>
  );
};
