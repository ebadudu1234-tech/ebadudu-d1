param([string]$Pdf, [string]$OutDir, [int]$Width = 2400, [int]$MaxPages = 60)
# Render PDF pages to JPG using the built-in Windows.Data.Pdf WinRT API (no extra tools needed)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [Type]$t) { $task = $asTaskGeneric.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
function AwaitAction($op) { $task = $asTaskAction.Invoke($null, @($op)); $task.Wait(-1) | Out-Null }

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]82)

$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Pdf)) ([Windows.Storage.StorageFile])
$doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
New-Item -ItemType Directory -Force $OutDir | Out-Null
$n = [math]::Min($doc.PageCount, $MaxPages)
"pages: $($doc.PageCount)"
for ($i = 0; $i -lt $n; $i++) {
  $page = $doc.GetPage($i)
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32]$Width
  $opts.DestinationHeight = [uint32][math]::Round($Width * $page.Size.Height / $page.Size.Width)
  $opts.BackgroundColor = [Windows.UI.Color]::FromArgb(255, 255, 255, 255)
  $mem = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitAction ($page.RenderToStreamAsync($mem, $opts))
  $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($mem.GetInputStreamAt(0))
  $img = [System.Drawing.Image]::FromStream($net)
  $out = Join-Path $OutDir ("page_{0:D2}.jpg" -f ($i + 1))
  $img.Save($out, $jpgCodec, $ep)
  "{0} {1}x{2} {3}KB" -f (Split-Path $out -Leaf), $img.Width, $img.Height, [int]((Get-Item $out).Length / 1KB)
  $img.Dispose(); $net.Dispose(); $mem.Dispose(); $page.Dispose()
}
