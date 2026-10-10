# Builds a clean copy of the D1 site for upload to Netlify (zihewang.site, site inquisitive-tulumba-eeae59):
# only the pages, scripts, styles and assets — no notes, tools or local server.
# Then drag the output folder into Netlify > Deploys.
param([string]$Out = "E:\Homework\NB web\deploy-D1")
$Site = "E:\Homework\NB web\website\D1"
if (Test-Path -LiteralPath $Out) { Remove-Item -LiteralPath $Out -Recurse -Force -Confirm:$false }
New-Item -ItemType Directory $Out | Out-Null
foreach ($f in 'index.html', 'work.html', 'project.html', 'about.html', 'style.css', 'main.js', 'data.js', 'media.js') { Copy-Item -LiteralPath "$Site\$f" -Destination $Out }
Copy-Item -LiteralPath "$Site\assets" -Destination "$Out\assets" -Recurse
$m = Get-ChildItem -LiteralPath $Out -Recurse -File | Measure-Object Length -Sum
"{0}: {1} files, {2:N1} MB" -f $Out, $m.Count, ($m.Sum / 1MB)
