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

// CORS middleware (if needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Contact endpoint (JSON API)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, topic, phone, message } = req.body || {};

    if (!name || !email || !message || !topic) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Lütfen gerekli alanları doldurun.' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Geçerli bir e-posta adresi giriniz.' 
      });
    }

    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env file');
      return res.status(500).json({ 
        ok: false, 
        error: 'Email servisi yapılandırılmamış. Lütfen .env dosyasını kontrol edin.' 
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return res.status(500).json({ 
        ok: false, 
        error: 'Email servisi doğrulanamadı. SMTP ayarlarınızı kontrol edin.' 
      });
    }

    // Compose mail
    const to = process.env.MAIL_TO || 'veralkadir55@gmail.com';
    const subject = `[Site İletişim] ${topic} - ${name}`;
    const text = `Yeni iletişim formu mesajı\n\n` +
      `Ad Soyad: ${name}\n` +
      `E-posta: ${email}\n` +
      `Telefon: ${phone || 'Belirtilmemiş'}\n` +
      `Konu: ${topic}\n\n` +
      `Mesaj:\n${message}\n`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d4a574, #b8936a); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #d4a574; }
          .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #d4a574; }
          .message-box { background: white; padding: 15px; border-radius: 4px; border-left: 3px solid #d4a574; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Yeni İletişim Formu Mesajı</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Ad Soyad:</div>
              <div class="value">${escapeHtml(name)}</div>
            </div>
            <div class="field">
              <div class="label">E-posta:</div>
              <div class="value">${escapeHtml(email)}</div>
            </div>
            <div class="field">
              <div class="label">Telefon:</div>
              <div class="value">${escapeHtml(phone || 'Belirtilmemiş')}</div>
            </div>
            <div class="field">
              <div class="label">Konu:</div>
              <div class="value">${escapeHtml(topic)}</div>
            </div>
            <div class="field">
              <div class="label">Mesaj:</div>
              <div class="message-box">${escapeHtml(message)}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `Kadir Veral Web Sitesi <${process.env.SMTP_USER || 'noreply@kadirveral.com'}>`,
      to,
      replyTo: email,
      subject,
      text,
      html,
    });

    // Bilgilendirme e-postası: gönderene “Mesajınız alındı” bildirimi
    const acknowledgementSubject = 'Mesajınız alındı - Kadir Veral';
    const acknowledgementText = `Merhaba ${name},

Mesajınız başarıyla alındı. Konu: ${topic}

En kısa sürede dönüş yapacağız.

Sevgiler,
Kadir Veral Ekibi`;

    const acknowledgementHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f1f1f; background: #f8f8f8; padding: 0; margin: 0; }
          .wrapper { max-width: 640px; margin: 0 auto; padding: 32px 20px; }
          .card { background: #ffffff; border-radius: 14px; padding: 28px; box-shadow: 0 10px 35px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
          .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; background: #eef2ff; color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
          .title { margin: 18px 0 10px; font-size: 24px; font-weight: 700; color: #111827; }
          .meta { color: #6b7280; font-size: 14px; margin-bottom: 18px; }
          .section { margin: 18px 0; }
          .label { font-weight: 700; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
          .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; color: #1f2937; white-space: pre-wrap; }
          .footer { margin-top: 24px; color: #6b7280; font-size: 13px; line-height: 1.6; }
          .accent { color: #b45309; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="badge">Kadir Veral · Mesaj Alındı</div>
            <div class="title">Mesajınız bize ulaştı</div>
            <div class="meta">Konu: <span class="accent">${escapeHtml(topic)}</span></div>

            <div class="section">
              <div class="label">Ad Soyad</div>
              <div class="box">${escapeHtml(name)}</div>
            </div>

            <div class="section">
              <div class="label">Mesaj</div>
              <div class="box">${escapeHtml(message)}</div>
            </div>

            <div class="footer">
              Bu bir bilgilendirme mesajıdır. En kısa sürede dönüş yapacağız.<br />
              Eğer bu talebi siz oluşturmadıysanız bu e-postayı dikkate almayın.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `Kadir Veral Web Sitesi <${process.env.SMTP_USER || 'noreply@kadirveral.com'}>`,
        to: email,
        subject: acknowledgementSubject,
        text: acknowledgementText,
        html: acknowledgementHtml,
      });
    } catch (ackErr) {
      console.warn('Acknowledgement email could not be sent:', ackErr);
    }

    return res.json({ ok: true, message: 'Mesajınız başarıyla gönderildi!' });
  } catch (err) {
    console.error('Email error:', err);
    
    // More detailed error messages
    let errorMessage = 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.';
    
    if (err.code === 'EAUTH') {
      errorMessage = 'Email kimlik doğrulama hatası. SMTP kullanıcı adı ve şifresini kontrol edin.';
    } else if (err.code === 'ECONNECTION') {
      errorMessage = 'Email sunucusuna bağlanılamadı. SMTP_HOST ve SMTP_PORT ayarlarını kontrol edin.';
    } else if (err.message && err.message.includes('Invalid login')) {
      errorMessage = 'Geçersiz email giriş bilgileri. Gmail için App Password kullanmanız gerekiyor.';
    } else if (err.message) {
      errorMessage = `Email hatası: ${err.message}`;
    }
    
    return res.status(500).json({ 
      ok: false, 
      error: errorMessage 
    });
  }
});

// HTML form fallback (for traditional form submission)
app.post('/form.html', async (req, res) => {
  try {
    const { name, email, topic, phone, message } = req.body || {};
    
    if (!name || !email || !message || !topic) {
      return res.redirect(303, '/form.html?error=missing');
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const to = process.env.MAIL_TO || 'veralkadir55@gmail.com';
    const subject = `[Site İletişim] ${topic} - ${name}`;
    const text = `Yeni iletişim formu mesajı\n\n` +
      `Ad Soyad: ${name}\n` +
      `E-posta: ${email}\n` +
      `Telefon: ${phone || 'Belirtilmemiş'}\n` +
      `Konu: ${topic}\n\n` +
      `Mesaj:\n${message}\n`;

    const html = `
      <h2>Yeni iletişim formu mesajı</h2>
      <p><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(phone || 'Belirtilmemiş')}</p>
      <p><strong>Konu:</strong> ${escapeHtml(topic)}</p>
      <p><strong>Mesaj:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>
    `;

    await transporter.sendMail({
      from: `Kadir Veral Web Sitesi <${process.env.SMTP_USER || 'noreply@kadirveral.com'}>`,
      to,
      replyTo: email,
      subject,
      text,
      html,
    });

    return res.redirect(303, '/form.html?success=true');
  } catch (err) {
    console.error('Email error:', err);
    return res.redirect(303, '/form.html?error=server');
  }
});

// Fallback to index.html for root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Contact form endpoint: http://localhost:${PORT}/api/contact`);
});

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
