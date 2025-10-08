'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'pt-BR' : 'en';
    setLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center w-12 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors overflow-hidden"
      title={`${t('language.switchTo')} ${language === 'en' ? t('language.portuguese') : t('language.english')}`}
      aria-label={`${t('language.switchTo')} ${language === 'en' ? t('language.portuguese') : t('language.english')}`}
    >
      {language === 'en' ? (
        // USA Flag SVG
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7410 3900" className="w-8 h-6">
          <rect width="7410" height="3900" fill="#b22234"/>
          <path d="M0,450H7410m0,600H0m0,600H7410m0,600H0m0,600H7410m0,600H0" stroke="#fff" strokeWidth="300"/>
          <rect width="2964" height="2100" fill="#3c3b6e"/>
          <g fill="#fff">
            <g id="s18">
              <g id="s9">
                <g id="s5">
                  <g id="s4">
                    <path id="s" d="M247,90 317.534230,307.082039 132.873218,172.917961H361.126782L176.465770,307.082039z"/>
                    <use xlinkHref="#s" y="420"/>
                    <use xlinkHref="#s" y="840"/>
                    <use xlinkHref="#s" y="1260"/>
                  </g>
                  <use xlinkHref="#s" y="1680"/>
                </g>
                <use xlinkHref="#s4" x="247" y="210"/>
              </g>
              <use xlinkHref="#s9" x="494"/>
            </g>
            <use xlinkHref="#s18" x="988"/>
            <use xlinkHref="#s9" x="1976"/>
            <use xlinkHref="#s5" x="2470"/>
          </g>
        </svg>
      ) : (
        // Brazil Flag SVG
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 504" className="w-8 h-6">
          <rect width="720" height="504" fill="#009b3a"/>
          <path d="M360,52L660,252L360,452L60,252z" fill="#fedf00"/>
          <circle cx="360" cy="252" r="108" fill="#002776"/>
          <path d="M360,174a78,78,0,0,0,0,156c12,0,24-3,33-9" fill="none" stroke="#fff" strokeWidth="6"/>
        </svg>
      )}
    </button>
  );
}
