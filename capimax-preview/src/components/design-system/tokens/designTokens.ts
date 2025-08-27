/**
 * Design Tokens - The Visual DNA of our Real Estate Tokenization Platform
 * 
 * This file contains all the core design values that define our brand identity.
 * Based on emerald/green theme with premium, minimal aesthetic.
 */

export const designTokens = {
  // Color Palette
  colors: {
    // Primary Brand Colors (Emerald/Green Theme)
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5', 
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',  // Main primary color
      500: '#10b981',  // Primary emerald
      600: '#059669',  // Primary dark
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },

    // Secondary Colors (Navy/Slate for sophistication)
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',  // Main secondary
      600: '#475569',  // Secondary dark
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },

    // Neutral Colors (For backgrounds and text)
    neutral: {
      white: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      black: '#000000',
    },

    // Semantic Colors
    success: {
      light: '#dcfce7',
      main: '#22c55e',
      dark: '#15803d',
    },
    warning: {
      light: '#fef3c7',
      main: '#f59e0b',
      dark: '#d97706',
    },
    error: {
      light: '#fee2e2',
      main: '#ef4444',
      dark: '#dc2626',
    },
    info: {
      light: '#dbeafe',
      main: '#3b82f6',
      dark: '#1d4ed8',
    },
  },

  // Typography Scale
  typography: {
    fontFamily: {
      primary: '"Inter", system-ui, -apple-system, sans-serif',
      secondary: '"Satoshi", system-ui, -apple-system, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
      '7xl': '4.5rem',   // 72px
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Spacing Scale (based on 4px grid)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
    40: '10rem',    // 160px
    48: '12rem',    // 192px
    64: '16rem',    // 256px
    80: '20rem',    // 320px
    96: '24rem',    // 384px
  },

  // Border Radius Scale
  borderRadius: {
    none: '0',
    sm: '0.375rem',   // 6px
    base: '0.5rem',   // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
    '3xl': '3rem',    // 48px
    full: '9999px',
  },

  // Shadow Scale
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    // Branded shadows with emerald glow
    primary: '0 4px 20px rgb(16 185 129 / 0.15)',
    primaryLg: '0 8px 30px rgb(16 185 129 / 0.2)',
  },

  // Animation & Motion
  animation: {
    transition: {
      fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
      base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index scale
  zIndex: {
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    dropdown: 1000,
    modal: 2000,
    popover: 3000,
    tooltip: 4000,
    toast: 5000,
  },
} as const;

// Dark mode color overrides
export const darkModeTokens = {
  colors: {
    // Adjusted primary colors for dark mode
    primary: {
      400: '#4ade80',  // Lighter for better contrast
      500: '#22c55e',  
      600: '#16a34a',
    },

    // Dark mode backgrounds
    background: {
      primary: '#0f172a',    // slate-900
      secondary: '#1e293b',  // slate-800
      tertiary: '#334155',   // slate-700
      card: '#1e293b',       // slate-800
      elevated: '#334155',   // slate-700
    },

    // Dark mode text colors
    text: {
      primary: '#f8fafc',    // slate-50
      secondary: '#cbd5e1',  // slate-300
      tertiary: '#94a3b8',   // slate-400
      muted: '#64748b',      // slate-500
    },

    // Dark mode borders
    border: {
      primary: '#334155',    // slate-700
      secondary: '#475569',  // slate-600
      accent: '#10b981',     // emerald-500
    },
  },
} as const;

// Export individual token categories for easier imports
export const { colors, typography, spacing, borderRadius, shadows, animation, breakpoints, zIndex } = designTokens;