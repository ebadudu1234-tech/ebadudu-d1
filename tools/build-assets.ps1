# Copies each work's web-ready files (press/ version when one exists) into website/D1/assets/work/<slug>/
# and writes media.js with sizes, so the site never touches the multi-MB originals.
$Work = "E:\Homework\NB web\MY WORK"
$Site = "E:\Homework\NB web\website\D1"
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asOp = ($m | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
$jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]84)

# slug, folder, files in display order (base names; '*' = everything else in natural order), skip list
$manifest = @(
  @{ slug = '550-cafe'; dir = '5：50'; order = @('magnifics_upscale-precision-dPAYYtqBMwmowiMUPcWQ-Brown_Sugar_Storefront_Interior_Integration_2026-03-20_16-19', 'Brown_Sugar_Image_51_2026-03-14_20-10', 'View Request', 'Image 123', 'Image 117', 'Image 124', 'Badge Addition', 'Cup Patterns', 'Desk Placement', 'Product Scene Layout (1)', 'Enamel Pins Design', 'Small Sticker Size', '薛先生的素材铺1', 'Image 132', 'Image 130', 'Image 133') }
  @{ slug = 'switchback'; dir = 'Switchback'; order = @('magnifics_upscale-precision-LF1TcKQpzKLEqFZuISBZ-High-Quality Photo', 'Untitled-1', 'refine my sketch', 'add a detachable hood at the neck, connected with a zipper', 'add logo', 'magnifics_upscale-aOrg3paDc7ZnBS5o8V0g-Image 41 (1)', 'LABEL 1', 'Image 48', 'Image 90 (1)', 'Image 72', 'Image 84', 'Image 31', 'Labrador Beach Run', 'Video 1') }
  @{ slug = 'under-the-cyber-skin'; dir = 'Under the cyber skin'; order = @('Myth3_Spreads_Page_heropage', 'Image', '02', 'Image 8', 'Remove Typ1es', 'Poster Placement (3)', '*') }
  @{ slug = 'planting-pen'; dir = 'Plant pen'; order = @('@1 it is the product stucture,@2 is the out look like, i need to render@1 to make it more like Professional product photography， keep the layout of @1, using the white background', '种植工具组合', 'Shelf Product Addition', 'REMOVE THE OTHER ELEMNT EXPECT OF THE PACK', 'pack 1', 'pack 2', 'pack 3', 'pack 4', '*') }
  @{ slug = 'sonar'; dir = 'Sonar'; order = @('舞台视觉设计', 'Festival Poster Mockup', '86be78de-10e5-4fe4-9d59-1db49b559cee', '投影映射艺术', 'Image 11', '动态视觉效果', '竖屏舞台视觉') }
  @{ slug = 'toyukukoku'; dir = 'Toyukukoku'; order = @('*') }
  @{ slug = 'lotus'; dir = 'lotus'; order = @('*') }
  @{ slug = 'ocupus'; dir = 'ocupus motion'; order = @('*') }
  @{ slug = 'leviairab'; dir = 'LEVIAIRAB BOTTLE'; order = @('*') }
  @{ slug = 'after-dada'; dir = 'After dada'; order = @('After_Dadda_Page_HERO', '*'); skip = @('After_Dadda_Page_HERO.png') }
  @{ slug = 'dada-newspaper'; dir = 'DADA newspaper'; order = @('dada-v5_heropage', '*') }
  @{ slug = 'game-zine'; dir = '2000s game zine'; order = @('Siminar_4_W4_Page_HERO', '*') }
  @{ slug = 'code-for-fun'; dir = 'Code for fun'; order = @('FLORA-final', 'magnifics_upscale-0h0kXhiTbPvL37uBZEYp-presentation 2', 'exhibition 1', 'POP UP_1', 'FLORA-Image Editing Request-bdb7cfb7', 'magnifics_upscale-A0H9lwIoD9XCpf8CMBKo-FLORA-Enhancing Glass Scene-af64e359', 'UI_computer_2', 'UI_computer_3', 'UI_computer_4', 'App_phone_1', 'App_phone_2', 'ar glasses_Inner', 'AR GLASSES', 'click_2', '黑鲸素材 (23)', 'Poster_subway', 'e91451db16fe5fc9e50f11c02a647e6f', 'digital poster', 'T22486(2)', 'ppt1', 'CARD', '無趣创意2', '11', 'cloth', 'bag', 'MM_Home Office_1', 'FLORA-Untitled-227a033b'); skip = @('FLORA-Untitled-de7abda2.mp4', '追设计样机.png') }  # FLORA-Untitled mp4 and 追设计样机 are exact duplicates
  @{ slug = 'allodox'; dir = 'Allodox'; order = @('*') }
  @{ slug = 'ungreen-shop'; dir = 'Ungreeen Shop'; order = @('*') }
  @{ slug = 'yiwugo'; dir = 'Yiwugo'; order = @('*') }
  @{ slug = 'nuclear-tide'; dir = 'Zhangyu'; order = @('*') }
)

