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
        sloth: {
          50: '#F4F7F4',
          100: '#E6EDE7',
          200: '#CDDC CF',
          300: '#A8C2AC',
          400: '#7FA585',
          500: '#5C8A63',
          600: '#466E4C',
          700: '#38573D',
          800: '#2F4533',
          900: '#283B2B',
          950: '#142016',
        },
        warm: {
          50: '#FAF9F6',
          100: '#F5F3EF',
          200: '#EBE7DF',
          300: '#DDD6CA',
          400: '#C5BAA7',
          800: '#232522',
          900: '#191B18',
          950: '#101210'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
