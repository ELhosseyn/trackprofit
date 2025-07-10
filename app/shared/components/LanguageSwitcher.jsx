/**
 * Language Switcher Component
 * Allows users to switch between available languages
 */
import { Button, Icon, Popover, ActionList } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useLanguage } from "../providers/LanguageProvider";
import { SUPPORTED_LANGUAGES } from "../../core/constants";

/**
 * LanguageSwitcher component
 * @returns {JSX.Element} - Component
 */
export default function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  const handleLanguageSelect = useCallback(
    (selectedLanguage) => {
      changeLanguage(selectedLanguage);
      setPopoverActive(false);
    },
    [changeLanguage]
  );

  // Find current language object
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language);
  
  // Create action items for each supported language
  const actionItems = SUPPORTED_LANGUAGES.map((lang) => ({
    content: lang.name,
    onAction: () => handleLanguageSelect(lang.code),
    active: language === lang.code
  }));

  return (
    <Popover
      active={popoverActive}
      activator={
        <Button onClick={togglePopoverActive} size="slim">
          {currentLanguage?.name || language}
        </Button>
      }
      onClose={togglePopoverActive}
    >
      <ActionList actionRole="menuitem" items={actionItems} />
    </Popover>
  );
}