function NatKey($n) { [regex]::Replace($n, '\d+', { param($x) $x.Value.PadLeft(6, '0') }) }

function Save-Poster($video, $out) {
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($video)) ([Windows.Storage.StorageFile])
  $clip = Await ([Windows.Media.Editing.MediaClip]::CreateFromFileAsync($file)) ([Windows.Media.Editing.MediaClip])
  $comp = New-Object Windows.Media.Editing.MediaComposition
  # PS 5.1 hides IVector.Add on WinRT collections; call it through the projected ICollection interface
  [System.Collections.Generic.ICollection[Windows.Media.Editing.MediaClip]].GetMethod('Add').Invoke($comp.Clips, @($clip)) | Out-Null
  $t = [TimeSpan]::FromSeconds($clip.OriginalDuration.TotalSeconds * 0.45)  # past the opening title slate
  $w = $clip.GetVideoEncodingProperties().Width; $h = $clip.GetVideoEncodingProperties().Height
  $stream = Await ($comp.GetThumbnailAsync($t, [int]$w, [int]$h, [Windows.Media.Editing.VideoFramePrecision]::NearestFrame)) ([Windows.Graphics.Imaging.ImageStream])
  $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
  $img = [System.Drawing.Image]::FromStream($net)
  $img.Save($out, $jpg, $ep)
  $dims = @($img.Width, $img.Height)
  $img.Dispose(); $net.Dispose()
  return $dims
}

$out = Join-Path $Site 'assets\work'
if (Test-Path $out) { Remove-Item $out -Recurse -Force -Confirm:$false }
$js = @("/* generated by build-assets.ps1 — image/video files + sizes per project. Edit data.js, not this. */", "const MEDIA = {")
foreach ($p in $manifest) {
  $src = Join-Path $Work $p.dir; $press = Join-Path $src 'press'
  $dest = Join-Path $out $p.slug; New-Item -ItemType Directory -Force $dest | Out-Null
  $orig = Get-ChildItem $src -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|mp4)$' -and $p.skip -notcontains $_.Name }
  $items = @{}
  foreach ($o in $orig) {
    $best = Get-ChildItem $press -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $o.BaseName } | Select-Object -First 1
    $items[$o.BaseName] = $(if ($best) { $best } else { $o })
  }
  Get-ChildItem $press -File -Filter 'page_*.jpg' -ErrorAction SilentlyContinue | ForEach-Object { $items[$_.BaseName] = $_ }
  $ordered = @()
  foreach ($name in $p.order) {
    if ($name -eq '*') { $ordered += $items.Keys | Where-Object { $ordered -notcontains $_ } | Sort-Object { NatKey $_ } }
    elseif ($items.ContainsKey($name)) { $ordered += $name }
    else { Write-Warning "$($p.slug): '$name' not found" }
  }
  $missing = $items.Keys | Where-Object { $ordered -notcontains $_ }
  if ($missing) { Write-Warning "$($p.slug): not placed -> $($missing -join ', ')" }
  $entries = @(); $n = 0
  foreach ($name in $ordered) {
    $f = $items[$name]; $n++
    $base = '{0:D2}' -f $n
    if ($f.Extension -eq '.mp4') {
      Copy-Item $f.FullName (Join-Path $dest "$base.mp4")
      $d = Save-Poster $f.FullName (Join-Path $dest "$base-poster.jpg")
      $entries += "{ type: 'video', src: 'assets/work/$($p.slug)/$base.mp4', poster: 'assets/work/$($p.slug)/$base-poster.jpg', w: $($d[0]), h: $($d[1]) }"
    } else {
      $ext = $f.Extension.ToLower().Replace('.jpeg', '.jpg')
      Copy-Item $f.FullName (Join-Path $dest "$base$ext")
      $img = [System.Drawing.Image]::FromFile($f.FullName); $w = $img.Width; $h = $img.Height; $img.Dispose()
      $entries += "{ src: 'assets/work/$($p.slug)/$base$ext', w: $w, h: $h }"
    }
  }
  $js += "  '$($p.slug)': ["; $js += ($entries | ForEach-Object { "    $_," }); $js += "  ],"
  $mb = (Get-ChildItem $dest -File | Measure-Object Length -Sum).Sum / 1MB
  "{0,-22} {1,3} files {2,6:N1} MB" -f $p.slug, $n, $mb
}
$js += "};"
Set-Content (Join-Path $Site 'media.js') ($js -join "`n") -Encoding UTF8

# footer frog photo: flatten the near-white background to pure white and save as JPG
$raw = Join-Path $Site 'assets\frog-photo-raw.png'
if (Test-Path $raw) {
  $img = [System.Drawing.Image]::FromFile($raw)
  $img.Save((Join-Path $Site 'assets\frog-photo.jpg'), $jpg, $ep); $img.Dispose()
  Remove-Item $raw
}
