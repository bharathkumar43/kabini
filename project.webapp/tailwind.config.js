/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        card: '#181818',
        'gray-800': '#1F2937',
        'gray-900': '#111827',
        white: '#FFFFFF',
        'gray-400': '#9CA3AF',
        'gray-600': '#4B5563',
        primary: '#000000',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'ui-sans-serif', 'system-ui'],
      },
      spacing: {
        '18': '4.5rem', /* 72px */
        '22': '5.5rem', /* 88px */
        '26': '6.5rem', /* 104px */
        '30': '7.5rem', /* 120px */
        '34': '8.5rem', /* 136px */
        '38': '9.5rem', /* 152px */
        '42': '10.5rem', /* 168px */
        '46': '11.5rem', /* 184px */
        '50': '12.5rem', /* 200px */
        '54': '13.5rem', /* 216px */
        '58': '14.5rem', /* 232px */
        '62': '15.5rem', /* 248px */
        '66': '16.5rem', /* 264px */
        '70': '17.5rem', /* 280px */
        '74': '18.5rem', /* 296px */
        '78': '19.5rem', /* 312px */
        '82': '20.5rem', /* 328px */
        '86': '21.5rem', /* 344px */
        '90': '22.5rem', /* 360px */
        '94': '23.5rem', /* 376px */
        '98': '24.5rem', /* 392px */
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};
