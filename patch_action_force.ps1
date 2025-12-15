$ErrorActionPreference = 'Stop'
$path = 'c:\Users\IONBEE\Desktop\Yeni klasör\form.html'
$content = Get-Content -Raw -Encoding UTF8 $path

$anchor = '<form class="form-card"'
$idx = $content.IndexOf($anchor)
if ($idx -ge 0) {
  $after = $content.Substring($idx)
  $find = 'action="#"'
  $idx2 = $after.IndexOf($find)
  if ($idx2 -ge 0) {
    $globalIdx = $idx + $idx2
    $content = $content.Substring(0, $globalIdx) + 'action="/api/contact"' + $content.Substring($globalIdx + $find.Length)
    [System.IO.File]::WriteAllText($path, $content, New-Object System.Text.UTF8Encoding($false))
    Write-Host 'Replaced action with /api/contact.'
  } else {
    Write-Host 'Could not find action="#" after form-card.'
  }
} else {
  Write-Host 'Could not find <form class="form-card".'
}
