/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
        },
      },
      borderRadius: {
        xs: '0.125rem',
      },
    },
  },
  plugins: [],
}