$ErrorActionPreference = 'Stop'
$path = 'c:\Users\IONBEE\Desktop\Yeni klasör\form.html'
$content = Get-Content -Raw -Encoding UTF8 $path

# Replace action="#" with action="/api/contact" on the first form with class="form-card"
$content = [regex]::Replace(
  $content,
  '(?is)<form\s+class="form-card"\s+action="#"(\s+method="post")?(\s+novalidate)?',
  { param($m)
    $suffix = ''
    if ($m.Groups[1].Value -ne '') { $suffix += $m.Groups[1].Value }
    if ($m.Groups[2].Value -ne '') { $suffix += $m.Groups[2].Value }
    return '<form class="form-card" action="/api/contact"' + $suffix
  },
  1
)

[System.IO.File]::WriteAllText($path, $content, New-Object System.Text.UTF8Encoding($false))
Write-Host 'Updated form action to /api/contact.'
