$ErrorActionPreference = 'Stop'
$path = 'c:\Users\IONBEE\Desktop\Yeni klasör\server.js'

$content = @'
import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML/CSS/Images)
app.use(express.static(__dirname));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Contact endpoint (JSON)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, topic, phone, message } = req.body || {};
    if (!name || !email || !message || !topic) {
      return res.status(400).json({ ok: false, error: 'Lütfen gerekli alanları doldurun.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const to = process.env.MAIL_TO || 'kadirveral55@gmail.com';
    const subject = `[Site İletişim] ${topic} - ${name}`;
    const text = `Yeni iletişim formu mesajı\n\n` +
      `Ad Soyad: ${name}\n` +
      `E-posta: ${email}\n` +
      `Telefon: ${phone || '-'}\n` +
      `Konu: ${topic}\n\n` +
      `Mesaj:\n${message}\n`;
    const html = `
      <h2>Yeni iletişim formu mesajı</h2>
      <p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(phone || '-')}</p>
      <p><strong>Konu:</strong> ${escapeHtml(topic)}</p>
      <p><strong>Mesaj:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>
    `;

    await transporter.sendMail({
      from: `Site Formu <${process.env.SMTP_USER}>`,
      to,
      replyTo: email,
      subject,
      text,
      html,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ ok: false, error: 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
  }
});

// HTML form fallback (redirect UX)
app.post('/form.html', async (req, res) => {
  try {
    const { name, email, topic, phone, message } = req.body || {};
    if (!name || !email || !message || !topic) {
      return res.redirect(303, '/form.html#error=missing');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const to = process.env.MAIL_TO || 'kadirveral55@gmail.com';
    const subject = `[Site İletişim] ${topic} - ${name}`;
    const text = `Yeni iletişim formu mesajı\n\n` +
      `Ad Soyad: ${name}\n` +
      `E-posta: ${email}\n` +
      `Telefon: ${phone || '-'}\n` +
      `Konu: ${topic}\n\n` +
      `Mesaj:\n${message}\n`;
    const html = `
      <h2>Yeni iletişim formu mesajı</h2>
      <p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(phone || '-')}</p>
      <p><strong>Konu:</strong> ${escapeHtml(topic)}</p>
      <p><strong>Mesaj:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>
    `;

    await transporter.sendMail({
      from: `Site Formu <${process.env.SMTP_USER}>`,
      to,
      replyTo: email,
      subject,
      text,
      html,
    });

    return res.redirect(303, '/form.html#sent');
  } catch (err) {
    console.error('Email error:', err);
    return res.redirect(303, '/form.html#error=server');
  }
});

// Fallback to index.html for root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
'@

[System.IO.File]::WriteAllText($path, $content, New-Object System.Text.UTF8Encoding($false))
Write-Host 'server.js replaced with clean routes.'
