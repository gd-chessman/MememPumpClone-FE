import en from './locales/en.json';
import vi from './locales/vi.json';
import kr from './locales/kr.json';
import jp from './locales/jp.json';
import { useLang, useBrowserLanguage, useBrowserLanguageInfo } from '@/lang/useLang';
import { LangProvider } from '@/lang/LangProvider';

export type LangCodes = 'en' | 'vi' | 'kr' | 'jp';

// Định nghĩa kiểu dữ liệu có thể chứa object lồng nhau
type Translations = { [key: string]: string | string[] | Translations };

export const langConfig: { 
  listLangs: { id: number; name: string; code: LangCodes; translationKey: string; flag: string }[];
  langsApp: Partial<Record<LangCodes, Translations>>;
} = {
  listLangs: [
    { id: 1, name: "Korea", code: "kr", translationKey: "languages.korea", flag: "https://flagcdn.com/w40/kr.png" },
    { id: 2, name: "English", code: "en", translationKey: "languages.english", flag: "https://flagcdn.com/w40/gb.png" },
    { id: 3, name: "Vietnamese", code: "vi", translationKey: "languages.vietnamese", flag: "https://flagcdn.com/w40/vn.png" },
    { id: 4, name: "Japan", code: "jp", translationKey: "languages.japan", flag: "https://flagcdn.com/w40/jp.png" },
  ],
  langsApp: {
    en,
    vi,
    kr,
    jp,
  }
};

// Hàm phát hiện ngôn ngữ của trình duyệt
export const detectBrowserLanguage = (): LangCodes => {
  if (typeof window === 'undefined') {
    return 'kr'; // Fallback cho SSR
  }

  const browserLang = navigator.language || navigator.languages?.[0] || 'kr';
  
  // Chuyển đổi mã ngôn ngữ của trình duyệt sang mã ngôn ngữ của ứng dụng
  const langMap: Record<string, LangCodes> = {
    'ko': 'kr',     // Korean
    'ko-KR': 'kr',  // Korean (Korea)
    'en': 'en',     // English
    'en-US': 'en',  // English (US)
    'en-GB': 'en',  // English (UK)
    'vi': 'vi',     // Vietnamese
    'vi-VN': 'vi',  // Vietnamese (Vietnam)
    'ja': 'jp',     // Japanese
    'ja-JP': 'jp',  // Japanese (Japan)
  };

  // Tìm ngôn ngữ phù hợp nhất
  const exactMatch = langMap[browserLang];
  if (exactMatch) {
    return exactMatch;
  }

  // Tìm ngôn ngữ dựa trên mã ngôn ngữ chính (2 ký tự đầu)
  const primaryLang = browserLang.split('-')[0];
  const primaryMatch = langMap[primaryLang];
  if (primaryMatch) {
    return primaryMatch;
  }

  return 'kr'; // Fallback mặc định
};

// Hàm hỗ trợ lấy dữ liệu từ object lồng nhau
const getNestedTranslation = (translations: Translations, key: string): string | string[] => {
  const result = key.split('.').reduce((obj: any, k) => {
    if (typeof obj === 'object' && obj !== null && k in obj) {
      return obj[k] as Translations;
    }
    return undefined;
  }, translations as Translations);
  
  return result || key;
};

// Export the translation function that takes language as a parameter
export const getTranslation = (lang: LangCodes) => {
  const translations = langConfig.langsApp[lang] || {};
  
  return (key: string): string => {
    const result = getNestedTranslation(translations, key);
    if (Array.isArray(result)) {
      // For arrays, join them with newlines to make it a string
      return result.join('\n');
    }
    return result as string;
  };
};

// Re-export useLang and LangProvider
export { useLang, useBrowserLanguage, useBrowserLanguageInfo, LangProvider };
