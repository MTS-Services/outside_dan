/**
 * Email service (Nodemailer + SMTP).
 * If SMTP env vars are missing, calls become no-ops (logged) — never throws.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');
const prisma = require('../config/prisma');

async function loadSettings() {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: ['restaurant_address', 'restaurant_phone', 'restaurant_name'] } },
    });
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  } catch { return {}; }
}

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

function isConfigured() {
  return Boolean(config.smtp.host);
}

async function send({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t || !to) {
    // eslint-disable-next-line no-console
    console.log('[email] skipped (no SMTP or no recipient):', subject);
    return { skipped: true };
  }
  // Attach logo as CID inline image so it works regardless of the server's public URL
  const attachments = [];
  const logoPath = resolveLogoPath();
  if (logoPath) {
    attachments.push({ filename: 'logo.png', path: logoPath, cid: 'email-logo' });
  }
  try {
    const info = await t.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
      attachments,
    });
    return { messageId: info.messageId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[email] send failed:', err.message);
    return { error: err.message };
  }
}

// --- Templates (German) ----------------------------------------------------

function fmt(n) { return Number(n).toFixed(2); }

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveLogoPath() {
  return [
    path.join(__dirname, '../../public/logo.png'),
    path.join(__dirname, '../../uploads/logo.png'),
  ].find((p) => fs.existsSync(p)) || null;
}

function shellHTML({ title, preheader, content, settings = {}, hasLogo = false }) {
  const name = settings.restaurant_name || config.restaurant.name || 'Tarantella';
  const address = settings.restaurant_address || config.restaurant.address || '';
  const phone = settings.restaurant_phone || config.restaurant.phone || '';
  const footer = [name, address, phone].filter(Boolean).join(' · ');
  const logoBlock = hasLogo
    ? `<img src="cid:email-logo" alt="${name}" style="height:52px;width:auto;display:block;margin:0 auto;" />`
    : `<div style="font-family:'Bebas Neue',Impact,sans-serif;font-size:28px;letter-spacing:3px;color:#D9AF47;">${name}</div>`;
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#050505;font-family:Inter,Arial,sans-serif;color:#fff;">
<span style="display:none;font-size:0;">${preheader || ''}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;">
      <tr><td align="center" style="padding:16px 28px;background:#000;border-bottom:3px solid #D9AF47;">
        ${logoBlock}
      </td></tr>
      <tr><td style="padding:28px;color:#fff;line-height:1.6;font-size:15px;">
        ${content}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid rgba(255,255,255,0.05);font-size:12px;color:rgba(255,255,255,0.4);">
        ${footer}
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function itemsTable(order) {
  const rows = order.items.map((it) => {
    const extras = (it.extras || []).map((e) => `+ ${e.name} (€ ${fmt(e.price)})`).join('<br>');
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-weight:600;">${it.quantity}× ${it.name}</div>
        ${extras ? `<div style="color:rgba(255,255,255,0.55);font-size:13px;">${extras}</div>` : ''}
        ${it.notes ? `<div style="color:#D9AF47;font-size:13px;font-style:italic;">${it.notes}</div>` : ''}
      </td>
      <td align="right" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-weight:600;">€ ${fmt(Number(it.price) * it.quantity)}</td>
    </tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
    ${rows}
    <tr><td style="padding:10px 0;color:rgba(255,255,255,0.6);">Zwischensumme</td><td align="right" style="padding:10px 0;">€ ${fmt(order.subtotal)}</td></tr>
    <tr><td style="padding:4px 0;color:rgba(255,255,255,0.6);">Lieferung</td><td align="right" style="padding:4px 0;">€ ${fmt(order.deliveryFee)}</td></tr>
    ${Number(order.discount || 0) > 0 ? `<tr><td style="padding:4px 0;color:rgba(255,255,255,0.6);">Gutschein${order.couponCode ? ` (${order.couponCode})` : ''}</td><td align="right" style="padding:4px 0;color:#6ee7b7;">-€ ${fmt(Number(order.discount))}</td></tr>` : ''}
    <tr><td style="padding:10px 0;border-top:2px solid #D9AF47;font-weight:700;font-size:18px;">Gesamt</td>
        <td align="right" style="padding:10px 0;border-top:2px solid #D9AF47;font-weight:700;font-size:18px;color:#D9AF47;">€ ${fmt(order.total)}</td></tr>
  </table>`;
}

async function orderAcceptedHTML(order) {
  const settings = await loadSettings();
  const hasLogo = Boolean(resolveLogoPath());
  const note = order.acceptanceNote
    ? `<div style="margin:18px 0;padding:14px 16px;background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.3);border-radius:10px;color:#6ee7b7;">
        <strong>Hinweis vom Koch:</strong> ${order.acceptanceNote}</div>`
    : '';
  return shellHTML({
    title: 'Bestellung angenommen',
    preheader: `Bestellung ${order.orderNumber} angenommen`,
    content: `
      <h1 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:36px;letter-spacing:2px;margin:0 0 6px;color:#D9AF47;">BESTELLUNG ANGENOMMEN</h1>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 6px;">Hallo ${order.customerName},</p>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 14px;">Ihre Bestellung <strong style="color:#D9AF47;">${order.orderNumber}</strong> wurde angenommen und wird gerade zubereitet.</p>
      ${note}
      ${itemsTable(order)}
      <div style="margin-top:18px;padding:14px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:13px;color:rgba(255,255,255,0.7);">
        <div><strong>Lieferadresse:</strong> ${order.street}, ${order.postalCode} ${order.city}</div>
        <div><strong>Telefon:</strong> ${order.customerPhone}</div>
        <div><strong>Zahlung:</strong> ${prettyPayment(order.paymentMethod)} · ${order.paymentStatus === 'PAID' ? 'bezahlt' : 'ausstehend'}</div>
      </div>
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:18px;">Vielen Dank — wir geben unser Bestes!</p>`,
    settings,
    hasLogo,
  });
}

async function orderDeclinedHTML(order) {
  const settings = await loadSettings();
  const hasLogo = Boolean(resolveLogoPath());
  return shellHTML({
    title: 'Bestellung abgelehnt',
    preheader: `Bestellung ${order.orderNumber} abgelehnt`,
    content: `
      <h1 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:32px;letter-spacing:2px;margin:0 0 6px;color:#CD212A;">BESTELLUNG ABGELEHNT</h1>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 14px;">Hallo ${order.customerName},</p>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 14px;">Leider mussten wir Ihre Bestellung <strong>${order.orderNumber}</strong> ablehnen.</p>
      ${order.declinedReason ? `<div style="margin:14px 0;padding:14px 16px;background:rgba(205,33,42,0.10);border:1px solid rgba(205,33,42,0.3);border-radius:10px;color:#fca5a5;"><strong>Grund:</strong> ${order.declinedReason}</div>` : ''}
      <p style="color:rgba(255,255,255,0.7);">Sie können Ihre Bestellung in Ihrem Konto bearbeiten und erneut absenden.</p>
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:18px;">Bei Fragen erreichen Sie uns unter ${settings.restaurant_phone || config.restaurant.phone || ''}.</p>`,
    settings,
    hasLogo,
  });
}

function prettyPayment(m) {
  return ({
    CASH: 'Bar bei Lieferung',
    CARD_ON_DELIVERY: 'Karte bei Lieferung',
    PAYPAL: 'PayPal',
    ONLINE: 'Online',
  })[m] || m;
}

async function sendOrderAccepted(order) {
  if (!order?.customerEmail) return;
  return send({
    to: order.customerEmail,
    subject: `Bestellung ${order.orderNumber} angenommen`,
    html: await orderAcceptedHTML(order),
  });
}

async function sendOrderDeclined(order) {
  if (!order?.customerEmail) return;
  return send({
    to: order.customerEmail,
    subject: `Bestellung ${order.orderNumber} abgelehnt`,
    html: await orderDeclinedHTML(order),
  });
}

async function newOrderAdminHTML(order, driveInfo = null) {
  const settings = await loadSettings();
  const hasLogo = Boolean(resolveLogoPath());
  const name = settings.restaurant_name || config.restaurant.name || 'Tarantella';
  const driveBlock = driveInfo?.minutes != null
    ? `<div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;font-size:13px;${
        driveInfo.tooFar
          ? 'background:rgba(205,33,42,0.12);border:1px solid rgba(205,33,42,0.35);color:#fca5a5;'
          : 'background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.25);color:#6ee7b7;'
      }">
        <strong>Fahrzeit vom Restaurant:</strong> ca. ${driveInfo.minutes} Min. (${driveInfo.distanceKm} km)
        ${driveInfo.approximate ? '<br><em>Ungenaue Schätzung – bitte Route in Google Maps prüfen.</em>' : ''}
        ${driveInfo.tooFar ? `<br><strong>Achtung:</strong> über dem Limit von ${driveInfo.maxMinutes} Min. — evtl. außerhalb der Lieferzone.` : ''}
        ${driveInfo.mapsUrl ? `<br><a href="${driveInfo.mapsUrl}" style="color:#D9AF47;">Route in Google Maps öffnen</a>` : ''}
      </div>`
    : (driveInfo?.error
      ? `<div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;font-size:13px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);">Fahrzeit: ${driveInfo.error}</div>`
      : '');
  return shellHTML({
    title: 'Neue Bestellung eingegangen',
    preheader: `Neue Bestellung ${order.orderNumber} von ${order.customerName}`,
    content: `
      <h1 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:36px;letter-spacing:2px;margin:0 0 6px;color:#D9AF47;">NEUE BESTELLUNG</h1>
      <p style="color:rgba(255,255,255,0.7);margin:0 0 14px;">Bestellnummer: <strong style="color:#D9AF47;">${order.orderNumber}</strong></p>
      <div style="margin-bottom:16px;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:rgba(255,255,255,0.85);">
        <div style="margin-bottom:6px;"><strong>Kunde:</strong> ${order.customerName}</div>
        <div style="margin-bottom:6px;"><strong>Telefon:</strong> ${order.customerPhone || '—'}</div>
        <div style="margin-bottom:6px;"><strong>E-Mail:</strong> ${order.customerEmail || '—'}</div>
        <div style="margin-bottom:6px;"><strong>Adresse:</strong> ${order.street}, ${order.postalCode} ${order.city}</div>
        <div style="margin-bottom:6px;"><strong>Zahlung:</strong> ${prettyPayment(order.paymentMethod)}</div>
        ${order.notes ? `<div style="margin-top:6px;color:#D9AF47;"><strong>Notiz:</strong> ${order.notes}</div>` : ''}
      </div>
      ${driveBlock}
      ${itemsTable(order)}
      <div style="margin-top:20px;">
        <a href="${config.clientUrl}/admin/orders" style="display:inline-block;padding:12px 28px;background:#D9AF47;color:#000;font-weight:700;border-radius:8px;text-decoration:none;font-size:15px;">Bestellung öffnen</a>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:18px;">Diese E-Mail wurde automatisch von ${name} gesendet.</p>`,
    settings,
    hasLogo,
  });
}

async function sendNewOrderToAdmin(order, adminEmails) {
  if (!adminEmails || adminEmails.length === 0) return;
  const to = Array.isArray(adminEmails) ? adminEmails.join(', ') : adminEmails;
  let driveInfo = null;
  try {
    const distance = require('./distanceService');
    driveInfo = await distance.getDriveTimeForOrder(order);
  } catch { /* optional */ }
  return send({
    to,
    subject: `Neue Bestellung ${order.orderNumber} – ${order.customerName}`,
    html: await newOrderAdminHTML(order, driveInfo),
  });
}

