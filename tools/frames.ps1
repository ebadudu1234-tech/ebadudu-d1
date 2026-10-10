param([string]$Video, [string]$Out, [double[]]$Times, [int]$ThumbW = 400)
# contact sheet of frames at the given seconds, labelled — for choosing covers / finding where title slates end
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asOp = ($m | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaClip, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Editing.MediaComposition, Windows.Media.Editing, ContentType = WindowsRuntime] | Out-Null
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Video)) ([Windows.Storage.StorageFile])
$clip = Await ([Windows.Media.Editing.MediaClip]::CreateFromFileAsync($file)) ([Windows.Media.Editing.MediaClip])
$comp = New-Object Windows.Media.Editing.MediaComposition
[System.Collections.Generic.ICollection[Windows.Media.Editing.MediaClip]].GetMethod('Add').Invoke($comp.Clips, @($clip)) | Out-Null
$vw = $clip.GetVideoEncodingProperties().Width; $vh = $clip.GetVideoEncodingProperties().Height
$dur = $clip.OriginalDuration.TotalSeconds
"duration {0:N1}s  {1}x{2}" -f $dur, $vw, $vh
$th = [int]($ThumbW * $vh / $vw); $cols = 4; $rows = [math]::Ceiling($Times.Count / $cols)
$sheet = New-Object System.Drawing.Bitmap ($cols * $ThumbW), ($rows * ($th + 20))
$g = [System.Drawing.Graphics]::FromImage($sheet); $g.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font 'Arial', 11
for ($i = 0; $i -lt $Times.Count; $i++) {
  $t = [math]::Min($Times[$i], $dur - 0.05)
  $s = Await ($comp.GetThumbnailAsync([TimeSpan]::FromSeconds($t), [int]$vw, [int]$vh, [Windows.Media.Editing.VideoFramePrecision]::NearestFrame)) ([Windows.Graphics.Imaging.ImageStream])
  $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($s)
  $img = [System.Drawing.Image]::FromStream($net)
  $x = ($i % $cols) * $ThumbW; $y = [math]::Floor($i / $cols) * ($th + 20)
  $g.DrawImage($img, [int]$x, [int]$y, $ThumbW, $th)
  $g.DrawString(("{0:N1}s" -f $t), $font, [System.Drawing.Brushes]::Black, [single]$x, [single]($y + $th + 2))
  $img.Dispose(); $net.Dispose()
}
$sheet.Save($Out, [System.Drawing.Imaging.ImageFormat]::Jpeg); $g.Dispose(); $sheet.Dispose()
