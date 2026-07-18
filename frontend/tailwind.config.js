/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Runtime-themeable: values live as CSS variables (defaults in
        // index.css :root; the storefront ThemeApplier overrides them per theme).
        cream: 'var(--ns-cream)',
        beige: 'var(--ns-beige)',
        blush: 'var(--ns-blush)',
        'baby-pink': 'var(--ns-baby-pink)',
        'pastel-green': 'var(--ns-pastel-green)',
        'text-dark': 'var(--ns-ink)',
        ink: 'var(--ns-ink)',
        'ink-soft': 'var(--ns-ink-soft)',
        mauve: 'var(--ns-mauve)',
        'mauve-dark': 'var(--ns-mauve-dark)',
        'mauve-soft': 'var(--ns-mauve-soft)',
        band: 'var(--ns-band)',
        'band-text': 'var(--ns-band-text)',
        surface: 'var(--ns-surface)',
        teal: '#5DBBB7',
        orange: '#F97316', // fallback pop
        green: '#22C55E',  // fallback pop
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['"Poppins"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
