/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          300: '#cbd5e1',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
        },
        emerald: {
          50: '#ecfdf5',
          300: '#6ee7b7',
          400: '#34d399',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
        },
        rose: {
          400: '#fb7185',
          600: '#e11d48',
        },
      },
    },
  },
  plugins: [],
};
