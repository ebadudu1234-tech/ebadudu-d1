# D1 — direction 1 (EBADUDU)

Portfolio site built from Figma page "direction 1".

## Pages
- `index.html` — begin animation (Hello World → strike → frog → "Hi, I'm Zihe."), featured work grid, "Get in touch" ending with the scrolling frog photo
- `work.html` — all work by year, tag filter chips, hover preview that takes each cover's shape
- `project.html?p=<slug>` — hero, title, tags, image/text rows

## Editing
- Words, years, tags, home-page picks: `data.js`
- Images/videos: `assets/work/<slug>/`, listed in `media.js` (generated; the web-ready copies come from each work's `press/` folder)

## Run locally
```
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8781
```
then open http://localhost:8781
