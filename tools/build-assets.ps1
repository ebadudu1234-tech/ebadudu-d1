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

$create = 'Create a clean realistic product rendering based on the uploaded sketch. Show the product in a three-view layout_ front view, side view, and top view. Arrange the three views neatly on a clean white or light neutral ba'
# slug, folder, files in display order (base names; '*' = everything else in natural order), skip list
# Order inside each work: hero first, then sketch -> scene -> small objects -> merch
# (editorial and presentation-board works keep their page order)
$manifest = @(
  @{ slug = '550-cafe'; dir = '5：50'; order = @(
      'magnifics_upscale-precision-dPAYYtqBMwmowiMUPcWQ-Brown_Sugar_Storefront_Interior_Integration_2026-03-20_16-19',
      # scenes
      'Brown_Sugar_Image_51_2026-03-14_20-10', 'View Request', 'Image 123', 'Image 117', 'Image 124', 'Badge Addition', 'Desk Placement', 'Product Scene Layout (1)',
      # small objects
      'Cup Patterns', '薛先生的素材铺1', 'Image 132', 'Image 130', 'Image 133',
      # merch
      'Enamel Pins Design', 'Small Sticker Size') }
  @{ slug = 'switchback'; dir = 'Switchback'; order = @(
      'magnifics_upscale-precision-LF1TcKQpzKLEqFZuISBZ-High-Quality Photo',
      # sketch -> line -> render (the big sequence frame)
      'Untitled-1', 'refine my sketch', 'add a detachable hood at the neck, connected with a zipper',
      # scenes
      'Image 48', 'Image 90 (1)', 'LABEL 1', 'add logo', 'magnifics_upscale-aOrg3paDc7ZnBS5o8V0g-Image 41 (1)', 'Labrador Beach Run', 'Video 1',
      # small objects
      'Image 72', 'Image 84', 'Image 31') }
  @{ slug = 'under-the-cyber-skin'; dir = 'Under the cyber skin'; order = @(
      'Myth3_Spreads_Page_heropage',
      # exhibition scenes: title wall, intro wall, dark room, white gallery, poster cube
      'Image', 'Remove Typ1es', 'Image 8', '02', 'Poster Placement (3)',
      # the magazine spreads
      '*') }
  @{ slug = 'planting-pen'; dir = 'Plant pen'; order = @(
      'Screenshot File',   # hero: the Planting Pen box
      # sketches (each takes turns with its render, listed at the end)
      'pack 1', 'pack 2', 'pack 4',
      # scenes
      'Shelf Product Addition', '种植工具组合', 'Feishu20261009-234925',
      # small objects
      'img_v3_0213i_cc64562e-b40c-43f1-92a8-1a37f9aee18g', 'REMOVE THE OTHER ELEMNT EXPECT OF THE PACK',
      # renders paired with the sketches: MODULAR, book box, top/side/front
      "$create (1)", 'ce004938-f8c4-40b1-9817-be6ea1ee8a30', "$create (2)");
      skip = @('pack 3.png', 'Create a clean realistic product rendering based on the uploaded sketch. Show the product in a three-view layout_ front view, side view, and top view. Arrange the three views neatly on a clean white or light neutral backgr.png') }
  # Visual Stage Design replaces the older 舞台视觉设计 as the lead image
  @{ slug = 'sonar'; dir = 'Sonar'; skip = @('舞台视觉设计.png'); order = @(
      'Visual Stage Design',
      # scenes
      '投影映射艺术', 'Festival Poster Mockup', 'Billboard Animation', '动态视觉效果', '竖屏舞台视觉',
      # merch
      'Image 11', '86be78de-10e5-4fe4-9d59-1db49b559cee') }
  @{ slug = 'toyukukoku'; dir = 'Toyukukoku'; order = @('*') }
  @{ slug = 'lotus'; dir = 'lotus'; order = @('*') }
  @{ slug = 'ocupus'; dir = 'ocupus motion'; order = @('*') }
  @{ slug = 'leviairab'; dir = 'LEVIAIRAB BOTTLE'; order = @(
      'Image 16',
      # scene
      'Feishu20261009-235211',
      # small objects
      'Image 14', 'Feishu20261009-235200',
      # merch
      'Image Expansion') }
  @{ slug = 'after-dada'; dir = 'After dada'; order = @('After_Dadda_Page_HERO', '*'); skip = @('After_Dadda_Page_HERO.png') }
  @{ slug = 'dada-newspaper'; dir = 'DADA newspaper'; order = @('dada-v5_heropage', '*') }
  @{ slug = 'game-zine'; dir = '2000s game zine'; order = @('Siminar_4_W4_Page_HERO', '*') }
  @{ slug = 'code-for-fun'; dir = 'Code for fun'; order = @(
      'FLORA-final',
      # scenes: expo, booth, pop-up, lobby, studio, stage, street posters, subway, bus stop, digital screen, banners
      'magnifics_upscale-0h0kXhiTbPvL37uBZEYp-presentation 2', 'exhibition 1', 'POP UP_1', 'FLORA-Image Editing Request-bdb7cfb7', 'magnifics_upscale-A0H9lwIoD9XCpf8CMBKo-FLORA-Enhancing Glass Scene-af64e359', 'ppt1', '黑鲸素材 (23)', 'Poster_subway', 'e91451db16fe5fc9e50f11c02a647e6f', 'digital poster', 'T22486(2)',
      # small objects: website, app, AR glasses, kit box
      'UI_computer_2', 'UI_computer_3', 'UI_computer_4', 'App_phone_1', 'App_phone_2', 'ar glasses_Inner', 'AR GLASSES', 'click_2', 'FLORA-Untitled-227a033b',
      # merch: ID badges, business cards, letterhead, tote, T-shirt, cap
      '11', 'CARD', '無趣创意2', 'bag', 'cloth', 'MM_Home Office_1');
      skip = @('FLORA-Untitled-de7abda2.mp4', '追设计样机.png') }  # exact duplicates of FLORA-final.mp4 and App_phone_2.png
  @{ slug = 'allodox'; dir = 'Allodox'; order = @('*') }
  @{ slug = 'ungreen-shop'; dir = 'Ungreeen Shop'; order = @('*') }
  @{ slug = 'yiwugo'; dir = 'Yiwugo'; order = @('*') }
  @{ slug = 'nuclear-tide'; dir = 'Zhangyu'; order = @('*') }
  # the final renders replace the older renders (123, 图层 14, 图层 16); the floor plan stays
  @{ slug = 'restaurant'; dir = 'restaurant and cafe\final renders'; also = @('restaurant and cafe\work')
     skip = @('123.png', '图层 14.png', '图层 16.png'); order = @(
      '03_art_installation',
      # the floor plan (drawing), then the scenes from the door inwards
      'PLAN 餐厅2-1 Model (2)(2)', '01_entrance', '02_outdoor', '04_indoor_dining', '05_bar') }
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
  $dest = Join-Path $out $p.slug; New-Item -ItemType Directory -Force $dest | Out-Null
  $items = @{}
  # `also`: more folders whose files join this work (each with its own press/)
  foreach ($dir in @($p.dir) + @($p.also | Where-Object { $_ })) {
    $src = Join-Path $Work $dir; $press = Join-Path $src 'press'
    $orig = Get-ChildItem -LiteralPath $src -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|mp4)$' -and $p.skip -notcontains $_.Name }
    foreach ($o in $orig) {
      $best = Get-ChildItem -LiteralPath $press -File -ErrorAction SilentlyContinue | Where-Object { $_.BaseName -eq $o.BaseName } | Select-Object -First 1
      $items[$o.BaseName] = $(if ($best) { $best } else { $o })
    }
    Get-ChildItem -LiteralPath $press -File -Filter 'page_*.jpg' -ErrorAction SilentlyContinue | ForEach-Object { $items[$_.BaseName] = $_ }
  }
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
