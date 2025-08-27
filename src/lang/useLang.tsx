'use client';
import { useContext, useEffect, useState } from 'react';
import { LangContext, LangContextProps } from './LangProvider';
import { LangCodes, detectBrowserLanguage } from './index';

type TranslationValue = string | string[] | { [key: string]: TranslationValue };

export const useLang = () => {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be used within a LangProvider');
  }

  const getNestedValue = (obj: any, path: string[]): TranslationValue => {
    let current = obj;
    for (const key of path) {
      if (current === undefined || current === null) {
        return path.join(".");
      }
      current = current[key];
    }
    return current;
  };

  const t = (key: string, params?: Record<string, any>): string => {
    const value = getNestedValue(context.translations, key.split("."));
    if (typeof value === "string") {
      if (params) {
        return Object.entries(params).reduce((str, [key, val]) => {
          return str.replace(new RegExp(`{${key}}`, 'g'), String(val));
        }, value);
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.join("\n");
    }
    return key;
  };

  const tArray = (key: string): string[] => {
    const value = getNestedValue(context.translations, key.split("."));
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      return [value];
    }
    return [key];
  };

  return {
    t,
    tArray,
    lang: context.lang,
    setLang: context.setLang,
    langConfig: context.langConfig,
  };
};

// Hook để phát hiện ngôn ngữ của trình duyệt
export const useBrowserLanguage = () => {
  const [browserLang, setBrowserLang] = useState<LangCodes>('kr');
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectLang = () => {
      try {
        const detected = detectBrowserLanguage();
        setBrowserLang(detected);
      } catch (error) {
        console.warn('Failed to detect browser language:', error);
        setBrowserLang('kr');
      } finally {
        setIsDetecting(false);
      }
    };

    // Chỉ chạy trên client side
    if (typeof window !== 'undefined') {
      detectLang();
    } else {
      setIsDetecting(false);
    }
  }, []);

  return {
    browserLang,
    isDetecting,
    detectLanguage: detectBrowserLanguage,
  };
};

// Hook để lấy thông tin chi tiết về ngôn ngữ trình duyệt
export const useBrowserLanguageInfo = () => {
  const [languageInfo, setLanguageInfo] = useState<{
    language: string;
    languages: readonly string[];
    userAgent: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLanguageInfo({
        language: navigator.language,
        languages: navigator.languages || [],
        userAgent: navigator.userAgent,
      });
    }
  }, []);

  return languageInfo;
};
