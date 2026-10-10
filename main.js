const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- Project data helpers ---------- */
const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug);
const mediaOf = (p) => MEDIA[p.slug] || [];
const coverItem = (p) => mediaOf(p)[p.cover || 0];
const coverOf = (p) => {
  const m = coverItem(p);
  return m && (m.poster || m.src);
};
// the clip that plays on hover: `hoverVideo` if set, else the project's first video
const hoverVideoOf = (p) => {
  const media = mediaOf(p);
  return p.hoverVideo != null ? media[p.hoverVideo] : media.find((m) => m.type === 'video');
};
const projectUrl = (p) => `project.html?p=${encodeURIComponent(p.slug)}`;

/* Loop a video from `start` seconds (skips the ArtCenter title card at the head of some films) */
function loopFrom(v, start = 0) {
  if (!start) { v.loop = true; return v; }
  v.loop = false;
  const toStart = () => { v.currentTime = start; };
  if (v.readyState >= 1) toStart(); else v.addEventListener('loadedmetadata', toStart, { once: true });
  v.addEventListener('ended', () => { toStart(); v.play().catch(() => {}); });
  return v;
}

/* A muted clip laid over a still cover; fades in once it is actually playing */
function makeHoverVideo(m, start) {
  const v = document.createElement('video');
  v.className = 'hover-video';
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = m.src;
  v.addEventListener('playing', () => v.parentElement?.classList.add('is-playing'));
  return loopFrom(v, start);
}

