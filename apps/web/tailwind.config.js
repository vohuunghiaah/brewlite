/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF8F5',
          100: '#F7EBE1',
          500: '#8B4513', // Saddle Brown / Coffee primary
          600: '#6F370F',
          700: '#52290B',
          800: '#3A1D08',
          900: '#261305',
        },
      },
    },
  },
  plugins: [],
};

