$ErrorActionPreference = 'Stop'
$path = 'c:\Users\IONBEE\Desktop\Yeni klasör\form.html'
$content = Get-Content -Raw -Encoding UTF8 $path
# Normalize first occurrence of form action to /api/contact
$content = [regex]::Replace($content, '(?is)(<form\s+class="form-card"[^>]*\saction=")([^"]*)("[^>]*>)', '$1/api/contact$3', 1)
[System.IO.File]::WriteAllText($path, $content, New-Object System.Text.UTF8Encoding($false))
Write-Host 'Updated form action to /api/contact.'
