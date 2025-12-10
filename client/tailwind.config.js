/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        laterite: '#d7523c',
        nature: '#4caf50',
        system: '#333a56',
        sable: '#f0c987',
        fond: '#fefaf6',
      }
    }
  },
  plugins: [],
}
