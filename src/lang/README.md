# Browser Language Detection

Tính năng phát hiện ngôn ngữ của trình duyệt giúp tự động chọn ngôn ngữ phù hợp cho người dùng dựa trên cài đặt ngôn ngữ của trình duyệt.

## Cách hoạt động

### 1. Hàm `detectBrowserLanguage()`

Hàm này sử dụng `navigator.language` và `navigator.languages` để phát hiện ngôn ngữ của trình duyệt:

```typescript
import { detectBrowserLanguage } from '@/lang';

const browserLang = detectBrowserLanguage(); // Trả về 'en', 'vi', 'kr', hoặc 'jp'
```

**Mapping ngôn ngữ:**
- `ko`, `ko-KR` → `kr` (Korean)
- `en`, `en-US`, `en-GB` → `en` (English)
- `vi`, `vi-VN` → `vi` (Vietnamese)
- `ja`, `ja-JP` → `jp` (Japanese)

### 2. Hook `useBrowserLanguage()`

Hook này cung cấp thông tin về ngôn ngữ trình duyệt với trạng thái loading:

```typescript
import { useBrowserLanguage } from '@/lang';

const { browserLang, isDetecting, detectLanguage } = useBrowserLanguage();

// browserLang: ngôn ngữ được phát hiện
// isDetecting: trạng thái đang phát hiện
// detectLanguage: function để phát hiện lại
```

### 3. Hook `useBrowserLanguageInfo()`

Hook này cung cấp thông tin chi tiết về ngôn ngữ trình duyệt:

```typescript
import { useBrowserLanguageInfo } from '@/lang';

const languageInfo = useBrowserLanguageInfo();

// languageInfo.language: mã ngôn ngữ chính (ví dụ: 'en-US')
// languageInfo.languages: danh sách tất cả ngôn ngữ được ưu tiên
// languageInfo.userAgent: thông tin user agent
```

## Tích hợp với LangProvider

`LangProvider` đã được cập nhật để tự động phát hiện ngôn ngữ trình duyệt với thứ tự ưu tiên:

1. **localStorage** - ngôn ngữ đã lưu trước đó
2. **initialLang** - ngôn ngữ được truyền từ props
3. **Browser Language** - ngôn ngữ của trình duyệt
4. **Default** - ngôn ngữ mặc định ('kr')

```typescript
import { LangProvider } from '@/lang';

<LangProvider initialLang="en">
  <App />
</LangProvider>
```

## Ví dụ sử dụng

### Component hiển thị thông tin ngôn ngữ

```typescript
import { useLang, useBrowserLanguage, useBrowserLanguageInfo } from '@/lang';

const LanguageInfo = () => {
  const { lang, setLang } = useLang();
  const { browserLang, isDetecting } = useBrowserLanguage();
  const languageInfo = useBrowserLanguageInfo();

  return (
    <div>
      <p>Ngôn ngữ hiện tại: {lang}</p>
      <p>Ngôn ngữ trình duyệt: {browserLang}</p>
      {languageInfo && (
        <p>Mã ngôn ngữ: {languageInfo.language}</p>
      )}
    </div>
  );
};
```

### Tự động chuyển đổi ngôn ngữ

```typescript
import { useEffect } from 'react';
import { useLang, useBrowserLanguage } from '@/lang';

const AutoLanguageSwitch = () => {
  const { lang, setLang } = useLang();
  const { browserLang, isDetecting } = useBrowserLanguage();

  useEffect(() => {
    if (!isDetecting && browserLang !== lang) {
      // Tự động chuyển đổi nếu ngôn ngữ trình duyệt khác với ngôn ngữ hiện tại
      setLang(browserLang);
    }
  }, [browserLang, isDetecting, lang, setLang]);

  return null;
};
```

## Lưu ý

- Tính năng này chỉ hoạt động trên client-side (browser)
- Có fallback cho SSR với ngôn ngữ mặc định
- Hỗ trợ các mã ngôn ngữ phổ biến nhất
- Có thể mở rộng thêm các ngôn ngữ khác trong `langMap` 