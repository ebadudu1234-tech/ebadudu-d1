# Builds the small hover objects ("trinkets") for every work into website/D1/assets/trinkets/<slug>.png
#  cut  : remove the background that touches the crop's edges (sampled from the edge pixels),
#         strip thin label lines, keep the main object, soften the edge
#  rect : keep the crop as-is (a little print / magazine / film still)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Trinket {
  static Bitmap Scaled(Bitmap src, Rectangle crop, int maxSide) {
    double s = Math.Min(1.0, (double)maxSide / Math.Max(crop.Width, crop.Height));
    int w = Math.Max(1, (int)Math.Round(crop.Width * s)), h = Math.Max(1, (int)Math.Round(crop.Height * s));
    var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp)) {
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
      using (var ia = new ImageAttributes()) {
        ia.SetWrapMode(System.Drawing.Drawing2D.WrapMode.TileFlipXY);
        g.DrawImage(src, new Rectangle(0, 0, w, h), crop.X, crop.Y, crop.Width, crop.Height, GraphicsUnit.Pixel, ia);
      }
    }
    return bmp;
  }

  static int[] Pixels(Bitmap b) {
    var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var px = new int[b.Width * b.Height];
    Marshal.Copy(d.Scan0, px, 0, px.Length);
    b.UnlockBits(d);
    return px;
  }

  static void Write(Bitmap b, int[] px) {
    var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    Marshal.Copy(px, 0, d.Scan0, px.Length);
    b.UnlockBits(d);
  }

  static int Dist(int a, int b) {
    int dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255);
    return (int)Math.Sqrt(dr * dr + dg * dg + db * db);
  }

  static bool[] Morph(bool[] m, int w, int h, int r, bool erode) {
    var o = new bool[m.Length];
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      bool v = erode;
      for (int dy = -r; dy <= r && v == erode; dy++) for (int dx = -r; dx <= r; dx++) {
        int xx = x + dx, yy = y + dy;
        bool s = (xx < 0 || yy < 0 || xx >= w || yy >= h) ? false : m[yy * w + xx];
        if (erode && !s) { v = false; break; }
        if (!erode && s) { v = true; break; }
      }
      o[y * w + x] = v;
    }
    return o;
  }

  // returns "WxH" of the saved png
  public static string Cut(string srcPath, int cx, int cy, int cw, int ch, int tol, int open, bool holes, int shadowChroma, int outMax, string outPath) {
    using (var src = new Bitmap(srcPath))
    using (var bmp = Scaled(src, new Rectangle(cx, cy, cw, ch), 900)) {
      int w = bmp.Width, h = bmp.Height;
      var px = Pixels(bmp);
      // background model: edge pixels, minus outliers (parts of the object touching the edge)
      var edge = new List<int>();
      for (int x = 0; x < w; x++) { edge.Add(px[x]); edge.Add(px[(h - 1) * w + x]); }
      for (int y = 0; y < h; y++) { edge.Add(px[y * w]); edge.Add(px[y * w + w - 1]); }
      var rs = new List<int>(); var gs = new List<int>(); var bs = new List<int>();
      foreach (var p in edge) { rs.Add((p >> 16) & 255); gs.Add((p >> 8) & 255); bs.Add(p & 255); }
      rs.Sort(); gs.Sort(); bs.Sort();
      int med = (255 << 24) | (rs[rs.Count / 2] << 16) | (gs[gs.Count / 2] << 8) | bs[bs.Count / 2];
      var samples = new List<int>();
      int step = Math.Max(1, edge.Count / 400);
      for (int i = 0; i < edge.Count; i += step) if (Dist(edge[i], med) < 90) samples.Add(edge[i]);
      if (samples.Count == 0) samples.Add(med);

      var bgLike = new bool[w * h];
      for (int i = 0; i < px.Length; i++) {
        int best = 999;
        foreach (var s in samples) { int d = Dist(px[i], s); if (d < best) { best = d; if (best < tol) break; } }
        bgLike[i] = best < tol;
        // shadows cast on a neutral backdrop: greyish (low colour) pixels count as background too
        if (shadowChroma > 0 && !bgLike[i]) {
          int r = (px[i] >> 16) & 255, g = (px[i] >> 8) & 255, b = px[i] & 255;
          bgLike[i] = Math.Max(r, Math.Max(g, b)) - Math.Min(r, Math.Min(g, b)) < shadowChroma;
        }
      }
      // flood from the edges through background-like pixels
      var bg = new bool[w * h];
      var q = new Queue<int>();
      Action<int> push = (i) => { if (!bg[i] && bgLike[i]) { bg[i] = true; q.Enqueue(i); } };
      for (int x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
      for (int y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
      while (q.Count > 0) {
        int i = q.Dequeue(), x = i % w, y = i / w;
        if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
      }
      // holes: background patches walled in by the object (e.g. inside a strap loop) also go, if they are big
      if (holes) {
        var seen = new bool[w * h];
        for (int i = 0; i < bg.Length; i++) {
          if (bg[i] || !bgLike[i] || seen[i]) continue;
          var region = new List<int>(); seen[i] = true; q.Enqueue(i);
          while (q.Count > 0) {
            int k = q.Dequeue(), x = k % w, y = k / w; region.Add(k);
            int[] nb = { x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1 };
            foreach (var j in nb) if (j >= 0 && !seen[j] && !bg[j] && bgLike[j]) { seen[j] = true; q.Enqueue(j); }
          }
          if (region.Count > w * h / 200) foreach (var k in region) bg[k] = true;
        }
      }
      var fg = new bool[w * h];
      for (int i = 0; i < fg.Length; i++) fg[i] = !bg[i];
      // opening removes thin leftovers such as label lines and grass blades
      if (open > 0) fg = Morph(Morph(fg, w, h, open, true), w, h, open, false);
      // keep the big pieces only
      var lab = new int[w * h]; var sizes = new List<int> { 0 };
      for (int i = 0; i < fg.Length; i++) {
        if (!fg[i] || lab[i] != 0) continue;
        int id = sizes.Count, n = 0; lab[i] = id; q.Enqueue(i);
        while (q.Count > 0) {
          int k = q.Dequeue(), x = k % w, y = k / w; n++;
          for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
            int xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            int j = yy * w + xx; if (fg[j] && lab[j] == 0) { lab[j] = id; q.Enqueue(j); }
          }
        }
        sizes.Add(n);
      }
      int biggest = 0; foreach (var s in sizes) biggest = Math.Max(biggest, s);
      // alpha with a 1px soft edge
      var a = new float[w * h];
      for (int i = 0; i < a.Length; i++) a[i] = (fg[i] && sizes[lab[i]] >= biggest * 0.06) ? 1f : 0f;
      int minX = w, minY = h, maxX = -1, maxY = -1;
      for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
        float s = 0; int c = 0;
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          int xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; s += a[yy * w + xx]; c++;
        }
        int al = (int)Math.Round(255 * Math.Min(1f, a[y * w + x] * 0.6f + 0.4f * s / c) * (a[y * w + x] > 0 ? 1f : s / c));
        int i2 = y * w + x;
        px[i2] = (al << 24) | (px[i2] & 0xFFFFFF);
        if (al > 8) { minX = Math.Min(minX, x); maxX = Math.Max(maxX, x); minY = Math.Min(minY, y); maxY = Math.Max(maxY, y); }
      }
      Write(bmp, px);
      if (maxX < 0) throw new Exception("nothing left after cutting " + srcPath);
      var box = new Rectangle(Math.Max(0, minX - 2), Math.Max(0, minY - 2), Math.Min(w, maxX + 3) - Math.Max(0, minX - 2), Math.Min(h, maxY + 3) - Math.Max(0, minY - 2));
      using (var outB = Scaled(bmp, box, outMax)) { outB.Save(outPath, ImageFormat.Png); return outB.Width + "x" + outB.Height; }
    }
  }

  public static string Rect(string srcPath, int cx, int cy, int cw, int ch, int outMax, string outPath) {
    using (var src = new Bitmap(srcPath))
    using (var outB = Scaled(src, new Rectangle(cx, cy, cw, ch), outMax)) { outB.Save(outPath, ImageFormat.Png); return outB.Width + "x" + outB.Height; }
  }
}
'@

