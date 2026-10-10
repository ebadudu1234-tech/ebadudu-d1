# EBADUDU 作品集网站：全部要求汇总

> 最后更新：2026-10-09
> 用途：记录我（Zihe Wang）到目前为止提出的所有要求，以后每次修改网站前先读这份文件。
> **随时更新**：每次提出新要求或修改旧要求，都要同步写进这份文件（放进对应章节，更新日期和版本记录），再保存版本。

---

## 1. 文件夹与整体结构

| 位置 | 用途 |
|---|---|
| `E:\Homework\NB web\MY WORK\<作品名>\` | 我的作品**原始文件**，不要改动或删除 |
| `E:\Homework\NB web\MY WORK\<作品名>\press\` | 该作品的**压缩版**，例如 `MY WORK\After dada\press` |
| `E:\Homework\NB web\website\D1` / `D2` / `D3` | 三个方向的网站，**各自一个文件夹** |
| `E:\Homework\NB web\prolilab\D1` | 我最初上传的 D1 代码（旧版参考，不在这里修改） |

- Figma 文件：https://www.figma.com/design/hDU6ZtcVwhLSTzt5UuvZRK/website
  里面有三个方向（direction 1 / 2 / 3），分别对应 website 里的 D1 / D2 / D3。
- **D1 对应 direction 1，D2 对应 direction 2，D3 对应 direction 3。**
- **三个网站不允许风格混合**：不共用代码、样式或视觉语言。
- D1 和 D2 已经做好；**D2 自己的要求写在 `website/D2/prompt/requirements.md`**。
- D3 还没有 Figma 设计稿，等画好之后再做，目前只有占位说明。
- 三个网站用同一批作品，但各自保留一份素材和数据，互不依赖。

## 2. 图片 / 素材压缩

- 先判断 MY WORK 里的图片是否需要压缩，只有太大的才压缩。
- 压缩后的文件放进**该作品自己的 `press` 文件夹**，原图保留不动。
- 目前使用的规则：
  - 图片大于 500KB **或** 长边大于 2400px → 缩到长边 2400px，存为 JPEG（质量 82）。
  - 透明 PNG 铺上白底（网站背景本来就是白色）。
  - 压缩后没有明显变小（不到 10%）的就不放进 press。
  - 只有 PDF 的作品（Toyukukoku、DADA newspaper）→ 每页转成图片放进 press。
  - 大视频 → 转成 1080p H.264（lotus、ocupus、click_2）。
- 网站使用的是 press 版本（没有 press 版本时用原图），统一复制到 `D1/assets/work/<slug>/`。
- **之后往 MY WORK 里加新文件时，也要按同样的规则压缩，再放进网站。**
  （例如 Code for fun 新增了网站界面、App 界面、电子海报、公交站海报、帆布袋共 9 张，已经压缩并放进网站。）
- 内容完全相同的重复文件不放进网站：
  - `FLORA-Untitled-de7abda2.mp4` 和 `FLORA-final.mp4` 完全相同；
  - `追设计样机.png` 和 `App_phone_2.png` 画面一致。
- 这台电脑没有 Python / Node / ffmpeg，所有处理都是用 PowerShell + .NET + Windows 自带接口完成的。
- 处理脚本都保存在 `D1/tools/`，用法见 `D1/tools/README.md`。

## 3. D1 网站要求

### 3.1 基础
- 在我上传的 `prolilab/D1` 代码基础上修改，并按照 Figma 里改过的细节更新。
- 新工程建在 `E:\Homework\NB web\website\D1`。
- 把 MY WORK 里的作品全部放进网站（目前 17 个；`My introduction` 是个人照片，没有算作作品）。
- 字体：Margarine（标题 / logo）、Metrophobic（正文 / 导航）、Intel One Mono（Hello World）。
- 导航：EBADUDU ｜ WORK ｜ PLAY AREA ｜ ABOUT ME。

### 3.2 开头动画（begin animation）
- 流程：打出 "Hello World" → 划线删除 → 青蛙弹出，同时出现 "Hi, I'm Zihe." → 文字飞进首页大标题 "Hiiiiiii, I'm Zihe Wang"。
- **一定要播放**：不能因为电脑开了"减少动画"而被跳过（之前出过这个问题）。
- **已加速**：总长约 3.5 秒（原来约 6.5 秒）。
- **每次访问只播放一次**：从 WORK 页或作品页返回首页时**不再播放**。
- 点击或按任意键可以跳过。

### 3.3 首页
- Figma 首页只是一个示例，按同样的方式**往下延伸到六行**（一共 12 个作品；原来五行，后来又加了一行）。
- 每行一大一小交替：第一行小｜大，第二行大｜小，以此类推。
- 卡片尺寸：小 472×334，大 884×556，间距 36px。
- 每张卡片下面有作品名和标签（BRAND / VIDEO 等）。
- **首页推荐放我新一年做的作品，并且优先选照片多的项目。**
  - 现在的 12 个作品（每行：左 | 右）：
    1. After Dada | **5:50 Cafe（brown sugar，第一行大图）**
    2. Code For Fun | DADA Newspaper
    3. Planting Pen | Switchback
    4. Sónar | **Leviathan Absinthe（Dream Recovery Department，替换了假面骑士 Toyukukoku）**
    5. 2000s Game Zine | Under the Cyber Skin
    6. **Artificial Octopus（ocupus motion，大图）** | **Lotus Cigarette 动画（小图）**
  - 有视频的作品会自动换到大格子；写成 `{ slug: 'lotus', keep: true }` 的作品固定在写的位置，不自动换。
  - Lotus、Artificial Octopus、Leviairab 都只有一个视频或一张图，所以没有放进首页。
- **有视频的作品放在大格子里**（代码会自动把它换到该行的大格）。
- 首页放哪些作品、什么顺序，在 `data.js` 的 `FEATURED` 里改。

### 3.3.1 视频作品的封面
- 有视频的作品：封面先显示一张静态画面，**鼠标移上去后直接播放视频**（静音、循环），移开就暂停。
- 首页卡片和 WORK 页右侧预览框都是这样。
- 视频开头有 ArtCenter 片头的作品，播放时跳过片头：Lotus 从 6.5 秒开始，Artificial Octopus 从 5.6 秒开始。作品页顶部的视频也一样跳过。
- **Code For Fun 的封面使用 `FLORA-final.mp4` 的截图**；鼠标移上去播放的也是这段视频，作品页顶部同样用它。
- 手机等触屏设备没有"鼠标移上去"，只显示静态封面。

### 3.3.2 鼠标跟随的小物品
- **首页和 WORK 页**里，鼠标碰到某个作品时，会出现一个**从这个作品里提取出来的小物品**。
- 小物品**始终跟随鼠标**，带一点缓动和倾斜，但**不会离开这个作品的框**：
  - 首页：卡片的图片框；
  - WORK 页：作品所在的那一整行。
- **尺寸不要太大**：最大 120px，带白色描边和柔和阴影，像一张贴纸。
- 手机等触屏设备不显示。
- 文件放在 `assets/trinkets/<slug>.png`，由 `tools/trinkets.ps1` 生成。
- 每个作品用的小物品：

| 作品 | 小物品 | 方式 |
|---|---|---|
| 5:50 Cafe | 腰果珐琅徽章 | 抠图 |
| Switchback | 带折叠水碗的斜挎包 | 抠图 |
| Planting Pen | 草莓种子补充装盒 | 抠图 |
| Code For Fun | Classroom Organizer 盒子 | 抠图 |
| Sónar | 渔夫帽上的 Sónar 标志徽章 | 抠图 |
| After Dada | 圆顶礼帽 | 抠图 |
| 2000s Game Zine | Nokia 手机 | 抠图 |
| Allodox | 游戏里的像素 REFILL 售货机 | 抠图 |
| Ungreen Shop | 'UGS' 标志 | 抠图 |
| Yiwugo | 两只蜜蜂角色 | 抠图 |
| Nuclear Tide Evolutionaries | 装置渲染图 | 抠图 |
| DADA Newspaper | 报纸封面 | 小图 |
| Toyukukoku | 杂志 "GO!" 内页 | 小图 |
| Under the Cyber Skin | 杂志封面 | 小图 |
| Lotus Cigarette | 视频截图（香烟和莲花） | 小图 |
| Artificial Octopus | 视频截图 | 小图 |
| Leviairab Bottle | 两个酒瓶 | 小图 |

### 3.4 首页结尾：联系方式（Get in touch）
- 内容：灰色 "Get in touch"，下面是黑色 "ebadudu1234@gmail.com"（点击会打开邮件）。
- **上面的作品区是正常滚动的**。
- **滑到底部的联系页时，用整页翻动的方式进入，不是慢慢滚上来**；往回滑也是整页翻回作品区。
- **青蛙在翻到联系页之后自动出发**：先只在底部露出一个头，然后往右上方爬，露出身子（Figma "main page end ANIMATION" 的第一帧到第二帧）。
- 离开再回来，青蛙动画会重新播放。
- 联系页上方要显示导航栏。

### 3.5 WORK 页
- 按年份分组（2026 / 2025 / 2024 / 2023），组与组之间有分隔线。
- 顶部是标签筛选按钮，**第一个是 ALL**（默认选中，显示全部作品）；点一个标签筛选，再点一下或点 ALL 回到全部。
- 鼠标悬停的作品：文字变黑、出现下划线、显示标签。整行都算悬停范围，不只是文字。
- **右侧预览框的尺寸不是固定的，要随作品封面图的比例变化**；太高的图最多占屏幕高度的 70%。
- **鼠标没有碰到作品时，右侧图片（连同灰色底框）不显示**；碰到作品才出现，离开后淡出（在两行之间滑过时不会闪）。点标签筛选也不会自动显示。

### 3.6 作品详情页（Figma "TITLE PAHE"）
- 顶部大图，下面是大写作品名、标签，再往下是"图片 + 文字"交替的排版。
- 并排的两张图高度一致，每张都按原图比例显示，**不裁切**。
- 视频作品的顶部视频自动静音循环播放；图集里的视频要点击才播放。
- 页面最下面有"下一个作品"的链接。
- **作品名、副标题和说明文字都来自我写的文本描述**（MY WORK 里每个作品的描述），原文照搬，不改写：
  - 描述第一行 = 作品名，第二行 = 副标题（作品名下面一行灰字）；
  - 第一段放在顶部大图下面；最后一段放在图集最后；中间的段落穿插在图集之间（D1）。D2 把所有段落都放在 "ABOUT THIS WORK" 里。
  - 在 `data.js` 里是 `subtitle` 和 `text: [段落, 段落, …]`。
- **content reference 文件夹不用读、不用加到网站上。**
- **大图（`big`）**：指定的图片单独占一整行、全宽显示，**位置和顺序不变**（就在它在图集里原来的位置）。大图旁边不放文字。
  - Code For Fun：展会大墙（04）和街头数字海报（11）大图显示（`big: [3, 10]`）。
  - Restaurant：平面图（`big: [1]`）。
- **并列（`pairs`）**：指定的两张图永远在同一行。
- **Sónar 的封面 / 第一张图用 `Visual Stage Design`**，替换旧的「舞台视觉设计」（旧图仍在文件夹里，网站不用）。
- **靠右（`right`）**：指定的单张图不居中，贴右边距对齐。Code For Fun 的集装箱展台图（03）靠右（`right: [2]`）。
- **图文排版按 Figma "TITLE PAHE" 的组合方式**：
  - 图 | 文（图在左约 50–60%，文字栏在右 457/1392）；
  - 图 + 图（两张同高）；
  - 文 | 图（文字在左，图在右约 40–50%）。
  - 每段文字都放在一张图旁边，不单独占一行；第一段在第一张图旁边，最后一段在最后一张图旁边，中间的段落平均分布在图集里。
  - **两张图并排时必须严格左右顶满**：左图贴左边距、右图贴右边距（和顶部大图一样宽），两张同高、按原比例，不留空缺。
  - **图 | 文、文 | 图的行也贴齐左右两边**，宽度严格按 Figma（图 795/1392 + 文 457，或文 457 + 图 617/1392）；留白只在图和文字之间。
  - **单张图**：宽图（宽高比 ≥ 1.7）左右顶满；其他单张图**居中**，只允许少量：只有一段图片数量是单数时才会多出一张，位置按作品名固定生成；不会连续出现两张单图。
  - 文字段落正好落在一张图前面会被让给前一张图，避免留下落单的图。
  - 太高的图限制在屏幕高度以内；手机上全部变成一列。
- **标签系统**：标签来自每个作品描述的第二行（"|" 前面的类别），例如 "Brand identity, space, packaging, web" → BRAND / SPACE / PACKAGING / WEB；zine、newspaper 也作为标签。**VIDEO 不手写，有视频的作品自动加上**。WORK 页的筛选按钮按出现次数排序。
- **图集的排列顺序：草图 → 场景图 → 小物件 → 周边**（封面大图仍在最前面）。顺序写在 `tools/build-assets.ps1` 的 `order` 里，改完重新运行这个脚本。

### 3.6.1 Switchback 的轮播大图（D1、D2 都有）
- 在作品介绍下面放**一张大图**，三张图**轮流替换**（交叉淡入淡出，每张停 1.5 秒，淡入淡出 0.6 秒），**从草图开始**：
  1. 手绘草图（`Untitled-1.png`，带手写标注）；
  2. 线稿（`refine my sketch.png`）；
  3. 带标注的渲染图（`add a detachable hood ... .png`）。
- 第一次看到时从草图开始；滚出屏幕时暂停，回来接着播。
- 这三张不再重复出现在下面的图集里。
- 在 `data.js` 里用 `sequence: [1, 2, 3]` 指定（数字是这个作品的第几张图），其他作品也可以这样用。

### 3.6.2 Planting Pen 的草图 ↔ 渲染图互换（D1、D2 都有）
- 草图和渲染图 **1 对 1 对应**，**按正常图片大小放在图集里**（不做大图），每个位置里**草图先出现**，和渲染图**每 1.5 秒互换**：
  - 杯子盒草图（pack 1）↔ MODULAR SERVING SYSTEM 渲染图；
  - 书本盒草图（pack 2）↔ 书本盒渲染图；
  - 盖子 + 两层盒草图（pack 4）↔ Top / Side / Front View 渲染图。
- **没有配对的草图删除**：方盒 + 笔 + 植物盒草图（pack 3）不在网站上出现；带标注的书本盒渲染图（CLOSED FORM）也不出现（原图仍保留在 MY WORK 里）。
- 在 `data.js` 里：`swaps: [[1, 9], [2, 10], [3, 11]]`（每对：[草图, 渲染图]）；pack 3 和 CLOSED FORM 直接在 `build-assets.ps1` 里跳过。
- 原来的封面图（"@1…"）已经从文件夹里删掉了，**封面改用包装盒照片（Screenshot File）**。

### 3.7 作品出现时的动效（苹果风格）
- 图片框从下往上展开；里面的图从稍微放大、略带模糊，变成清晰的原大小。
- 首页卡片的作品名和标签比图片晚一点出现；并排的两张图一前一后出现。
- 首页封面和作品页顶部大图在滚动时有轻微视差（景深感）。
- 作品页图集里的图不加视差，避免带文字的跨页被裁切。

### 3.8 其他
- 往下滚时导航栏收起；往上滚时以白底重新出现，避免压在图片上看不清。
- 手机宽度下排版要能正常显示，不能出现横向滚动。

## 3B. D2 网站（概要，详细见 `website/D2/prompt/requirements.md`）
- 按 Figma direction 2 做：黑色背景、毛玻璃胶囊导航、Rokkitt 字体、绿色按钮。
- 首页：开头动画（卡片散开 → 聚拢 → 叠起 → 第一张作品放大到全屏），然后是 6 个作品的全屏轮播，右侧有竖排小圆点。
- WORK 页：一行 3 张作品卡片，绿色 "VIEW MY WORK" 胶囊跟着鼠标走，有视频的作品鼠标移上去就播放。
- 作品页：全屏封面 + 作品说明 + 两两一行的图片。

## 4. 版本管理 / GitHub

- 网站要连接 GitHub。仓库根目录是 `E:\Homework\NB web\website`，D1 / D2 / D3 是三个独立文件夹。
- MY WORK **不上传**（文件太大：594MB 的 PDF 等，GitHub 单个文件上限 100MB）。
- **每改一版都要保存成一个版本（commit），并在说明里写清楚这一版改了什么。**
- Git 安装路径：`C:\Program Files\Git\cmd\git.exe`。
- 本地预览服务器 `serve.ps1`（D1、D2 各一份）：同时处理多个请求，视频每次只传 2MB，保证看过视频后再点别的作品不会卡。
- 作者信息：Zihe Wang <ebadudu1234@gmail.com>。

## 5. 待办 / 待确认

- [ ] **GitHub 仓库链接**：我在 github.com 新建一个空仓库（不要勾 README），把链接发给 Claude，然后把所有版本上传。
- [ ] **"apple effect" 插件 / skill**：插件市场和 skill 目录里都没有找到这个名字。要提供截图、链接或描述后再安装；**安装前必须先经过我确认**。
- [x] 作品年份：**Ungreen Shop、Yiwugo、Zhangyu（Nuclear Tide Evolutionaries）是 2024 年的作品**（已改，D1、D2 都改了）。
- [x] **Allodox 也是 2024 年；After Dada、2000s Game Zine、DADA Newspaper 是 2025 年**（已改，D1、D2 都改了）。
- [x] **restaurant（Modern Rhythm, Day and Night Change: Restaurant Design）是 2023 年的作品**，新加入网站，标签 INTERIOR。**图片用 `MY WORK/restaurant and cafe/final renders`**（压缩版在 `final renders/press`），替换了旧的渲染图（123、图层 14、图层 16）；平面图（PLAN）仍来自 `work` 文件夹。顺序：艺术装置（封面）→ 平面图 → 入口 → 室外 → 室内用餐区 → 吧台。**平面图单独大图显示**（`data.js` 里 `big: [1]`）；**入口和室外两张并列**（`pairs: [[2, 3]]`，永远在同一行）。
- 现在的年份：2026 = 5:50 Cafe、Switchback、Under the Cyber Skin、Planting Pen、Sónar、Toyukukoku、Lotus、Artificial Octopus、Leviairab；2025 = Code For Fun、After Dada、DADA Newspaper、2000s Game Zine；2024 = Allodox、Ungreen Shop、Yiwugo、Nuclear Tide；2023 = Restaurant。
- [ ] Code For Fun 的年份（按文件日期放在 2025）待确认。
- [ ] **首页推荐待定**：D1 首页现在有 After Dada、DADA Newspaper、2000s Game Zine（已是 2025 年），和"首页放新一年作品"的要求冲突；D2 轮播第一个是 After Dada（和 Figma 一致）。等你决定是否调整，暂时不改。
- [x] 作品说明文字和作品名已全部换成我写的文本描述。
- [ ] 结尾青蛙照片只有 1024px，大屏上偏模糊；需要原图来替换。
- [ ] PLAY AREA 页面还没做（现在是空链接）；ABOUT ME 暂时跳到首页结尾的联系页。
- [x] 首页现在是六行、12 个作品。

## 6. 版本记录

| 版本 | 内容 |
|---|---|
| `2696e7e` | 建立 D1 / D2 / D3 三个独立文件夹 |
| `a97711e` | D1 网站完整版：17 个作品、素材压缩、作品详情页 |
| `1933f8d` | 开头动画恢复并加速；首页延伸到五行；联系页整页翻动；青蛙自动出发 |
| `0a1d65e` | 开头动画每次访问只播一次；苹果风格的作品出现动效 |
| `42e526d` | 新增这份要求汇总文件 |
| `0ec4458` | 视频作品鼠标移上去播放、视频作品放大格子、首页推荐改为新作且照片多的项目、Code For Fun 封面改用 FLORA-final 截图、新增 9 张 Code for fun 图片 |
| `59f335b` | 首页和 WORK 页：鼠标碰到作品时出现从作品里提取的小物品，并在作品框内跟随鼠标；WORK 页整行都可悬停；处理脚本保存到 tools/ |
| `23a042a` | 新建 D2 网站（按 Figma direction 2），D2 的要求另存在 D2/prompt |
| `3e5c595` | D1、D2 的 Switchback 作品页：介绍下面加一张大图，草图 → 线稿 → 渲染图轮流替换 |
| `e54898d` | Switchback 轮播大图的替换时间从 2.6 秒缩短到 1.5 秒 |
| `0721d79` | Ungreen Shop、Yiwugo、Nuclear Tide 改为 2024 年（D1、D2） |
| `f07e707` | Allodox 改为 2024；After Dada、2000s Game Zine、DADA Newspaper 改为 2025（D1、D2）；首页推荐待你决定，暂未调整 |
| `16be6b9` | Planting Pen：三对草图 ↔ 渲染图在图集里按正常大小每 1.5 秒互换（草图先）；方盒草图和 CLOSED FORM 从网站删除（D1、D2） |
| `842bbcf` | 用我的文本描述更新所有作品名、副标题和说明；图集按草图 → 场景 → 小物件 → 周边重新排序；新增 2023 年的 Restaurant；加入新图片和视频；D2 的 NEXT WORK 不触碰时不透明度降到 80%（D1、D2） |
| `21d1d70` | D1 作品页图文排版改为 Figma 的组合方式（图|文、图+图、文|图），每段文字都在图旁边，允许留白且每个作品不同；标签改为来自描述的类别，VIDEO 自动添加（D1、D2）；预览服务器改为并行处理，修复 D2 返回 WORK 后再点作品卡住 |
| `f6b353c` | WORK 页：鼠标没碰到作品时右侧预览图不显示 |
| `97b1f93` | Restaurant 换成 final renders（D1、D2）；D1 WORK 页标签加 ALL |
| `3ba0ce2` | Restaurant：平面图单独大图显示；入口和室外渲染图并列（新增 `big` / `pairs` 设置，D1、D2） |
| `fabdda1` | D1 首页加到六行：5:50 Cafe 放第一行大图，Dream Recovery 替换假面骑士，新增一行（Ungreen Shop 大图 + Lotus Cigarette 动画小图） |
| `d0feb94` | D1 首页第六行：Lotus Cigarette 动画换到大图，Ungreen Shop 换成小图 |
| `c86344d` | D1 首页第六行改为 Artificial Octopus（大）+ Lotus Cigarette（小），去掉 Ungreen Shop |
| `c0d660a` | Code For Fun：展会大墙和街头海报两张大图显示，顺序不变；`big` 改为在图集原位置全宽显示（D1、D2） |
| `aecb598` | D1 作品页：两张并排严格左右顶满，图文行贴齐左右两边（按 Figma 像素），单张图少量居中；D2 NEXT WORK 不触碰时不透明度降到 60% |
| `45cbb9f` | D1 Code For Fun：集装箱展台小图靠右对齐（新增 `right` 设置） |
| （本次） | Sónar：Visual Stage Design 替换舞台视觉设计（封面，D1、D2） |
