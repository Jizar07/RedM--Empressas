import { useLanguage, Language } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<typeof translations.en>;

export function useTranslation() {
  const { language, setLanguage } = useLanguage();

  // Helper function to get nested value from object using dot notation
  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || path;
  };

  const t = (key: TranslationKey): string => {
    const currentTranslations = translations[language];
    return getNestedValue(currentTranslations, key);
  };

  return {
    t,
    language,
    setLanguage,
  };
}
