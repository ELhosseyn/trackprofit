/**
 * Language Provider
 * This component provides language context to the entire application
 */
import { createContext, useContext, useState, useEffect } from "react";
import translations from "../../i18n/translations";

// Create context with default values
const LanguageContext = createContext({
  language: "en",
  isRTL: false,
  changeLanguage: () => {},
  t: (key, options = {}) => key
});

/**
 * Language Provider Component
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Provider component
 */
export function LanguageProvider({ children, initialLanguage = "en" }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [isRTL, setIsRTL] = useState(initialLanguage === "ar");

  // Effect to sync language with localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") || initialLanguage;
    setLanguage(savedLanguage);
    setIsRTL(savedLanguage === "ar");
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
  }, [initialLanguage]);

  /**
   * Change the active language
   * @param {String} newLanguage - Language code to change to
   */
  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    setIsRTL(newLanguage === "ar");
    localStorage.setItem("language", newLanguage);
    document.documentElement.lang = newLanguage;
    document.documentElement.dir = newLanguage === "ar" ? "rtl" : "ltr";
  };

  /**
   * Translate a key
   * @param {String} key - Translation key
   * @param {Object} options - Translation options
   * @returns {String} - Translated text
   */
  const t = (key, options = {}) => {
    const { fallback } = options;
    
    // Nested key handling with dot notation
    const keys = key.split(".");
    let result = translations[language];
    
    // Navigate through nested objects
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return fallback || key;
      }
    }
    
    // Handle string replacements
    if (typeof result === "string" && options) {
      return Object.entries(options).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{{${key}}}`, "g"), value);
      }, result);
    }
    
    return typeof result === "string" ? result : fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to use the language context
 * @returns {Object} - Language context
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
