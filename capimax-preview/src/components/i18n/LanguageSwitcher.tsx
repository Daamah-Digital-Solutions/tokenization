import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

const languages: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
  },
];

// The current language of an i18next code ('fr-FR' is French)
const sameLanguage = (code: string, lng?: string) => (lng || '').split('-')[0] === code;

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'toggle' | 'minimal';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => sameLanguage(lang.code, i18n.language)) || languages[0];
  // The language after the current one (icon-only switcher)
  const nextLanguage = languages[(languages.indexOf(currentLanguage) + 1) % languages.length];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Toggle variant (mobile menu): every language side by side
  if (variant === 'toggle') {
    return (
      <div className={`flex items-center gap-1 p-1 rounded-lg border border-navy-200 dark:border-navy-700 ${className}`}>
        <Globe className="w-4 h-4 mx-1 text-navy-500 dark:text-navy-400 shrink-0" />
        {languages.map((language) => {
          const active = language.code === currentLanguage.code;
          return (
            <button
              key={language.code}
              type="button"
              onClick={() => handleLanguageChange(language.code)}
              aria-pressed={active}
              className={`flex-1 px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-800'
              }`}
            >
              {language.nativeName}
            </button>
          );
        })}
      </div>
    );
  }

  // Minimal variant - just the flag/icon
  if (variant === 'minimal') {
    return (
      <button
        onClick={() => handleLanguageChange(nextLanguage.code)}
        className={`p-2 text-slate-300 hover:text-white
                   hover:bg-slate-700/50 rounded-lg transition-all ${className}`}
        aria-label={`Switch to ${nextLanguage.name}`}
        title={`Switch to ${nextLanguage.name}`}
      >
        <Globe className="w-5 h-5" />
      </button>
    );
  }

  // Dropdown variant (default)
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium
                   text-navy-700 dark:text-navy-200 hover:bg-navy-100
                   dark:hover:bg-navy-800 rounded-lg transition-all
                   border border-navy-200 dark:border-navy-700"
        aria-label={currentLanguage.name}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        {/* Compact in the header: the name only where there is room for it */}
        <span className="hidden 2xl:inline">{currentLanguage.nativeName}</span>
        <span className="2xl:hidden uppercase">{currentLanguage.code}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 end-0 w-48
                       bg-white dark:bg-navy-800 border border-navy-200
                       dark:border-navy-700 rounded-xl shadow-xl overflow-hidden z-50"
            role="listbox"
          >
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-start
                           transition-colors ${
                             language.code === currentLanguage.code
                               ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400'
                               : 'text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-700'
                           }`}
                role="option"
                aria-selected={language.code === currentLanguage.code}
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-slate-500">{language.name}</div>
                </div>
                {language.code === currentLanguage.code && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;
