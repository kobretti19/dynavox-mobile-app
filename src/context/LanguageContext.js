import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { translations, SUPPORTED_LANGUAGES } from '../i18n';

const LanguageContext = createContext(undefined);
const STORAGE_KEY = 'inventory_app_language';

const resolveValue = (lang, key) => {
  let value = translations[lang];
  for (const part of key.split('.')) value = value?.[part];
  return value;
};

const deviceLanguage = () => {
  try {
    const code = getLocales()[0]?.languageCode;
    return SUPPORTED_LANGUAGES.includes(code) ? code : 'en';
  } catch {
    return 'en';
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(deviceLanguage);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (SUPPORTED_LANGUAGES.includes(stored)) setLanguageState(stored);
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  }, []);

  // Usage: t('nav.dashboard') or t('login.footer', { year: 2026 })
  const t = useCallback(
    (key, vars) => {
      let value = resolveValue(language, key);
      if (value === undefined) value = resolveValue('en', key) ?? key;
      if (typeof value === 'string' && vars) {
        return Object.keys(vars).reduce(
          (str, k) => str.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]),
          value,
        );
      }
      return value;
    },
    [language],
  );

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
