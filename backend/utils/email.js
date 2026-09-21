import nodemailer from 'nodemailer';

// Uses real SMTP when configured via env (SMTP_HOST/PORT/USER/PASS),
// otherwise logs emails to the console so flows remain testable in dev.
const smtpConfigured = !!process.env.SMTP_HOST;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Nine Secrets <no-reply@ninesecrets.com>',
      to,
      subject,
      text,
      html,
    });
    if (!smtpConfigured) {
      console.log(`[email:dev] To: ${to} | Subject: ${subject}`);
    }
    return info;
  } catch (err) {
    // Email failures must never break the main flow (orders, resets still succeed).
    console.error('Email send failed:', err.message);
    return null;
  }
};

export const orderConfirmationEmail = (order) => ({
  subject: `Order confirmed — ${order.orderNumber}`,
  html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="font-style:italic">Thank you for your order!</h2>
      <p>Your order <b>${order.orderNumber}</b> has been placed.</p>
      <table width="100%" style="border-collapse:collapse">
        ${order.items.map((i) => `<tr><td style="padding:6px 0">${i.name} × ${i.quantity}</td><td align="right">₹${i.price * i.quantity}</td></tr>`).join('')}
        <tr><td style="padding:6px 0;border-top:1px solid #E4D8C8">Subtotal</td><td align="right" style="border-top:1px solid #E4D8C8">₹${order.subtotal}</td></tr>
        ${order.coupon?.discount ? `<tr><td>Discount (${order.coupon.code})</td><td align="right">−₹${order.coupon.discount}</td></tr>` : ''}
        <tr><td>Tax</td><td align="right">₹${order.tax}</td></tr>
        <tr><td>Shipping</td><td align="right">₹${order.shippingFee}</td></tr>
        <tr><td style="font-weight:bold">Total</td><td align="right" style="font-weight:bold">₹${order.total}</td></tr>
      </table>
      <p style="color:#8a7070;font-size:13px">Nine Secrets — we love your style</p>
    </div>`,
});

export const abandonedCartEmail = (cart) => {
  const cartUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/cart`;
  return {
    subject: 'You left something behind…',
    html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="font-style:italic">Still thinking it over?</h2>
      <p>Your cart is waiting — here's what's in it:</p>
      <table width="100%" style="border-collapse:collapse">
        ${cart.items.map((i) => `<tr><td style="padding:6px 0">${i.product?.name || 'Item'} × ${i.quantity}</td><td align="right">₹${i.price * i.quantity}</td></tr>`).join('')}
        <tr><td style="padding-top:10px;font-weight:bold;border-top:1px solid #E4D8C8">Total</td><td align="right" style="padding-top:10px;font-weight:bold;border-top:1px solid #E4D8C8">₹${cart.total}</td></tr>
      </table>
      <p><a href="${cartUrl}" style="background:#201820;color:#F3ECE3;padding:12px 24px;border-radius:50px;text-decoration:none;display:inline-block;margin-top:12px">Complete Your Order</a></p>
      <p style="color:#8a7070;font-size:13px">Nine Secrets — we love your style</p>
    </div>`,
  };
};

export const passwordResetEmail = (resetUrl) => ({
  subject: 'Reset your Nine Secrets password',
  html: `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="font-style:italic">Password reset</h2>
      <p>Click the link below to set a new password. It expires in 30 minutes.</p>
      <p><a href="${resetUrl}" style="background:#201820;color:#F3ECE3;padding:12px 24px;border-radius:50px;text-decoration:none">Reset Password</a></p>
      <p style="color:#8a7070;font-size:13px">If you didn't request this, you can ignore this email.</p>
    </div>`,
});
