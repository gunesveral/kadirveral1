$ErrorActionPreference = 'Stop'
$path = 'c:\Users\IONBEE\Desktop\Yeni klasör\form.html'

# Load file
$content = Get-Content -Raw -Encoding UTF8 $path

# 1) Exact replace for form id
$oldForm = '<form class="form-card" action="#" method="post" novalidate>'
$newForm = '<form class="form-card" id="contactForm" action="#" method="post" novalidate>'
if ($content.Contains($oldForm)) {
  $content = $content.Replace($oldForm, $newForm)
}

# 2) Exact replace for submit button id
$oldBtn = '<button type="submit" class="btn primary">Gönder</button>'
$newBtn = '<button type="submit" class="btn primary" id="submitBtn">Gönder</button>'
if ($content.Contains($oldBtn)) {
  $content = $content.Replace($oldBtn, $newBtn)
}

# 3) Insert formStatus before closing </form> (first form only)
if (-not ($content -match 'id="formStatus"')) {
  $content = [regex]::Replace($content, '(?s)</div>\s*\r?\n\s*</form>', "</div>`r`n                <div id=\"formStatus\" style=\"margin-top:10px;font-size:0.9rem;\"></div>`r`n            </form>", 1)
}

# 4) Inject JS handler before first </script>
$marker = 'Form submit -> POST /api/contact'
if (-not ($content -like "*${marker}*")) {
  $inject = @'
        // Form submit -> POST /api/contact
        const form = document.getElementById("contactForm");
        const statusEl = document.getElementById("formStatus");
        const submitBtn = document.getElementById("submitBtn");
        if (form) {
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            statusEl.textContent = "";
            submitBtn.disabled = true;
            submitBtn.textContent = "Gönderiliyor...";
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            try {
              const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || data.ok === false) throw new Error(data.error || "Gönderim başarısız.");
              statusEl.style.color = "#2e7d32";
              statusEl.textContent = "Mesajınız başarıyla gönderildi. Teşekkürler!";
              form.reset();
            } catch (err) {
              statusEl.style.color = "#b00020";
              statusEl.textContent = err.message || "Mesaj gönderilemedi. Lütfen tekrar deneyin.";
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = "Gönder";
            }
          });
        }
'@
  $content = [regex]::Replace($content, '</script>', $inject + "`r`n    </script>", 1)
}

[System.IO.File]::WriteAllText($path, $content, New-Object System.Text.UTF8Encoding($false))
Write-Host 'Patched form.html (exact replacements).' 
