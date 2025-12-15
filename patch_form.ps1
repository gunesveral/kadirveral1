$ErrorActionPreference = 'Stop'
$path = 'c:\Users\IONBEE\Desktop\Yeni klasör\form.html'

# Read file
$content = Get-Content -Raw -Encoding UTF8 $path

# 1) Add id="contactForm" to the form if missing
if ($content -notmatch 'id="contactForm"') {
  $content = [regex]::Replace(
    $content,
    '<form\s+class="form-card"([^>]*)>',
    '<form class="form-card" id="contactForm"$1>',
    1,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
}

# 2) Add id="submitBtn" to submit button if missing
if ($content -notmatch 'id="submitBtn"') {
  $content = [regex]::Replace(
    $content,
    '(<button\s+type="submit"[^>]*class="btn\s+primary"[^>]*)(>)',
    '$1 id="submitBtn"$2',
    1,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
}

# 3) Add #formStatus div before closing </form> if missing
if ($content -notmatch 'id="formStatus"') {
  $statusBlock = "`n                <div id=\"formStatus\" style=\"margin-top:10px;font-size:0.9rem;\"></div>" + "`n            "
  $content = [regex]::Replace(
    $content,
    '</form>',
    $statusBlock + '</form>',
    1,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
}

# 4) Inject JS fetch handler before first </script> if not present
$marker = 'POST /api/contact'
if ($content -notmatch [regex]::Escape($marker)) {
  $inj = @"
        // Form submit -> POST /api/contact
        const form = document.getElementById('contactForm');
        const statusEl = document.getElementById('formStatus');
        const submitBtn = document.getElementById('submitBtn');
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            statusEl.textContent = '';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Gönderiliyor...';
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            try {
              const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || data.ok === false) throw new Error(data.error || 'Gönderim başarısız.');
              statusEl.style.color = '#2e7d32';
              statusEl.textContent = 'Mesajınız başarıyla gönderildi. Teşekkürler!';
              form.reset();
            } catch (err) {
              statusEl.style.color = '#b00020';
              statusEl.textContent = err.message || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.';
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Gönder';
            }
          });
        }
"@
  $content = [regex]::Replace(
    $content,
    '</script>',
    $inj + "`r`n    </script>",
    1,
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
}

[System.IO.File]::WriteAllText($path, $content, New-Object System.Text.UTF8Encoding($false))
Write-Host 'Patched form.html successfully.'