async function sendTestEmailToAdmin(adminEmail) {
  const settings = await loadSettings();
  const hasLogo = Boolean(resolveLogoPath());
  return send({
    to: adminEmail,
    subject: 'Test-E-Mail',
    html: shellHTML({
      title: 'Test-E-Mail',
      preheader: 'Dies ist eine Test-E-Mail',
      content: `
        <h1 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:36px;letter-spacing:2px;margin:0 0 12px;color:#D9AF47;">TEST-E-MAIL</h1>
        <p style="color:rgba(255,255,255,0.8);">E-Mail-Benachrichtigungen sind korrekt eingerichtet.</p>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:12px;">Du erhältst ab jetzt eine E-Mail für jede neue Bestellung.</p>`,
      settings,
      hasLogo,
    }),
  });
}

async function contactAdminHTML(msg) {
  const settings = await loadSettings();
  const hasLogo = Boolean(resolveLogoPath());
  return shellHTML({
    title: 'Neue Kontaktnachricht',
    preheader: `Neue Nachricht von ${msg.name}`,
    content: `
      <h1 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:36px;letter-spacing:2px;margin:0 0 6px;color:#D9AF47;">NEUE KONTAKTNACHRICHT</h1>
      <div style="margin-bottom:16px;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:rgba(255,255,255,0.85);">
        <div style="margin-bottom:6px;"><strong>Name:</strong> ${msg.name}</div>
        <div style="margin-bottom:6px;"><strong>E-Mail:</strong> ${msg.email}</div>
        <div style="margin-bottom:6px;"><strong>Telefon:</strong> ${msg.phone || '—'}</div>
        <div style="margin-bottom:6px;"><strong>Betreff:</strong> ${msg.subject || '—'}</div>
      </div>
      <div style="padding:14px 16px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:14px;color:rgba(255,255,255,0.85);white-space:pre-wrap;">${msg.message}</div>
      <div style="margin-top:20px;">
        <a href="${config.clientUrl}/admin/messages" style="display:inline-block;padding:12px 28px;background:#D9AF47;color:#000;font-weight:700;border-radius:8px;text-decoration:none;font-size:15px;">Nachricht öffnen</a>
      </div>`,
    settings,
    hasLogo,
  });
}

