# Email Kurulum Rehberi

## Gmail ile Email Gönderimi

### 1. Gmail App Password Oluşturma

1. Google hesabınıza giriş yapın
2. https://myaccount.google.com/apppasswords adresine gidin
3. "Uygulama" seçin → "Mail" seçin
4. "Cihaz" seçin → "Diğer (Özel ad)" yazın ve bir isim verin (örn: "Kadir Veral Web Sitesi")
5. "Oluştur" butonuna tıklayın
6. 16 haneli şifreyi kopyalayın (boşluksuz)

### 2. .env Dosyası Oluşturma

Proje kök dizininde `.env` dosyası oluşturun:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password
MAIL_TO=veralkadir55@gmail.com
PORT=3000
```

**Önemli:**
- `SMTP_USER`: Gmail adresiniz (örn: sizin@gmail.com)
- `SMTP_PASS`: Oluşturduğunuz 16 haneli App Password (boşluksuz)
- `MAIL_TO`: Form mesajlarının gönderileceği adres (veralkadir55@gmail.com)

### 3. Server'ı Başlatma

```bash
npm install
npm start
```

### 4. Test Etme

1. Tarayıcıda `http://localhost:3000/form.html` adresini açın
2. Formu doldurup gönderin
3. `veralkadir55@gmail.com` adresine mail gelip gelmediğini kontrol edin

## Sorun Giderme

### "Email kimlik doğrulama hatası" alıyorsanız:
- App Password'ün doğru kopyalandığından emin olun (boşluksuz)
- Gmail hesabınızda 2FA (İki Faktörlü Doğrulama) açık olmalı

### "Email sunucusuna bağlanılamadı" alıyorsanız:
- SMTP_HOST ve SMTP_PORT değerlerini kontrol edin
- Firewall veya antivirüs programı SMTP bağlantısını engelliyor olabilir

### "Geçersiz email giriş bilgileri" alıyorsanız:
- Normal Gmail şifrenizi değil, App Password kullanmalısınız
- App Password'ü yeniden oluşturmayı deneyin

## Alternatif Email Servisleri

Gmail yerine başka bir email servisi kullanmak isterseniz:

### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Custom SMTP:
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465
SMTP_SECURE=true
```











