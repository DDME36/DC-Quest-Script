$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\MIGHTYBIT\.codex\generated_images\01a09955-e048-7f90-b405-619bfc9a59dd\exec-df59de68-866c-4dad-b5f4-7d4a068b4e1f.png'
$root = Split-Path -Parent $PSScriptRoot
$outPng = Join-Path $root 'assets\zentyr-icon.png'
$outIco = Join-Path $root 'assets\zentyr.ico'

if (-not (Test-Path $sourcePath)) {
    throw "Source image not found: $sourcePath"
}

$srcImg = [System.Drawing.Bitmap]::FromFile($sourcePath)

# 1. Create 1024x1024 canonical PNG
$canvas1024 = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($canvas1024)
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($srcImg, 0, 0, 1024, 1024)
$g.Dispose()

$canvas1024.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Canonical 1024x1024 PNG saved to $outPng"

# 2. Render ICO frames: 16, 24, 32, 48, 64, 128, 256
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$frameBytesList = [System.Collections.Generic.List[byte[]]]::new()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g2 = [System.Drawing.Graphics]::FromImage($bmp)
    $g2.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.DrawImage($canvas1024, 0, 0, $sz, $sz)
    $g2.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $frameBytesList.Add($ms.ToArray())
    $ms.Dispose()
    $bmp.Dispose()
}

$canvas1024.Dispose()
$srcImg.Dispose()

# 3. Write ICO file
$icoMs = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($icoMs)

$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type (1 for ICO)
$bw.Write([uint16]$sizes.Count) # Count

$offset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $sz = $sizes[$i]
    $w = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $bColorCount = [byte]0
    $bReserved = [byte]0
    $wPlanes = [uint16]1
    $wBitCount = [uint16]32
    $dwBytesInRes = [uint32]$frameBytesList[$i].Length
    $dwImageOffset = [uint32]$offset

    $bw.Write($w)
    $bw.Write($h)
    $bw.Write($bColorCount)
    $bw.Write($bReserved)
    $bw.Write($wPlanes)
    $bw.Write($wBitCount)
    $bw.Write($dwBytesInRes)
    $bw.Write($dwImageOffset)

    $offset += $frameBytesList[$i].Length
}

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $bw.Write($frameBytesList[$i])
}

$bw.Flush()
[System.IO.File]::WriteAllBytes($outIco, $icoMs.ToArray())
$bw.Dispose()
$icoMs.Dispose()

Write-Host "ICO with 7 PNG-compressed frames saved to $outIco"
