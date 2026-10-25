// Palettes read CSS variables (app/theme-colors.css) so Dark/Light mode can swap every color at once
const themed = (name: string, shades: number[]) =>
  Object.fromEntries(shades.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]));
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const ACCENTS = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 'red', 'blue', 'purple', 'orange', 'sky', 'lime', 'green', 'yellow', 'teal', 'pink', 'fuchsia'];

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // The page background is a background-only color: as a general color named "base" it also
      // generated a text-base color rule (#0f172a) that turned any "sm:text-base" text near-black
      backgroundColor: {
        'base': 'rgb(var(--c-slate-900) / <alpha-value>)',
      },
      colors: {
        slate: themed('slate', [...SHADES, 750, 850]),
        ...Object.fromEntries(ACCENTS.map((name) => [name, themed(name, SHADES)])),
        // Base surfaces
        'surface': 'rgb(var(--c-slate-800) / <alpha-value>)',
        'card': 'rgb(var(--c-slate-800) / <alpha-value>)',
        'border': 'rgb(var(--c-slate-700) / <alpha-value>)',
        // Accents
        'accent-indigo': '#6366f1',
        'accent-cyan': '#06b6d4',
        'accent-violet': '#8b5cf6',
        // Status
        'status-pending': '#f59e0b',
        'status-resolved': '#10b981',
        'status-dispatched': '#3b82f6',
        'status-danger': '#ef4444',
        // Text
        'text-primary': 'rgb(var(--c-slate-100) / <alpha-value>)',
        'text-secondary': 'rgb(var(--c-slate-400) / <alpha-value>)',
        'text-muted': 'rgb(var(--c-slate-500) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.35s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in forwards',
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'shimmer': 'shimmer 2.5s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(110%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(110%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99,102,241,0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(99,102,241,0.8), 0 0 40px rgba(99,102,241,0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(99,102,241,0.4)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.4)',
        'glow-emerald': '0 0 20px rgba(16,185,129,0.4)',
        'card': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
        'card-hover': '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