async function sendContactToAdmin(msg, adminEmails) {
  if (!adminEmails || adminEmails.length === 0) return;
  const to = Array.isArray(adminEmails) ? adminEmails.join(', ') : adminEmails;
  return send({
    to,
    subject: `Kontakt: ${msg.subject || 'Neue Nachricht'} – ${msg.name}`,
    html: await contactAdminHTML(msg),
  });
}

async function contactReplyHTML({ name, message, originalSubject, originalMessage }) {
  const settings = await loadSettings();
  const hasLogo = Boolean(resolveLogoPath());
  const originalBlock = originalMessage
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">
        <p style="color:rgba(255,255,255,0.45);font-size:12px;margin:0 0 8px;">Ihre ursprüngliche Nachricht${originalSubject ? ` (${escapeHtml(originalSubject)})` : ''}:</p>
        <p style="color:rgba(255,255,255,0.6);font-size:13px;white-space:pre-wrap;margin:0;">${escapeHtml(originalMessage)}</p>
      </div>`
    : '';
  return shellHTML({
    title: 'Antwort von Tarantella',
    preheader: 'Antwort auf Ihre Kontaktanfrage',
    content: `
      <h1 style="font-family:'Bebas Neue',Impact,sans-serif;font-size:32px;letter-spacing:2px;margin:0 0 12px;color:#D9AF47;">ANTWORT VON TARANTELLA</h1>
      <p style="color:rgba(255,255,255,0.8);margin:0 0 14px;">Hallo ${escapeHtml(name)},</p>
      <div style="padding:14px 16px;background:rgba(255,255,255,0.04);border-radius:10px;font-size:15px;color:rgba(255,255,255,0.9);white-space:pre-wrap;line-height:1.6;">${escapeHtml(message)}</div>
      ${originalBlock}
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:20px;">Bei weiteren Fragen antworten Sie einfach auf diese E-Mail.</p>`,
    settings,
    hasLogo,
  });
}

async function sendContactReply({ to, name, subject, message, originalSubject, originalMessage }) {
  const html = await contactReplyHTML({ name, message, originalSubject, originalMessage });
  const result = await send({ to, subject, html });
  if (result.error) throw new Error(result.error);
  if (result.skipped) throw new Error('E-Mail ist nicht konfiguriert (SMTP fehlt)');
  return result;
}

module.exports = {
  send, sendOrderAccepted, sendOrderDeclined, sendNewOrderToAdmin, sendTestEmailToAdmin,
  sendContactToAdmin, sendContactReply, isConfigured,
};