/* Cards: the cover is a still; hovering plays the project's video over it */
function setupHoverVideos(root) {
  root.querySelectorAll('[data-slug]').forEach((el) => {
    const p = bySlug(el.dataset.slug);
    const m = p && hoverVideoOf(p);
    if (!m) return;
    const box = el.querySelector('.card-media');
    let v = null;
    el.addEventListener('mouseenter', () => {
      if (!v) { v = makeHoverVideo(m, p.start); box.append(v); }
      v.play().catch(() => {});
    });
    el.addEventListener('mouseleave', () => {
      if (!v) return;
      v.pause();
      box.classList.remove('is-playing');
    });
  });
}
const tagsHtml = (tags) => `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

function mediaHtml(m, { hero = false, alt = '' } = {}) {
  if (m.type === 'video') {
    // the hero plays silently on loop; gallery videos wait for a click
    return hero
      ? `<video src="${m.src}" poster="${m.poster}" autoplay muted loop playsinline controls></video>`
      : `<video src="${m.src}" poster="${m.poster}" controls playsinline preload="none"></video>`;
  }
  return `<img src="${m.src}" width="${m.w}" height="${m.h}" alt="${esc(alt)}"${hero ? '' : ' loading="lazy"'} decoding="async">`;
}

/* ---------- Scroll / load reveal ---------- */
function startReveals() {
  // headline words start clipped by their .line wrapper, so watch the wrapper
  const targets = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        targets.get(e.target).classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal, .work-in').forEach((el) => {
    const watch = el.closest('.line') || el;
    targets.set(watch, el);
    io.observe(watch);
  });
  startParallax();
}

/* Covers drift a little slower than the page (Apple-style depth). The image is
   scaled 1.1 inside its frame, so ±4% of travel never shows an edge. */
function startParallax() {
  const items = [...document.querySelectorAll('.parallax')];
  if (!items.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    items.forEach((box) => {
      const r = box.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      // -1 when the frame's centre is at the bottom of the screen, 1 at the top
      const p = (innerHeight / 2 - (r.top + r.height / 2)) / (innerHeight / 2 + r.height / 2);
      // a CSS variable, so a hover video added later lines up with the still under it
      box.style.setProperty('--py', `${(p * r.height * 0.04).toFixed(1)}px`);
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------- Begin animation (index only) ---------- */
async function playIntro(intro) {
  const helloText = document.getElementById('hello-text');
  const hello = document.getElementById('hello');
  const frog = document.getElementById('frog');
  const hiWrap = document.getElementById('hi-wrap');
  const hi = document.getElementById('hi');

  // split "Hi, I'm Zihe." into pieces (that later fly into the headline) and letters (for the stagger)
  const pieces = [['Hi', 'hi'], [',', 'comma'], [' '], ["I'm Zihe", 'name'], ['.']];
  let n = 0;
  const letters = (text) => [...text]
    .map((c) => `<span style="transition-delay:${0.1 + n++ * 0.025}s">${c === ' ' ? '&nbsp;' : c}</span>`)
    .join('');
  hi.innerHTML = pieces
    .map(([text, key]) => `<span class="piece"${key ? ` data-piece="${key}"` : ''}>${letters(text)}</span>`)
    .join('');
  document.querySelectorAll('.headline .extra').forEach((el) => {
    el.innerHTML = [...el.textContent]
      .map((c, i) => `<span style="transition-delay:${i * 0.05}s">${c === ' ' ? '&nbsp;' : c}</span>`)
      .join('');
  });

  let skipped = false;
  let hiShown = false;
  const finish = async () => {
    if (skipped) return;
    skipped = true;
    document.body.style.overflow = '';

    if (hiShown) {
      // Hello World + frog step aside, then "Hi, I'm Zihe." flies into the big headline
      intro.querySelector('.stage').classList.add('clear');
      await wait(250);
      const headline = document.querySelector('.headline');
      headline.classList.add('morph');
      const flights = flyToHeadline(hi, headline);
      await wait(300);
      intro.classList.add('is-leaving');
      startReveals();
      await Promise.all(flights.map((f) => f.finished));
      headline.classList.add('landed');  // real headline takes over, extra letters grow in
      flights.forEach((f) => f.effect.target.remove());
      document.body.classList.remove('intro-on');
    } else {
      intro.classList.add('is-leaving');
      document.body.classList.remove('intro-on');
      startReveals();
    }
    setTimeout(() => intro.classList.add('is-gone'), 900);
  };
  intro.addEventListener('click', finish);
  addEventListener('keydown', finish, { once: true });

  document.body.style.overflow = 'hidden';
  await document.fonts.ready;

  // 1. type "Hello World"
  await wait(200);
  for (const ch of 'Hello World') {
    if (skipped) return;
    helloText.textContent += ch;
    await wait(40 + Math.random() * 30);
  }
  await wait(220);
  hello.classList.add('typed');

  // 2. strike it out
  if (skipped) return;
  hello.classList.add('struck');
  await wait(420);

  // 3. Hello World slides left, "Hi, I'm Zihe." appears, frog pops up
  if (skipped) return;
  hiWrap.style.width = hi.scrollWidth + 'px';
  hi.classList.add('show');
  await wait(150);
  frog.classList.add('in');
  await wait(500);
  frog.classList.add('wiggle');
  hiShown = true;  // letters have landed, safe to fly

  // 4. short hold, then fly to the top-left and reveal the main page
  await wait(650);
  finish();
}

/* Clone each piece of "Hi, I'm Zihe." and move/scale it onto its matching
   piece in the headline (FLIP). Pieces with no match (the space and ".") fade out. */
function flyToHeadline(hi, headline) {
  const fromSize = parseFloat(getComputedStyle(hi).fontSize);
  const toSize = parseFloat(getComputedStyle(headline).fontSize);
  const ease = 'cubic-bezier(.76, 0, .24, 1)';

  const flights = [...hi.querySelectorAll('.piece')].map((piece, i) => {
    const from = piece.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fly';
    el.textContent = piece.textContent;
    Object.assign(el.style, { left: from.left + 'px', top: from.top + 'px', fontSize: fromSize + 'px' });
    document.body.append(el);

    const target = headline.querySelector(`[data-piece="${piece.dataset.piece}"]`);
    if (!target) {
      return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    }
    const to = target.getBoundingClientRect();
    return el.animate(
      [
        { transform: 'none' },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${toSize / fromSize})` },
      ],
      { duration: 800, delay: i * 30, easing: ease, fill: 'forwards' }
    );
  });
  hi.style.visibility = 'hidden';
  return flights;
}

/* ---------- Main page: featured cards (small · large / large · small) ---------- */
function renderFeatured(root) {
  const card = (p, size, d) => `
    <a class="card ${size} work-in" style="--d:${d}s" href="${projectUrl(p)}" data-slug="${p.slug}">
      <div class="card-media parallax"><img src="${coverOf(p)}" alt="${esc(p.title)}" decoding="async"></div>
      <p class="card-title">${esc(p.title)}</p>
      ${tagsHtml(p.tags)}
    </a>`;
  const hasVideo = (p) => !!(p && hoverVideoOf(p));
  const list = FEATURED.map(bySlug).filter(Boolean);
  let html = '';
  for (let i = 0; i < list.length; i += 2) {
    const flip = (i / 2) % 2 === 1;
    let [a, b] = [list[i], list[i + 1]];
    const sizeA = flip ? 'lg' : 'sm';
    // works with a video always take the large cell of their row
    if (b && ((sizeA === 'sm' && hasVideo(a) && !hasVideo(b)) || (sizeA === 'lg' && hasVideo(b) && !hasVideo(a)))) [a, b] = [b, a];
    html += `<div class="row ${flip ? 'row-2' : 'row-1'}">`
      + (a ? card(a, sizeA, 0) : '')
      + (b ? card(b, flip ? 'sm' : 'lg', 0.12) : '')
      + '</div>';
  }
  root.innerHTML = html;
  setupHoverVideos(root);
}

