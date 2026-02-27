/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fbf5fc',
          100: '#f5eaf9',
          200: '#ebd5f2',
          300: '#debce9',
          400: '#ca96dc',
          500: '#b06ecc',
          600: '#954db6',
          700: '#681870', // The requested color
          800: '#662468',
          900: '#552055',
          950: '#360d36',
        },
      },
    },
  },
  plugins: [],
}
