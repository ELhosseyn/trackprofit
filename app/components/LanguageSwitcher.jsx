import { useCallback, useState } from 'react';
import { Button, Popover, ActionList, Box, InlineStack, Text } from '@shopify/polaris';
import { useLanguage } from '../utils/i18n/LanguageContext.jsx';

export default function LanguageSwitcher() {
  const { language, changeLanguage, languages, isRTL } = useLanguage();
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const handleLanguageChange = useCallback(
    (newLanguage) => {
      changeLanguage(newLanguage);
      setPopoverActive(false);
    },
    [changeLanguage],
  );

  const activator = (
    <Button onClick={togglePopoverActive} icon={
      <span style={{ fontSize: '1.2rem', marginRight: isRTL ? '0' : '5px', marginLeft: isRTL ? '5px' : '0' }}>
        {languages[language]?.flagEmoji}
      </span>
    }>
      {languages[language]?.name}
    </Button>
  );

  const languageItems = Object.values(languages)
    .filter(lang => lang.code !== language)
    .map(lang => ({
      content: (
        <InlineStack align="start" gap="200">
          <Box>
            <Text variant="bodyMd">
              <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>{lang.flagEmoji}</span>
              {lang.name}
            </Text>
          </Box>
        </InlineStack>
      ),
      onAction: () => handleLanguageChange(lang.code),
    }));

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      onClose={() => setPopoverActive(false)}
      preferredAlignment="end"
    >
      <Box padding="400">
        <ActionList
          actionRole="menuitem"
          items={languageItems}
        />
      </Box>
    </Popover>
  );
}
