/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dairy: {
          50: '#f0f5ff',
          100: '#e0eaff',
          200: '#c7d8fe',
          300: '#a5bdfd',
          400: '#819afb',
          500: '#5c72f6',
          600: '#464feb',
          700: '#383cd4',
          800: '#2f31ac',
          950: '#0a0d2d',
          cream: '#FCFAF2',
          milk: '#FDFDFD',
          sky: '#E0F2FE'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.1)'
      }
    },
  },
  plugins: [],
}
