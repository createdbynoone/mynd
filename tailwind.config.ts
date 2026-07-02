import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './src/index.html',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#23003F',
        'bg-elevated': '#2A0049',
        surface: '#310056',
        border: '#4A1878',
        accent: '#F94500',
        danger: '#F94500',
        'text-primary': '#FFFDB4',
        'text-secondary': '#BCACCE',
        'text-muted': '#7A6890',
      },
      fontFamily: {
        sans: ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
        heading: ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['VT323', 'Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 10px rgba(249, 69, 0, 0.4)',
        'neon-lg': '0 0 20px rgba(249, 69, 0, 0.3), 0 0 40px rgba(249, 69, 0, 0.12)',
        'neon-sm': '0 0 6px rgba(249, 69, 0, 0.25)',
      },
    },
  },
  plugins: [],
}

export default config
