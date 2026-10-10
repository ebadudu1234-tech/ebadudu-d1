param([string]$Root = "E:\Homework\NB web\MY WORK", [int]$MaxEdge = 2400, [long]$SizeLimit = 500KB, [int]$Quality = 82, [switch]$ForceJpg)
Add-Type -AssemblyName System.Drawing
$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)
$report = @()

function Test-Alpha($bmp) {
  if (-not [System.Drawing.Image]::IsAlphaPixelFormat($bmp.PixelFormat)) { return $false }
  $stepX = [math]::Max(1, [int]($bmp.Width / 120)); $stepY = [math]::Max(1, [int]($bmp.Height / 120))
  for ($y = 0; $y -lt $bmp.Height; $y += $stepY) { for ($x = 0; $x -lt $bmp.Width; $x += $stepX) {
    if ($bmp.GetPixel($x, $y).A -lt 250) { return $true } } }
  return $false
}

Get-ChildItem $Root -Recurse -File -Include *.jpg, *.jpeg, *.png | Where-Object { $_.DirectoryName -notmatch '\\press$' } | ForEach-Object {
  $f = $_
  try {
    $img = [System.Drawing.Image]::FromFile($f.FullName)
    $w = $img.Width; $h = $img.Height; $long = [math]::Max($w, $h)
    $needs = ($f.Length -gt $SizeLimit) -or ($long -gt $MaxEdge)
    $row = [ordered]@{ Work = $f.Directory.Name; File = $f.Name; Px = "${w}x${h}"; OrigKB = [int]($f.Length / 1KB); Action = 'keep'; OutKB = ''; Out = '' }
    if ($needs) {
      $scale = [math]::Min(1.0, $MaxEdge / $long)
      $nw = [int][math]::Round($w * $scale); $nh = [int][math]::Round($h * $scale)
      $bmp = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
      # TileFlipXY stops bicubic sampling from bleeding transparent pixels in at the edges
      $attr = New-Object System.Drawing.Imaging.ImageAttributes
      $attr.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
      $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $nw, $nh), 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $attr)
      $g.Dispose(); $attr.Dispose()
      # check transparency on the source, not the resampled copy
      $alpha = (-not $ForceJpg) -and ($f.Extension -eq '.png') -and (Test-Alpha $img)
      $pressDir = Join-Path $f.DirectoryName 'press'
      New-Item -ItemType Directory -Force $pressDir | Out-Null
      if ($alpha) {
        $out = Join-Path $pressDir ($f.BaseName + '.png')
        $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
      } else {
        # flatten onto white so transparent-format PNGs without real transparency encode cleanly
        $flat = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g2 = [System.Drawing.Graphics]::FromImage($flat); $g2.Clear([System.Drawing.Color]::White); $g2.DrawImage($bmp, 0, 0, $nw, $nh); $g2.Dispose()
        $out = Join-Path $pressDir ($f.BaseName + '.jpg')
        $flat.Save($out, $jpgCodec, $encParams); $flat.Dispose()
      }
      $bmp.Dispose()
      $outLen = (Get-Item $out).Length
      if ($outLen -ge $f.Length * 0.9) { Remove-Item $out; $row.Action = 'keep (no gain)' }
      else { $row.Action = $(if ($alpha) { 'png-resize' } else { 'jpg' }); $row.OutKB = [int]($outLen / 1KB); $row.Out = Split-Path $out -Leaf }
    }
    $img.Dispose()
  } catch { $row = [ordered]@{ Work = $f.Directory.Name; File = $f.Name; Px = '?'; OrigKB = [int]($f.Length / 1KB); Action = "ERROR: $($_.Exception.Message)"; OutKB = ''; Out = '' } }
  $report += New-Object psobject -Property $row
  Write-Output ("{0} / {1} -> {2} {3}" -f $row.Work, $row.File, $row.Action, $row.OutKB)
}
$report | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $PSScriptRoot 'compress-report.csv')

