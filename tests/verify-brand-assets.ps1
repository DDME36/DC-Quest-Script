$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$pngPath = Join-Path $root 'assets\zentyr-icon.png'
$icoPath = Join-Path $root 'assets\zentyr.ico'
$exePath = Join-Path $root 'ZENTYR Discord Script.exe'

$png = [System.Drawing.Bitmap]::FromFile($pngPath)
try {
  if ($png.Width -ne 1024 -or $png.Height -ne 1024) { throw 'PNG must be 1024x1024.' }
  $corners = @(
    $png.GetPixel(0, 0).A,
    $png.GetPixel($png.Width - 1, 0).A,
    $png.GetPixel(0, $png.Height - 1).A,
    $png.GetPixel($png.Width - 1, $png.Height - 1).A
  )
  if (($corners | Where-Object { $_ -ne 0 }).Count) { throw 'PNG corners must be transparent.' }
} finally { $png.Dispose() }

$bytes = [System.IO.File]::ReadAllBytes($icoPath)
if ([BitConverter]::ToUInt16($bytes, 0) -ne 0 -or [BitConverter]::ToUInt16($bytes, 2) -ne 1) {
  throw 'Invalid ICO header.'
}
$count = [BitConverter]::ToUInt16($bytes, 4)
$expected = @(16, 24, 32, 48, 64, 128, 256)
if ($count -ne $expected.Count) { throw "Expected 7 ICO frames; found $count." }
for ($i = 0; $i -lt $count; $i++) {
  $entry = 6 + 16 * $i
  $width = [int]$bytes[$entry]
  if ($width -eq 0) { $width = 256 }
  if ($width -ne $expected[$i]) { throw "Unexpected ICO frame width $width at index $i." }
  $length = [BitConverter]::ToUInt32($bytes, $entry + 8)
  $offset = [BitConverter]::ToUInt32($bytes, $entry + 12)
  if (($offset + $length) -gt $bytes.Length) { throw "ICO frame $i exceeds file bounds." }
}

if (Test-Path $exePath) {
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
  if ($null -eq $icon) { throw 'Executable has no embedded icon.' }
  $icon.Dispose()
}

Write-Host 'Brand assets valid: PNG alpha, 7 ICO frames, executable icon present.'
