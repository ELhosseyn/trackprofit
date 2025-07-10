/**
 * i18n utility functions and hooks
 */
import { useLanguage } from '../utils/i18n/LanguageContext';

/**
 * Custom hook that provides translation utilities
 * @returns {Object} Translation utilities
 */
export function useTranslation() {
  const { language, setLanguage, translations, isRTL } = useLanguage();
  
  /**
   * Translate a key
   * @param {string} key - Translation key
   * @param {Object} params - Parameters for interpolation
   * @returns {string} Translated string
   */
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (!result || !result[k]) {
        return key; // Return key if translation not found
      }
      result = result[k];
    }
    
    if (typeof result === 'string') {
      // Handle parameter interpolation
      return result.replace(/{(\w+)}/g, (match, p1) => {
        return params[p1] !== undefined ? params[p1] : match;
      });
    }
    
    return key; // Return key if result is not a string
  };
  
  return {
    t,
    language,
    setLanguage,
    isRTL
  };
}

export default useTranslation;
