# D1 素材处理脚本

全部是 Windows PowerShell 5.1 脚本，不需要 Python、Node 或 ffmpeg。
脚本文件要用「UTF-8 带 BOM」保存，否则中文文件名会乱码。

| 脚本 | 用途 |
|---|---|
| `compress.ps1` | 把 `MY WORK/<作品>` 里过大的图片压缩到该作品的 `press/` 文件夹（超过 500KB 或长边超过 2400px → 缩到 2400px、JPEG 质量 82）。加 `-Root <文件夹>` 只处理一个作品，加 `-ForceJpg` 把透明 PNG 也转成白底 JPG |
| `pdf2jpg.ps1` | 把 PDF 每一页转成 JPG：`-Pdf <文件> -OutDir <作品>\press -Width 1600` |
| `video.ps1` | 把大视频转成 1080p H.264：`-In <视频> -Out <作品>\press\<文件名>.mp4` |
| `frames.ps1` | 从视频里截几帧拼成一张对照图，用来挑封面、找片头结束的时间 |
| `build-assets.ps1` | 把每个作品可用于网页的版本（有 press 就用 press）复制到 `assets/work/<slug>/`，生成视频封面帧，并重写 `media.js`。作品里图片的顺序写在脚本开头的 manifest 里 |
| `trinkets.ps1` | 生成鼠标悬停时跟随的小物品 `assets/trinkets/<slug>.png`：`cut` 模式抠掉背景，`rect` 模式保留原样的小图 |

往 MY WORK 里加了新作品或新图片之后，按顺序运行：
1. `compress.ps1`
2. 在 `build-assets.ps1` 里加上作品（或调整顺序），再运行它
3. 在 `data.js` 里补上作品信息
4. 在 `trinkets.ps1` 里加一行，生成这个作品的小物品