/* Ending: the work grid scrolls freely, but the contact screen turns like a page —
   any scroll that would reveal part of it carries you the whole way in (or back out). */
function setupContact(section) {
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let busy = false;
  const top = () => section.getBoundingClientRect().top;
  const sectionY = () => scrollY + top();
  const partlyIn = () => { const t = top(); return t > 1 && t < innerHeight - 1; };
  const atContact = () => Math.abs(top()) <= 2;

  const pageTo = (y) => {
    busy = true;
    const from = scrollY, dist = y - from, t0 = performance.now(), dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + dist * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else setTimeout(() => { busy = false; }, 150);  // swallow the wheel's trailing momentum
    };
    requestAnimationFrame(step);
  };
  // dir 1 = down, -1 = up; returns true when the page turn takes over the gesture
  const turn = (dir) => {
    if (busy) return true;
    if (dir > 0 && partlyIn()) { pageTo(sectionY()); return true; }
    if (dir < 0 && (atContact() || partlyIn())) { pageTo(sectionY() - innerHeight); return true; }
    return false;
  };

  addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) >= 1 && turn(Math.sign(e.deltaY))) e.preventDefault();
  }, { passive: false });
  addEventListener('keydown', (e) => {
    const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
    if (dir && turn(dir)) e.preventDefault();
  });
  let y0 = null;
  addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = y0 - e.touches[0].clientY;
    if (Math.abs(dy) > 12 && turn(Math.sign(dy)) && e.cancelable) e.preventDefault();
  }, { passive: false });
  // scrollbar drags and fling momentum: settle on whichever side is closer
  addEventListener('scrollend', () => {
    if (!busy && partlyIn()) pageTo(top() < innerHeight / 2 ? sectionY() : sectionY() - innerHeight);
  });

  // the frog sets off by itself once the contact screen is in place: head first, then body
  // the nav stays on screen here, as in the Figma frame
  new IntersectionObserver(([e]) => {
    if (e.intersectionRatio >= 0.9) section.classList.add('is-up');
    else if (e.intersectionRatio < 0.3) section.classList.remove('is-up');
    document.body.classList.toggle('on-contact', e.intersectionRatio >= 0.9);
  }, { threshold: [0, 0.3, 0.9, 1] }).observe(section);
}

/* ---------- Work page: tag filter + year list → hover preview ---------- */
function setupWorkList(listRoot) {
  const preview = document.getElementById('preview');
  const filters = document.getElementById('filters');

  // tags in order of how often they appear
  const counts = {};
  PROJECTS.forEach((p) => p.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  const allTags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  filters.innerHTML = allTags.map((t) => `<button class="chip" type="button" aria-pressed="false">${esc(t)}</button>`).join('');

  const years = [...new Set(PROJECTS.map((p) => p.year))].sort((a, b) => b - a);
  listRoot.innerHTML = years.map((y, gi) => `
    <section class="year-group">
      <h2 class="year reveal" style="--d:${0.05 + gi * 0.1}s">${y}</h2>
      <ul class="work-items">
        ${PROJECTS.filter((p) => p.year === y).map((p, i) => `
          <li class="reveal" style="--d:${0.1 + gi * 0.1 + i * 0.04}s" data-tags="${p.tags.join(' ')}" data-slug="${p.slug}">
            <a class="work-link" href="${projectUrl(p)}" data-slug="${p.slug}">
              <span class="name">${esc(p.title)}</span>${tagsHtml(p.tags)}
            </a>
          </li>`).join('')}
      </ul>
    </section>`).join('');

  const links = [...listRoot.querySelectorAll('.work-link')];
  let swapTimer;
  const activate = (link, instant) => {
    if (link.classList.contains('active')) return;
    links.forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
    const p = bySlug(link.dataset.slug);
    const m = coverItem(p);
    // reshape the box to the cover's proportions while the old image fades out
    if (m) preview.style.setProperty('--r', (m.w / m.h).toFixed(4));
    const show = () => {
      preview.innerHTML = `<img src="${coverOf(p)}" alt="">`;
      preview.classList.remove('is-playing', 'swap');
      // works with a video play it right away while hovered
      const hv = hoverVideoOf(p);
      if (hv) {
        const v = makeHoverVideo(hv, p.start);
        preview.append(v);
        v.play().catch(() => {});
      }
    };
    clearTimeout(swapTimer);
    if (instant) return show();
    preview.classList.add('swap');
    swapTimer = setTimeout(show, 180);
  };
  // the whole row is the hover target, not just the words
  links.forEach((link) => {
    link.closest('li').addEventListener('mouseenter', () => activate(link));
    link.addEventListener('focus', () => activate(link));
  });
  if (links[0]) activate(links[0], true);

  // one tag at a time; pressing the active chip again clears the filter
  filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const on = chip.getAttribute('aria-pressed') !== 'true';
    filters.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', String(on));
    const tag = on ? chip.textContent : null;
    listRoot.querySelectorAll('.work-items > li').forEach((li) => {
      li.hidden = !!tag && !li.dataset.tags.split(' ').includes(tag);
    });
    listRoot.querySelectorAll('.year-group').forEach((g) => {
      g.hidden = !g.querySelector('.work-items > li:not([hidden])');
    });
    const first = listRoot.querySelector('.work-items > li:not([hidden]) .work-link');
    if (first) activate(first);
  });
}

