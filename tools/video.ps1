param([string]$In, [string]$Out, [uint32]$Height = 1080, [uint32]$Bitrate = 5000000)
# Re-encode a video to H.264 MP4 with the built-in Windows.Media.Transcoding API
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$m = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asOp = ($m | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asOpProg = ($m | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]
function Await($op, [Type]$t) { $task = $asOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null

$src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($In)) ([Windows.Storage.StorageFile])
$dir = Split-Path $Out; New-Item -ItemType Directory -Force $dir | Out-Null
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($dir)) ([Windows.Storage.StorageFolder])
$dst = Await ($folder.CreateFileAsync((Split-Path $Out -Leaf), [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])

$srcProfile = Await ([Windows.Media.MediaProperties.MediaEncodingProfile]::CreateFromFileAsync($src)) ([Windows.Media.MediaProperties.MediaEncodingProfile])
$sw = $srcProfile.Video.Width; $sh = $srcProfile.Video.Height
$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp4([Windows.Media.MediaProperties.VideoEncodingQuality]::HD1080p)
$h = [math]::Min($Height, $sh); $w = [uint32]([math]::Round($sw * $h / $sh / 2) * 2)
$profile.Video.Width = $w; $profile.Video.Height = [uint32]$h
$profile.Video.Bitrate = $Bitrate
$profile.Video.FrameRate.Numerator = $srcProfile.Video.FrameRate.Numerator
$profile.Video.FrameRate.Denominator = $srcProfile.Video.FrameRate.Denominator
if (-not $srcProfile.Audio) { $profile.Audio = $null }

$tc = New-Object Windows.Media.Transcoding.MediaTranscoder
$tc.HardwareAccelerationEnabled = $true
$prep = Await ($tc.PrepareFileTranscodeAsync($src, $dst, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
if (-not $prep.CanTranscode) { throw "Cannot transcode: $($prep.FailureReason)" }
$task = $asOpProg.MakeGenericMethod([double]).Invoke($null, @($prep.TranscodeAsync()))
$task.Wait(-1) | Out-Null
"{0}: {1}x{2} -> {3}x{4}, {5:N1} MB -> {6:N1} MB" -f (Split-Path $In -Leaf), $sw, $sh, $w, $h, ((Get-Item $In).Length / 1MB), ((Get-Item $Out).Length / 1MB)
