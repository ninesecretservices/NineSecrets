import cron from 'node-cron';

// Render's free tier spins a service down after ~15 minutes with no inbound
// traffic, and the next request pays a cold-start penalty of 30s-1min+. That's
// unacceptable while the site is under review (Razorpay activation, or anyone
// else clicking through it), so this self-pings /health often enough to never
// let it go idle. RENDER_EXTERNAL_URL is set automatically by Render on every
// service — no manual config needed there; RENDER_APP_URL is only a manual
// override for testing this outside of Render itself.
const TARGET_URL = process.env.RENDER_APP_URL || process.env.RENDER_EXTERNAL_URL;

export function startRenderKeepAliveJob() {
  if (process.env.RENDER_AUTO !== 'true') return;
  if (!TARGET_URL) {
    console.warn('RENDER_AUTO is true but no RENDER_EXTERNAL_URL/RENDER_APP_URL is set — keep-alive job not started.');
    return;
  }

  const url = `${TARGET_URL.replace(/\/$/, '')}/health`;
  cron.schedule('*/10 * * * *', async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) console.warn(`Render keep-alive ping got ${res.status} from ${url}`);
    } catch (err) {
      console.error('Render keep-alive ping failed:', err.message);
    }
  });
  console.log(`Render keep-alive job started — pinging ${url} every 10 minutes.`);
}
