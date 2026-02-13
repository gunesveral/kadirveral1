import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));
// Also expose without /api prefix for Vercel function mount
app.get('/health', (_req, res) => res.json({ ok: true }));

// Contact endpoint (JSON API)
export const contactHandler = async (req, res) => {
  try {
    const { name, email, topic, phone, message, website, form_ts } = req.body || {};

    // Honeypot: bot'lar genelde tüm alanları doldurur, bu alan doluysa spam kabul et
    if (website) {
      console.warn('Spam blocked by honeypot (contactHandler)', { email, topic });
      return res.status(200).json({ ok: true, message: 'Mesajınız başarıyla gönderildi!' });
    }

    // Çok hızlı gönderim kontrolü (basit anti-bot): sayfa açıldıktan <2 sn sonra gelenleri reddet
    const now = Date.now();
    const tsNum = Number(form_ts);
    if (form_ts && Number.isFinite(tsNum) && now - tsNum < 2000) {
      console.warn('Spam blocked by timing (contactHandler)', { email, topic });
      return res.status(200).json({ ok: true, message: 'Mesajınız başarıyla gönderildi!' });
    }

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

    // Bilgilendirme e-postası: gönderene "Mesajınız alındı" bildirimi
    const acknowledgementSubject = 'Mesajınız alındı – Teşekkür ederiz | Kadir Veral';
    const acknowledgementText = `Merhaba ${name},

Bize ulaştığınız için teşekkür ederiz. Mesajınızı aldık ve en kısa sürede dönüş yapacağız.

Konu: ${topic}

Bu e-posta, talebinizin alındığını bildiren otomatik bir mesajdır. Ek bilgi paylaşmak isterseniz bu e-postayı yanıtlayabilirsiniz.

Sevgiler,
Kadir Veral Ekibi`;

    const acknowledgementHtml = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mesajınız Alındı</title>
        <style>
          body{margin:0;padding:0;background:#f6f7fb;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
          .container{max-width:680px;margin:0 auto;padding:28px 16px}
          .brand{display:flex;align-items:center;gap:10px;color:#0b1c3e;font-weight:800;letter-spacing:.06em}
          .brand-mark{width:12px;height:12px;border-radius:3px;background:linear-gradient(135deg,#b83a3a,#d4a574)}
          .card{margin-top:14px;background:#fff;border:1px solid #e8eaf1;border-radius:16px;box-shadow:0 14px 34px rgba(15,23,42,.06)}
          .hero{padding:22px 24px;border-bottom:1px solid #eef2ff;background:linear-gradient(135deg,#ffffff 0%,#fbfcff 60%,#f6fafc 100%);border-top-left-radius:16px;border-top-right-radius:16px}
          .eyebrow{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#eef2ff,#ffeef0);color:#334155;border:1px solid #e5e7eb;padding:6px 10px;border-radius:999px;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
          .title{margin:12px 0 4px;font-size:22px;font-weight:800;color:#0f172a}
          .subtitle{margin:0;color:#475569;font-size:14px}
          .content{padding:22px 24px}
          .p{margin:0 0 12px 0;line-height:1.7}
          .thanks{font-weight:700;color:#0b1c3e}
          .meta{margin-top:16px;display:grid;grid-template-columns:1fr;gap:12px}
          .label{font-size:12px;font-weight:800;letter-spacing:.06em;color:#6b7280;text-transform:uppercase;margin-bottom:6px}
          .box{background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;white-space:pre-wrap}
          .pill{display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:linear-gradient(135deg,#fff5f5,#fff8eb);border:1px solid #fde2e2}
          .pill .label{margin:0;color:#b83a3a}
          .footer{padding:0 24px 22px 24px;color:#64748b;font-size:12px}
          .link{color:#0b1c3e;text-decoration:none;font-weight:700}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand"><span class="brand-mark"></span><span>KADİR VERAL</span></div>
          <div class="card">
            <div class="hero">
              <div class="eyebrow">Mesaj Alındı</div>
              <div class="title">Mesajınız bize ulaştı</div>
              <p class="subtitle">Konu: <strong>${escapeHtml(topic)}</strong></p>
            </div>
            <div class="content">
              <p class="p">Merhaba <strong>${escapeHtml(name)}</strong>,</p>
              <div class="pill"><span class="label">Mesajınız</span><span>${escapeHtml(message)}</span></div>
              <p class="p" style="margin-top:12px">Bize ulaştığınız için <span class="thanks">teşekkür ederiz</span>. Mesajınızı aldık ve en kısa sürede yanıtlayacağız.</p>
              <div class="meta">
                <div>
                  <div class="label">Ad Soyad</div>
                  <div class="box">${escapeHtml(name)}</div>
                </div>
              </div>
              <p class="p" style="margin-top:14px">Ek bilgi paylaşmak isterseniz bu e‑postayı doğrudan yanıtlayabilirsiniz.</p>
            </div>
            <div class="footer">
              Bu e‑posta, talebinizin alındığını bildiren otomatik bir mesajdır.
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
};

// Register for both /api/contact and /contact (Vercel mapping compatibility)
app.post('/api/contact', contactHandler);
app.post('/contact', contactHandler);

// HTML form fallback (for traditional form submission)
export const formHandler = async (req, res) => {
  try {
    const { name, email, topic, phone, message, website, form_ts } = req.body || {};

    // Honeypot kontrolü
    if (website) {
      console.warn('Spam blocked by honeypot (formHandler)', { email, topic });
      return res.redirect(303, '/form.html?success=true');
    }

    // Çok hızlı gönderim kontrolü
    const now = Date.now();
    const tsNum = Number(form_ts);
    if (form_ts && Number.isFinite(tsNum) && now - tsNum < 2000) {
      console.warn('Spam blocked by timing (formHandler)', { email, topic });
      return res.redirect(303, '/form.html?success=true');
    }

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
};

// Register for both /api/form and /form
app.post('/api/form', formHandler);
app.post('/form', formHandler);

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Vercel serverless function export
export default app;

