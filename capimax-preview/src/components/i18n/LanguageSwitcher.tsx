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
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'toggle' | 'minimal';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  // TEMPORARILY HIDDEN (client request 2026-07-09): hide the language switcher
  // from the live site until the Arabic/i18n translations are finalized.
  // To restore, delete the next line.
  return null;

  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

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

  // Toggle variant - simple button to switch between languages
  if (variant === 'toggle') {
    const nextLanguage = languages.find((lang) => lang.code !== i18n.language) || languages[0];

    return (
      <button
        onClick={() => handleLanguageChange(nextLanguage.code)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium
                   text-navy-700 dark:text-navy-200 hover:bg-navy-100
                   dark:hover:bg-navy-800 rounded-lg transition-all
                   border border-navy-200 dark:border-navy-700 ${className}`}
        aria-label={`Switch to ${nextLanguage.name}`}
      >
        <Globe className="w-4 h-4" />
        <span>{nextLanguage.nativeName}</span>
      </button>
    );
  }

  // Minimal variant - just the flag/icon
  if (variant === 'minimal') {
    const nextLanguage = languages.find((lang) => lang.code !== i18n.language) || languages[0];

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
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium
                   text-navy-700 dark:text-navy-200 hover:bg-navy-100
                   dark:hover:bg-navy-800 rounded-lg transition-all
                   border border-navy-200 dark:border-navy-700"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
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
            className="absolute top-full mt-2 right-0 w-48
                       bg-white dark:bg-navy-800 border border-navy-200
                       dark:border-navy-700 rounded-xl shadow-xl overflow-hidden z-50"
            role="listbox"
          >
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left
                           transition-colors ${
                             language.code === i18n.language
                               ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400'
                               : 'text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-700'
                           }`}
                role="option"
                aria-selected={language.code === i18n.language}
              >
                <span className="text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-slate-500">{language.name}</div>
                </div>
                {language.code === i18n.language && (
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
