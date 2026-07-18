// Storefront theme system. The store runs a single fixed palette — pastel
// green on cream — applied at runtime via CSS variables (see tailwind.config.js).

// token key → CSS variable
export const TOKEN_VARS = {
  cream: '--ns-cream',
  beige: '--ns-beige',
  blush: '--ns-blush',
  babyPink: '--ns-baby-pink',
  pastelGreen: '--ns-pastel-green',
  ink: '--ns-ink',
  inkSoft: '--ns-ink-soft',
  mauve: '--ns-mauve',
  mauveDark: '--ns-mauve-dark',
  mauveSoft: '--ns-mauve-soft',
  band: '--ns-band',
  bandText: '--ns-band-text',
  surface: '--ns-surface',
};

const CREAM = '#F3ECE3';

export const DEFAULT_TOKENS = {
  cream: CREAM,
  surface: CREAM,
  beige: '#E4D8C8',
  blush: '#DCE8D8',
  babyPink: '#E3EEDF',
  pastelGreen: '#C3DCC0',
  ink: '#3F5347',
  inkSoft: '#4A5F52',
  mauve: '#7E8A7B',
  mauveDark: '#5E6C60',
  mauveSoft: '#97A294',
  band: '#3F5347',
  bandText: '#F3ECE3',
};

export const THEME = {
  id: 'urgent-green-cream',
  name: 'Pastel Green on Cream',
  mood: 'Built from a single green, #3F5347 — its deepened, muted form drives text, buttons and bands; a light tint of the same hue, #C3DCC0, carries badges and accents.',
  base: { body: CREAM, ink: DEFAULT_TOKENS.ink, surface: CREAM, accent: DEFAULT_TOKENS.pastelGreen },
  tokens: DEFAULT_TOKENS,
};

export const THEMES = [THEME];

export const applyThemeTokens = (tokens) => {
  for (const [key, cssVar] of Object.entries(TOKEN_VARS)) {
    if (tokens[key]) document.documentElement.style.setProperty(cssVar, tokens[key]);
  }
};

export const clearThemeTokens = () => {
  for (const cssVar of Object.values(TOKEN_VARS)) {
    document.documentElement.style.removeProperty(cssVar);
  }
};
