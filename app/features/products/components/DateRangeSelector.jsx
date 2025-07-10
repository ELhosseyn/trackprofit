/**
 * DateRangeSelector component
 * Allows selecting date ranges for filtering data
 */
import { useState, useCallback } from 'react';
import { Button, DatePicker, Card, InlineStack, Text } from '@shopify/polaris';
import { useTranslation } from '../../../i18n';

export function DateRangeSelector({
  dateRange,
  onDateChange,
  dateRangeOptions,
  onPresetClick
}) {
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';
  
  const [datePickerActive, setDatePickerActive] = useState(false);
  
  const handleDateChange = useCallback(({ start, end }) => {
    onDateChange({ start, end });
    setDatePickerActive(false);
  }, [onDateChange]);
  
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('fr-CA'); // YYYY-MM-DD format
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px', 
      alignItems: isRTL ? 'flex-start' : 'flex-end', 
      position: 'relative'
    }}>
      <InlineStack gap="200" wrap={false}>
        {dateRangeOptions.map(preset => (
          <Button 
            key={preset.value} 
            size="slim" 
            onClick={() => {
              onPresetClick(preset.value);
              setDatePickerActive(false);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </InlineStack>
      
      <Button 
        onClick={() => setDatePickerActive(!datePickerActive)} 
        disclosure={datePickerActive ? "up" : "down"}
      >
        {`📅 ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
      </Button>
      
      {datePickerActive && (
        <div style={{
          position: 'absolute', 
          top: '105%', 
          zIndex: 400,
          right: isRTL ? undefined : 0, 
          left: isRTL ? 0 : undefined
        }}>
          <Card>
            <DatePicker
              month={dateRange.end.getMonth()}
              year={dateRange.end.getFullYear()}
              onChange={handleDateChange}
              onMonthChange={(month, year) => {
                // Just update the picker view, don't change selection
              }}
              selected={{ 
                start: dateRange.start, 
                end: dateRange.end 
              }}
              allowRange
            />
          </Card>
        </div>
      )}
    </div>
  );
}
