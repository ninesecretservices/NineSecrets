import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '../public/assets/logo.png');

// Matches the storefront's actual brand tokens (see frontend/src/index.css) —
// the old values here (#201820 / #8a7070) predated the pastel-green-on-cream
// rebrand and never got updated, so the PDF looked like a different business.
const INK = '#3F5347';
const MAUVE = '#7E8A7B';
const BEIGE = '#E4D8C8';
const CREAM = '#F3ECE3';
const PASTEL_GREEN = '#C3DCC0';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

// Renders a tax-invoice-style PDF for one order and resolves to a Buffer.
// Kept dependency-free beyond pdfkit — no headless browser, no HTML step —
// so it stays cheap to run per-request rather than needing a queue/cache.
export function generateInvoicePdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const marginX = 50;
    const contentWidth = pageWidth - marginX * 2;

    // Header band — brand ink background, logo + wordmark, matches the
    // site's header treatment instead of sitting on plain white.
    doc.rect(0, 0, pageWidth, 110).fill(INK);
    try {
      doc.image(LOGO_PATH, marginX, 28, { width: 54, height: 54 });
    } catch {
      // Logo missing in this environment — degrade gracefully, still a valid invoice.
    }
    doc.font('Helvetica-Bold').fontSize(20).fillColor(CREAM).text('NINE SECRETS', marginX + 68, 36);
    doc.font('Helvetica').fontSize(9).fillColor(PASTEL_GREEN).text('WE LOVE YOUR STYLE', marginX + 68, 60, { characterSpacing: 1 });

    doc.font('Helvetica-Bold').fontSize(14).fillColor(CREAM).text('TAX INVOICE', marginX, 36, { width: contentWidth, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(PASTEL_GREEN).text(`Order ${order.orderNumber}`, marginX, 58, { width: contentWidth, align: 'right' });
    doc.text(
      new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      marginX, 72, { width: contentWidth, align: 'right' },
    );

    doc.y = 140;

    const addr = order.shippingAddress || {};
    const billTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MAUVE).text('BILL TO', marginX, billTop, { characterSpacing: 0.5 });
    doc.font('Helvetica').fontSize(10).fillColor(INK);
    doc.text(addr.fullName || order.user?.name || '-', marginX, billTop + 16);
    doc.text(addr.addressLine1 || '', marginX);
    if (addr.addressLine2) doc.text(addr.addressLine2, marginX);
    doc.text(`${addr.city || ''}${addr.city ? ', ' : ''}${addr.state || ''} ${addr.postalCode || ''}`.trim(), marginX);
    doc.text(addr.country || '', marginX);
    if (addr.phone) doc.text(addr.phone, marginX);

    const paymentX = marginX + 300;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MAUVE).text('PAYMENT', paymentX, billTop, { characterSpacing: 0.5 });
    doc.font('Helvetica').fontSize(10).fillColor(INK);
    doc.text(order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card / UPI', paymentX, billTop + 16);
    doc.text(`Status: ${order.paymentStatus}`, paymentX);

    doc.y = Math.max(doc.y, billTop + 110);
    doc.strokeColor(BEIGE).lineWidth(1).moveTo(marginX, doc.y).lineTo(pageWidth - marginX, doc.y).stroke();
    doc.moveDown(1.2);

    // Line items table
    const tableTop = doc.y;
    const col = { item: marginX, sku: marginX + 250, qty: marginX + 330, price: marginX + 380, amount: marginX + 445 };

    doc.rect(marginX, tableTop - 6, contentWidth, 22).fill(CREAM);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MAUVE);
    doc.text('ITEM', col.item + 8, tableTop, { characterSpacing: 0.5 });
    doc.text('SKU', col.sku, tableTop, { characterSpacing: 0.5 });
    doc.text('QTY', col.qty, tableTop, { characterSpacing: 0.5 });
    doc.text('PRICE', col.price, tableTop, { characterSpacing: 0.5 });
    doc.text('AMOUNT', col.amount, tableTop, { characterSpacing: 0.5, width: 95 - 8, align: 'right' });
    doc.y = tableTop + 22;

    doc.font('Helvetica').fontSize(10).fillColor(INK);
    for (const item of order.items) {
      const rowY = doc.y;
      doc.text(item.name, col.item + 8, rowY, { width: 235 });
      doc.text(item.variant?.sku || '-', col.sku, rowY, { width: 75 });
      doc.text(String(item.quantity), col.qty, rowY, { width: 45 });
      doc.text(money(item.price), col.price, rowY, { width: 60 });
      doc.text(money(item.price * item.quantity), col.amount, rowY, { width: 95 - 8, align: 'right' });
      doc.moveDown(1);
      doc.strokeColor(BEIGE).lineWidth(0.5).moveTo(marginX, doc.y - 4).lineTo(pageWidth - marginX, doc.y - 4).stroke();
    }

    doc.moveDown(0.5);

    const totalsX = marginX + contentWidth - 220;
    const addTotalRow = (label, value, bold = false) => {
      const rowY = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10).fillColor(INK);
      doc.text(label, totalsX, rowY, { width: 135 });
      doc.text(value, totalsX + 135, rowY, { width: 85, align: 'right' });
      doc.y = Math.max(doc.y, rowY + (bold ? 18 : 15));
    };

    addTotalRow('Subtotal', money(order.subtotal));
    if (order.coupon?.discount) addTotalRow(`Discount (${order.coupon.code})`, `-${money(order.coupon.discount)}`);
    addTotalRow('Tax', money(order.tax));
    addTotalRow('Shipping', order.shippingFee ? money(order.shippingFee) : 'Free');
    doc.moveDown(0.2);
    doc.strokeColor(PASTEL_GREEN).lineWidth(1.5).moveTo(totalsX, doc.y).lineTo(pageWidth - marginX, doc.y).stroke();
    doc.moveDown(0.3);
    addTotalRow('Total', money(order.total), true);

    // Footer band, anchored to the bottom of the page rather than flowing
    // with content, so it reads as a page footer regardless of item count.
    const footerY = doc.page.height - 70;
    doc.rect(0, footerY, pageWidth, 70).fill(INK);
    doc.font('Helvetica').fontSize(9).fillColor(PASTEL_GREEN).text(
      'Thank you for shopping with Nine Secrets.',
      marginX, footerY + 22, { width: contentWidth, align: 'center' },
    );
    doc.font('Helvetica').fontSize(8).fillColor(CREAM).text(
      'ninesecrets.in',
      marginX, footerY + 40, { width: contentWidth, align: 'center' },
    );

    doc.end();
  });
}