/* ---------- Project page ---------- */
function renderProject(root) {
  const slug = new URLSearchParams(location.search).get('p');
  const p = bySlug(slug) || null;
  if (!p) {
    root.innerHTML = `<p class="p-missing">Project not found. <a href="work.html">Back to work →</a></p>`;
    return;
  }
  document.title = `${p.title} — EBADUDU`;
  const media = mediaOf(p);
  const heroIdx = p.hero || 0;
  const hero = media[heroIdx];
  // `sequence`: images that take turns in one big frame under the intro (e.g. sketch → line → render)
  const seqIdx = p.sequence || [];
  const seq = seqIdx.map((i) => media[i]).filter(Boolean);
  const rest = media.filter((_, i) => i !== heroIdx && !seqIdx.includes(i));
  // pairs: the second image follows the first by a beat
  // the clip sits on the inner .wipe — a fully clipped element never counts as "in view"
  const fig = (m, i = 0) => `<figure class="work-in" style="--r:${(m.w / m.h).toFixed(4)};--d:${i * 0.12}s"><div class="wipe">${mediaHtml(m, { alt: p.title })}</div></figure>`;
  const text = (t) => (t ? `<p class="p-text reveal" style="--d:.1s">${esc(t)}</p>` : '');

  // lead row (image + intro), tail row (detail + image), justified pairs in between
  const lead = rest.shift();
  const tail = rest.length > 1 && p.detail ? rest.pop() : null;
  let rows = '';
  if (lead) rows += `<div class="p-row p-lead">${fig(lead)}${text(p.intro)}</div>`;
  // hero-only projects (a single film or image): both paragraphs share one row
  else rows += `<div class="p-row p-lead">${text(p.intro)}${text(p.detail)}</div>`;
  if (seq.length) {
    rows += `<figure class="p-seq work-in" style="--r:${(seq[0].w / seq[0].h).toFixed(4)}"><div class="wipe">${
      seq.map((m, i) => `<img src="${m.src}" alt="${esc(p.title)}"${i ? '' : ' class="is-on"'} decoding="async">`).join('')}</div></figure>`;
  }
  for (let i = 0; i < rest.length; i += 2) {
    const pair = rest.slice(i, i + 2);
    rows += pair.length === 2
      ? `<div class="p-row p-pair">${pair.map(fig).join('')}</div>`
      : `<div class="p-row p-single">${fig(pair[0])}</div>`;
  }
  if (tail) rows += `<div class="p-row p-tail">${text(p.detail)}${fig(tail)}</div>`;
  else if (p.detail && lead) rows += `<div class="p-row p-tail">${text(p.detail)}</div>`;

  const next = PROJECTS[(PROJECTS.indexOf(p) + 1) % PROJECTS.length];
  root.innerHTML = `
    <figure class="p-hero work-in${p.fit === 'contain' ? ' contain' : ' parallax'}"><div class="wipe">${hero ? mediaHtml(hero, { hero: true, alt: p.title }) : ''}</div></figure>
    <h1 class="p-title reveal">${esc(p.title)}</h1>
    <div class="reveal" style="--d:.05s">${tagsHtml(p.tags)}</div>
    <div class="p-body">${rows}</div>
    <nav class="p-next"><span>Next project</span><a href="${projectUrl(next)}">${esc(next.title)} →</a></nav>`;
  const heroVideo = root.querySelector('.p-hero video');
  if (heroVideo) loopFrom(heroVideo, p.start);
  const seqEl = root.querySelector('.p-seq');
  if (seqEl) playSequence(seqEl);
}

