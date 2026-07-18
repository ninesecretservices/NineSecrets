// Startup env sanity check. Missing required vars are fatal (the app can't
// function without them); everything else is a console warning so the app
// still boots in dev but the gaps are impossible to miss before going live.
const REQUIRED = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
];

const WEAK_SECRET_HINTS = ['secret', 'changeme', 'password', '12345', 'your-'];

export function validateEnv(isProd) {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    process.exit(1);
  }

  if (!isProd) return;

  // Below this line: production-only checks. They warn rather than exit,
  // since a misconfigured-but-running server beats a crash loop — but every
  // one of these should be fixed before real traffic hits the app.
  const warnings = [];

  if (!process.env.ALLOWED_ORIGINS) {
    warnings.push('ALLOWED_ORIGINS is not set — CORS currently allows every origin in production.');
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    warnings.push('Cloudinary is not configured — image uploads will fall back to local disk, which will not persist or scale on most hosting platforms.');
  }
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL is not set — password-reset emails will link to localhost.');
  }
  if (!process.env.SMTP_HOST) {
    warnings.push('SMTP_HOST is not set — order-confirmation and password-reset emails will not actually send (dev fallback just logs them).');
  }
  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not set — the admin "Generate with AI" product description button will not work.');
  }
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = (process.env[key] || '').toLowerCase();
    if (value.length < 32 || WEAK_SECRET_HINTS.some((hint) => value.includes(hint))) {
      warnings.push(`${key} looks weak or short for production — use a long random value (e.g. openssl rand -hex 32).`);
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Production startup warnings:');
    for (const w of warnings) console.warn(`   - ${w}`);
    console.warn('');
  }
}
