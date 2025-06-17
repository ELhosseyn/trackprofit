import { createContext, useState, useContext, useEffect } from 'react';
import { getInitialLanguage, setDocumentDirection, LANGUAGES, DEFAULT_LANGUAGE, t } from './translations';

// Create the language context
const LanguageContext = createContext();

// Language provider component
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize language on client-side only
  useEffect(() => {
    const initialLang = getInitialLanguage();
    setLanguage(initialLang);
    setDocumentDirection(initialLang);
    setIsLoaded(true);
  }, []);

  // Function to change language
  const changeLanguage = (newLanguage) => {
    if (LANGUAGES[newLanguage]) {
      setLanguage(newLanguage);
      setDocumentDirection(newLanguage);
      
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', newLanguage);
      }
    }
  };

  // Provide translation function
  const translate = (key, params = {}) => t(key, language, params);

  // Context value
  const value = {
    language,
    changeLanguage,
    t: translate,
    isRTL: LANGUAGES[language]?.dir === 'rtl',
    isLoaded,
    languages: LANGUAGES
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