$W = "E:\Homework\NB web\MY WORK"; $S = "E:\Homework\NB web\website\D1"
$out = Join-Path $S 'assets\trinkets'; New-Item -ItemType Directory -Force $out | Out-Null
$max = 360
# slug, mode, source, crop x y w h (source px), tolerance, opening radius
$items = @(
  @('550-cafe',             'cut',  "$W\5：50\press\Enamel Pins Design.jpg",                 525, 372, 278, 298, 50, 1, 'shadow'),
  @('switchback',           'cut',  "$W\Switchback\press\Image 84.jpg",                        0,   0, 1024, 1024, 30, 1, 'holes'),
  @('under-the-cyber-skin', 'rect', "$W\Under the cyber skin\Myth3_Spreads_Page_heropage.jpg", 545, 380, 655, 520, 0, 0),
  @('planting-pen',         'cut',  "$W\Plant pen\press\REMOVE THE OTHER ELEMNT EXPECT OF THE PACK.jpg", 0, 0, 1264, 848, 26, 1),
  @('sonar',                'cut',  "$W\Sonar\press\Image 11.jpg",                          1330, 745, 210, 210, 45, 1),
  @('toyukukoku',           'rect', "$S\assets\work\toyukukoku\03.jpg",                         0,   0, 1600, 2071, 0, 0),
  @('lotus',                'rect', "$S\assets\work\lotus\01-poster.jpg",                     980,   0, 940, 900, 0, 0),
  @('ocupus',               'rect', "$S\assets\work\ocupus\01-poster.jpg",                    420,  60, 1080, 960, 0, 0),
  @('leviairab',            'cut',  "$W\LEVIAIRAB BOTTLE\press\Image 14.jpg",                 470,   5, 560, 1340, 30, 1),
  @('after-dada',           'cut',  "$W\After dada\After_Dadda_Page_11.jpg",                  240,   5, 560, 300, 30, 1),
  @('dada-newspaper',       'rect', "$W\DADA newspaper\press\page_01.jpg",                      0,   0, 2400, 3429, 0, 0),
  @('game-zine',            'cut',  "$W\2000s game zine\Siminar_4_W4_Page_3.jpg",             716, 452, 272, 550, 30, 1),
  @('code-for-fun',         'cut',  "$W\Code for fun\press\FLORA-Untitled-227a033b.jpg",        0,   0, 1248, 832, 26, 1),
  @('allodox',              'cut',  "$W\Allodox\ALLODOX-3_Page_24.jpg",                      1025, 1792, 285, 302, 40, 1),
  @('ungreen-shop',         'cut',  "$W\Ungreeen Shop\ungreen-3_Page_12.jpg",                1195, 178, 250, 150, 34, 1),
  @('yiwugo',               'cut',  "$W\Yiwugo\press\YIWUGO-3_Page_05.jpg",                   420, 425, 240, 255, 40, 1),
  @('restaurant',           'rect', "$W\restaurant and cafe\work\press\图层 14.jpg",           150, 380, 1300, 630, 0, 0),
  @('nuclear-tide',         'cut',  "$W\Zhangyu\zhangyu-3_Page_17.jpg",                      2820, 300, 640, 1450, 42, 3)
)
foreach ($t in $items) {
  $dest = Join-Path $out "$($t[0]).png"
  try {
    if ($t[1] -eq 'cut') { $size = [Trinket]::Cut($t[2], $t[3], $t[4], $t[5], $t[6], $t[7], $t[8], ($t.Count -gt 9 -and $t[9] -eq 'holes'), $(if ($t.Count -gt 9 -and $t[9] -eq 'shadow') { 42 } else { 0 }), $max, $dest) }
    else { $size = [Trinket]::Rect($t[2], $t[3], $t[4], $t[5], $t[6], $max, $dest) }
    "{0,-22} {1,-4} {2,9}  {3,4} KB" -f $t[0], $t[1], $size, [int]((Get-Item $dest).Length / 1KB)
  } catch { "{0,-22} ERROR {1}" -f $t[0], $_.Exception.InnerException.Message }
}
