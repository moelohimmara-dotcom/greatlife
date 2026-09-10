import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Fraunces', 'Georgia', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        gourmand: {
          primary: '#2D5A27',
          accent: '#C44536',
          gold: '#D4912F',
          cream: '#F5EFE6',
        },
      },
      borderRadius: {
        organic: '20px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(45,90,39,0.08), 0 4px 12px rgba(45,90,39,0.08), 0 16px 40px rgba(45,90,39,0.16)',
      },
    },
  },
  plugins: [],
}

export default config
