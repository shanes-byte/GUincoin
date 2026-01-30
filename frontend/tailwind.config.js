/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dynamic theme colors using CSS variables
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        // Navigation text colors
        'nav-active': 'rgb(var(--color-nav-text) / <alpha-value>)',
        'nav-inactive': 'rgb(var(--color-nav-text-inactive) / <alpha-value>)',
        'nav-hover': 'rgb(var(--color-nav-text-hover) / <alpha-value>)',
      },
      animation: {
        'confetti': 'campaign-confetti 3s ease-in-out infinite',
        'float': 'campaign-float 3s ease-in-out infinite',
        'pulse-slow': 'campaign-pulse 2s ease-in-out infinite',
        'gradient': 'campaign-gradient 5s ease infinite',
      },
    },
  },
  plugins: [],
}