/* The sequence frame: images cross-fade in turn, starting from the first (the sketch)
   when the frame comes into view */
function playSequence(el, hold = 2600) {
  const imgs = [...el.querySelectorAll('img')];
  let n = 0, timer = 0;
  const go = () => {
    imgs.forEach((im, i) => im.classList.toggle('is-on', i === n));
    timer = setTimeout(() => { n = (n + 1) % imgs.length; go(); }, hold);
  };
  // it starts at the sketch; scrolling away only pauses it, coming back carries on
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) go();
    if (!e.isIntersecting && timer) { clearTimeout(timer); timer = 0; }
  }, { threshold: 0.15 }).observe(el);
}

/* ---------- Hover trinket: a small object from each work follows the mouse ----------
   Each work has a cut-out in assets/trinkets/<slug>.png. While a project is hovered it
   trails the cursor (eased, tilting with its speed) but its centre never leaves that
   project's frame: the card image on the home page, the row on the WORK page. */
function setupTrinkets(selector, frameOf) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const holder = document.createElement('div');
  holder.className = 'trinket';
  holder.setAttribute('aria-hidden', 'true');
  const img = document.createElement('img');
  img.alt = '';
  holder.append(img);
  document.body.append(holder);

  let frame = null, mx = 0, my = 0, x = 0, y = 0, tilt = 0, running = false;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const target = () => {
    const r = frame.getBoundingClientRect();
    return [clamp(mx, r.left, r.right), clamp(my, r.top, r.bottom)];
  };
  const tick = () => {
    if (!frame) { running = false; return; }
    const [tx, ty] = target();
    const dx = (tx - x) * 0.2, dy = (ty - y) * 0.2;
    x += dx; y += dy;
    tilt += (clamp(dx * 1.6, -18, 18) - tilt) * 0.15;
    holder.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
    requestAnimationFrame(tick);
  };

  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      mx = e.clientX; my = e.clientY;
      frame = frameOf(el);
      img.src = `assets/trinkets/${el.dataset.slug}.png`;
      if (!holder.classList.contains('is-on')) { [x, y] = target(); tilt = 0; }  // appear right at the cursor
      holder.classList.add('is-on');
      if (!running) { running = true; requestAnimationFrame(tick); }
    });
    el.addEventListener('pointerleave', () => {
      frame = null;
      holder.classList.remove('is-on');
    });
  });

  // warm the cache so the first hover shows the object at once
  const warm = () => document.querySelectorAll(selector).forEach((el) => { new Image().src = `assets/trinkets/${el.dataset.slug}.png`; });
  setTimeout(warm, 1200);
}

/* ---------- Nav: white bar after scrolling, hides going down, returns going up ---------- */
function setupNav(nav) {
  let lastY = scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 200 && y > lastY);
    lastY = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---------- Boot ---------- */
setupNav(document.querySelector('.nav'));
const featured = document.getElementById('featured');
if (featured) {
  renderFeatured(featured);
  setupTrinkets('#featured .card', (el) => el.querySelector('.card-media'));
}
const contact = document.getElementById('contact');
if (contact) setupContact(contact);
const workList = document.getElementById('work-list');
if (workList) {
  setupWorkList(workList);
  setupTrinkets('#work-list .work-items > li', (el) => el);
}
const project = document.getElementById('project');
if (project) renderProject(project);

// the begin animation plays once per visit (click or any key skips it); coming back
// from WORK or a project, or a direct link to #contact, goes straight to the page
let seenIntro = false;
try { seenIntro = sessionStorage.getItem('ebadudu-intro') === '1'; } catch (e) {}
const intro = document.getElementById('intro');
if (intro && !seenIntro && !location.hash) {
  try { sessionStorage.setItem('ebadudu-intro', '1'); } catch (e) {}
  playIntro(intro);
} else {
  intro?.classList.add('is-gone');
  document.body.classList.remove('intro-on');
  startReveals();
}
