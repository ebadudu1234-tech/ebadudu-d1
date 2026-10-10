param([string]$Site = "E:\Homework\NB web\website\D2", [int]$Width = 960)
# 960px cover thumbnails (assets/thumbs/<slug>.jpg) for a site, from its data.js covers and media.js
Add-Type -AssemblyName System.Drawing
$data = [IO.File]::ReadAllText("$Site\data.js"); $media = [IO.File]::ReadAllText("$Site\media.js")
$jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]80)
$out = Join-Path $Site 'assets\thumbs'; New-Item -ItemType Directory -Force $out | Out-Null
foreach ($m in [regex]::Matches($data, "slug: '([^']+)'[^\n]*?cover: (\d+)")) {
  $slug = $m.Groups[1].Value; $cover = [int]$m.Groups[2].Value
  $block = [regex]::Match($media, "'$([regex]::Escape($slug))': \[(.*?)\n  \],", 'Singleline').Groups[1].Value
  $it = [regex]::Matches($block, "\{([^}]*)\}")[$cover].Groups[1].Value
  $src = if ($it -match "poster: '([^']+)'") { $Matches[1] } else { ([regex]::Match($it, "src: '([^']+)'")).Groups[1].Value }
  $img = [System.Drawing.Image]::FromFile((Join-Path $Site $src))
  $h = [int]($img.Height * $Width / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $Width, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($img, 0, 0, $Width, $h); $g.Dispose()
  $bmp.Save((Join-Path $out "$slug.jpg"), $jpg, $ep); $bmp.Dispose(); $img.Dispose()
  "{0,-22} <- {1}" -f $slug, $src
}
