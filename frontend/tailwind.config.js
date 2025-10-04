/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nasa-blue': '#0B3D91',
        'nasa-red': '#FC3D21',
        'risk-high': '#EF4444',
        'risk-medium': '#F59E0B',
        'risk-low': '#10B981',
      },
    },
  },
  plugins: [],
}
