import Product from '../schema/Product.js';
import Item from '../schema/Item.js';

// Plain XML sitemap — not under /api (crawlers expect it at the domain root,
// and it's a simple GET, not the app's POST-only JSON API convention).
// Always generated fresh from the live catalog, not a build-time snapshot.
export async function sitemapXml(req, res) {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  const staticUrls = [
    { loc: '/', priority: '1.0' },
    { loc: '/collection', priority: '0.9' },
    { loc: '/bestsellers', priority: '0.8' },
    { loc: '/about', priority: '0.5' },
    { loc: '/fit-guide', priority: '0.5' },
    { loc: '/privacy-policy', priority: '0.3' },
    { loc: '/return-policy', priority: '0.3' },
    { loc: '/shipping-policy', priority: '0.3' },
    { loc: '/terms-of-service', priority: '0.3' },
  ];

  const [products, items] = await Promise.all([
    Product.find({ status: 'active', isDeleted: false }, 'slug updatedAt').lean(),
    Item.find({ status: 'active', isDeleted: false }, '_id name updatedAt').lean(),
  ]);

  const urlEntries = [
    ...staticUrls.map((u) => `  <url>\n    <loc>${baseUrl}${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`),
    ...products.map((p) => `  <url>\n    <loc>${baseUrl}/product/${p.slug}</loc>\n    <lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>\n    <priority>0.7</priority>\n  </url>`),
    ...items.map((i) => `  <url>\n    <loc>${baseUrl}/collection?item=${i._id}&cat=${encodeURIComponent(i.name)}</loc>\n    <lastmod>${new Date(i.updatedAt).toISOString()}</lastmod>\n    <priority>0.6</priority>\n  </url>`),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
}
