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
// 960px cover (tools/thumbs.ps1), so phones don't pull the 2400px originals
const thumbOf = (p) => `assets/thumbs/${p.slug}.jpg`;
const coverSrcset = (p) => {
  const m = coverItem(p);
  return m ? `${thumbOf(p)} 960w, ${coverOf(p)} ${m.w}w` : '';
};

/* Phones and tablets have no hover: there every video plays by itself, muted,
   while it is on screen, and stops when it scrolls away */
const TOUCH = !matchMedia('(hover: hover) and (pointer: fine)').matches;
// "reduce motion" is on: only the background drift (the cover parallax) stops; the designed
// animations (intro, reveals, page turn, frog) and the videos still play
const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
const inView = new IntersectionObserver((entries) => entries.forEach((e) => {
  // a card makes its clip only once it is actually on screen
  const v = e.target.tagName === 'VIDEO' ? e.target : e.target.__video?.(e.isIntersecting);
  if (!v) return;
  if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
}), { threshold: 0.35 });
function playWhileVisible(el) {
  if (el.tagName === 'VIDEO') { el.muted = true; el.playsInline = true; }
  inView.observe(el);
}

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
    if (TOUCH) {
      // no hover on a phone: the clip is made the first time the card comes on screen
      el.__video = (make) => {
        if (!v && make) { v = makeHoverVideo(m, p.start); v.preload = 'metadata'; box.append(v); }
        return v;
      };
      playWhileVisible(el);
      return;
    }
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
// tags come from each description's category line; VIDEO is never written by hand,
// every work with a film gets it
PROJECTS.forEach((p) => {
  if (mediaOf(p).some((m) => m.type === 'video') && !p.tags.includes('VIDEO')) p.tags.push('VIDEO');
});

function mediaHtml(m, { hero = false, alt = '' } = {}) {
  if (m.type === 'video') {
    const label = alt ? ` aria-label="${esc(alt)}"` : '';
    // the hero plays silently on loop; gallery videos wait for a click — except on phones,
    // where every video plays muted by itself while on screen (no controls to tap)
    if (TOUCH) return `<video src="${m.src}" poster="${m.poster}" muted loop playsinline preload="metadata"${hero ? ' autoplay' : ''}${label}></video>`;
    return hero
      ? `<video src="${m.src}" poster="${m.poster}" autoplay muted loop playsinline controls${label}></video>`
      : `<video src="${m.src}" poster="${m.poster}" controls playsinline preload="none"${label}></video>`;
  }
  return `<img src="${m.src}" width="${m.w}" height="${m.h}" alt="${esc(alt)}"${hero ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}

/* ---------- Scroll / load reveal ---------- */
function startReveals() {
  // headline words start clipped by their .line wrapper, so watch the wrapper
  const targets = new Map();
  // the trigger line is the bottom edge of the screen: a work starts to open the moment its
  // top edge comes into view (it used to wait until 15% of it showed, so tall pictures
  // popped open well up the screen)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        targets.get(e.target).classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0 });
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
  if (!items.length || STILL) return;
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
  const pieces = [['Hi', 'hi'], [',', 'comma'], [' '], ['I’m Zihe', 'name'], ['.']];
  intro.querySelector('.skip').textContent = TOUCH ? 'Tap to skip' : 'Click to skip';
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
      <div class="card-media parallax"><img src="${coverOf(p)}" srcset="${coverSrcset(p)}" sizes="(max-width: 720px) 100vw, 62vw" width="${coverItem(p)?.w || 1600}" height="${coverItem(p)?.h || 1000}" alt="" decoding="async"></div>
      <p class="card-title">${esc(p.title)}</p>
      ${tagsHtml(p.tags)}
    </a>`;
  const hasVideo = (p) => !!(p && hoverVideoOf(p));
  // entries are slugs, or { slug, keep: true } for a work that stays in the cell it's written in
  const list = FEATURED.map((f) => (typeof f === 'string' ? { slug: f } : f))
    .map((f) => ({ ...bySlug(f.slug), keep: !!f.keep })).filter((p) => p.slug);
  let html = '';
  for (let i = 0; i < list.length; i += 2) {
    const flip = (i / 2) % 2 === 1;
    let [a, b] = [list[i], list[i + 1]];
    const sizeA = flip ? 'lg' : 'sm';
    // works with a video take the large cell of their row (unless either is kept in place)
    if (b && !a.keep && !b.keep
      && ((sizeA === 'sm' && hasVideo(a) && !hasVideo(b)) || (sizeA === 'lg' && hasVideo(b) && !hasVideo(a)))) [a, b] = [b, a];
    html += `<div class="row ${flip ? 'row-2' : 'row-1'}">`
      + (a ? card(a, sizeA, 0) : '')
      + (b ? card(b, flip ? 'sm' : 'lg', 0.12) : '')
      + '</div>';
  }
  root.innerHTML = html;
  setupHoverVideos(root);
}

/* Ending: the work grid scrolls freely, but the contact screen turns like a page —
   any scroll that would reveal part of it carries you the whole way in (or back out).
   The turn is a spring on the scroll position (critically damped, no overshoot), so it can
   be turned around mid-way: scroll the other way and it heads back from where it is,
   keeping its speed, instead of making you wait for the first turn to finish. */
function setupContact(section) {
  const top = () => section.getBoundingClientRect().top;
  const sectionY = () => scrollY + top();
  const partlyIn = () => { const t = top(); return t > 1 && t < innerHeight - 1; };
  const atContact = () => Math.abs(top()) <= 2;

  const omega = (2 * Math.PI) / 0.55;  // spring response 0.55s, damping ratio 1
  let y = 0, v = 0, to = 0, moving = false, last = 0, settledAt = -1e9;
  const step = (now) => {
    const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60);
    last = now;
    v += (omega * omega * (to - y) - 2 * omega * v) * dt;
    y += v * dt;
    if (Math.abs(to - y) < 0.5 && Math.abs(v) < 20) { y = to; moving = false; settledAt = now; }
    scrollTo(0, y);
    if (moving) requestAnimationFrame(step);
  };
  const pageTo = (target) => {
    to = target;
    if (moving) return;  // already on its way: it just re-aims, keeping its speed
    y = scrollY; v = 0; moving = true; last = performance.now();
    requestAnimationFrame(step);
  };
  // the wheel's trailing momentum after a turn lands is swallowed, not turned into a scroll
  const busy = () => moving || performance.now() - settledAt < 150;
  // dir 1 = down, -1 = up; returns true when the page turn takes over the gesture
  const turn = (dir) => {
    if (moving) { pageTo(dir > 0 ? sectionY() : sectionY() - innerHeight); return true; }
    if (busy()) return true;
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
    if (!busy() && partlyIn()) pageTo(top() < innerHeight / 2 ? sectionY() : sectionY() - innerHeight);
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
  // ALL comes first and is on until a tag is picked
  filters.innerHTML = `<button class="chip" type="button" aria-pressed="true" data-all>ALL</button>`
    + allTags.map((t) => `<button class="chip" type="button" aria-pressed="false">${esc(t)}</button>`).join('');

  const years = [...new Set(PROJECTS.map((p) => p.year))].sort((a, b) => b - a);
  listRoot.innerHTML = years.map((y, gi) => `
    <section class="year-group">
      <h2 class="year reveal" style="--d:${0.05 + gi * 0.1}s">${y}</h2>
      <ul class="work-items">
        ${PROJECTS.filter((p) => p.year === y).map((p, i) => `
          <li class="reveal" style="--d:${0.1 + gi * 0.1 + i * 0.04}s" data-tags="${p.tags.join(' ')}" data-slug="${p.slug}">
            <a class="work-link" href="${projectUrl(p)}" data-slug="${p.slug}">
              <img class="work-thumb" src="${thumbOf(p)}" alt="" loading="lazy" decoding="async">
              <span class="name">${esc(p.title)}</span>${tagsHtml(p.tags)}
            </a>
          </li>`).join('')}
      </ul>
    </section>`).join('');

  const links = [...listRoot.querySelectorAll('.work-link')];
  let swapTimer, leaveTimer;
  // the preview only shows while a work is touched
  preview.classList.add('is-empty');
  const deactivate = () => {
    clearTimeout(swapTimer);
    links.forEach((l) => l.classList.remove('active'));
    preview.classList.add('is-empty');
    preview.querySelector('video')?.pause();
  };
  const activate = (link, instant) => {
    clearTimeout(leaveTimer);
    if (link.classList.contains('active')) return;
    // coming back from nothing: no cross-fade, the box just appears with the new work
    if (preview.classList.contains('is-empty')) instant = true;
    preview.classList.remove('is-empty');
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
  // leaving waits a moment, so sliding across the gap between two rows doesn't flash it off
  const leave = () => { clearTimeout(leaveTimer); leaveTimer = setTimeout(deactivate, 120); };
  links.forEach((link) => {
    const row = link.closest('li');
    row.addEventListener('mouseenter', () => activate(link));
    row.addEventListener('mouseleave', leave);
    link.addEventListener('focus', () => activate(link));
    link.addEventListener('blur', leave);
  });

  // one tag at a time; ALL, or pressing the active tag again, shows every work.
  // The tag is kept in the address (work.html?tag=MOTION), so a filtered list can be shared
  // and comes back with the Back button; a screen reader hears how many works are left
  const status = document.getElementById('filter-status');
  const pick = (tag, announce) => {
    filters.querySelectorAll('.chip').forEach((c) => {
      c.setAttribute('aria-pressed', String(tag ? c.textContent === tag : c.hasAttribute('data-all')));
    });
    listRoot.querySelectorAll('.work-items > li').forEach((li) => {
      li.hidden = !!tag && !li.dataset.tags.split(' ').includes(tag);
    });
    listRoot.querySelectorAll('.year-group').forEach((g) => {
      g.hidden = !g.querySelector('.work-items > li:not([hidden])');
    });
    if (!announce) return;
    const n = listRoot.querySelectorAll('.work-items > li:not([hidden])').length;
    if (status) status.textContent = `${n} ${n === 1 ? 'work' : 'works'}${tag ? `, ${tag}` : ''}`;
    const url = new URL(location.href);
    if (tag) url.searchParams.set('tag', tag); else url.searchParams.delete('tag');
    history.replaceState(null, '', url);
  };
  filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const on = !chip.hasAttribute('data-all') && chip.getAttribute('aria-pressed') !== 'true';
    pick(on ? chip.textContent : null, true);
  });
  const fromUrl = new URLSearchParams(location.search).get('tag');
  if (fromUrl && allTags.includes(fromUrl)) pick(fromUrl, false);
}

/* ---------- Project page ---------- */
function renderProject(root) {
  const slug = new URLSearchParams(location.search).get('p');
  const p = bySlug(slug) || null;
  if (!p) {
    root.innerHTML = `<p class="p-missing">There is no project at this address. <a href="work.html">See all work →</a></p>`;
    return;
  }
  document.title = `${p.title} — EBADUDU`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',
    `${p.title}: ${(p.subtitle || p.tags.join(', ')).split('|')[0].trim()}, ${p.year}. A project by Zihe Wang (EBADUDU).`);
  const media = mediaOf(p);
  // gallery pictures are named by their place in the work, so a screen reader can tell them apart
  const altOf = (m) => `${p.title}, ${m.type === 'video' ? 'film' : 'image'} ${(m.idx ?? media.indexOf(m)) + 1} of ${media.length}`;
  const heroIdx = p.hero || 0;
  const hero = media[heroIdx];
  // `sequence`: images that take turns in one big frame under the intro (e.g. sketch → line → render)
  // `swaps`: pairs that take turns inside a normal gallery image (sketch first), at the sketch's place
  // `hide`: images left off the site
  const seq = (p.sequence || []).map((i) => media[i]).filter(Boolean);
  // `big`: images shown on their own, full width, where they fall in the gallery
  const bigSet = new Set(p.big || []);
  // `pairs`: two images that always share one row, side by side
  const paired = new Map((p.pairs || []).flatMap(([a, b]) => [[a, b], [b, a]]));
  const swaps = p.swaps || [];
  const skip = new Set([heroIdx, ...(p.sequence || []), ...(p.hide || []), ...swaps.flatMap((g) => g.slice(1))]);
  const rest = [];
  media.forEach((m, i) => {
    if (skip.has(i)) return;
    const g = swaps.find((s) => s[0] === i);
    rest.push(g ? { ...m, idx: i, swap: g.map((k) => media[k]).filter(Boolean) } : { ...m, idx: i });
  });
  // images that can't sit beside text or pair up freely: fixed pairs, big ones, and the
  // ones given their own place (`right`, `size`), which always stand alone
  const ownPlace = new Set([...(p.right || []), ...Object.keys(p.size || {}).map(Number)]);
  const bound = (m) => paired.has(m.idx) || bigSet.has(m.idx) || ownPlace.has(m.idx);
  const solo = !rest.length;  // nothing but the hero (a single film or image)  // pairs: the second image follows the first by a beat
  // the clip sits on the inner .wipe — a fully clipped element never counts as "in view"
  const fig = (m, i = 0) => m.swap
    ? `<figure class="work-in swap" style="--r:${(m.w / m.h).toFixed(4)};--d:${i * 0.12}s"><div class="wipe">${
      m.swap.map((s, k) => `<img src="${s.src}" alt="${esc(altOf(s))}"${k ? '' : ' class="is-on"'} loading="lazy" decoding="async">`).join('')}</div></figure>`
    : `<figure class="work-in" style="--r:${(m.w / m.h).toFixed(4)};--d:${i * 0.12}s"><div class="wipe">${mediaHtml(m, { alt: altOf(m) })}</div></figure>`;
  const text = (t) => (t ? `<p class="p-text reveal" style="--d:.1s">${esc(t)}</p>` : '');

  // the description: first paragraph beside the lead image, last one beside the tail image,
  // any in between are set among the gallery rows
  const paras = p.text || [p.intro, p.detail].filter(Boolean);
  const firstText = paras[0];
  const lastText = paras.length > 1 ? paras[paras.length - 1] : '';
  const notes = paras.slice(1, -1);

  // The Figma composition: image | text, then image + image, then text | image, and so on.
  // Every paragraph sits beside an image, and every row keeps to the page's left and right
  // edges: two images always fill the row from edge to edge. The only free space is the gap
  // between an image and its text, and now and then a single image set in the middle; where
  // those singles fall is drawn from the work's own seed (the same on every visit).
  const rand = seeded(p.slug);
  // a big image, or one that must stay beside its partner, can't take the lead or tail place next to text
  const lead = rest.length && !bound(rest[0]) ? rest.shift() : null;
  const tail = rest.length > 1 && lastText && !bound(rest[rest.length - 1]) ? rest.pop() : null;
  let rows = '';
  let side = 'left';  // which side the next image-with-text row puts its picture
  const withText = (m, t) => {
    // Figma: image 795 | text 457 on the first row, text 457 | image 617 on the third (of 1392)
    const html = side === 'left'
      ? `<div class="p-row p-with" style="--w:57.11%">${fig(m)}${text(t)}</div>`
      : `<div class="p-row p-with" style="--w:44.32%">${text(t)}${fig(m)}</div>`;
    side = side === 'left' ? 'right' : 'left';
    return html;
  };
  // a row of images with no text: two side by side at one height, filling the row exactly,
  // or a single one — edge to edge when it is wide, otherwise in the middle
  const place = (items) => {
    if (items.length === 2) return `<div class="p-row p-place"><div class="p-duo">${items.map(fig).join('')}</div></div>`;
    const m = items[0];
    // `right`: singles that sit against the right edge instead of in the middle
    const where = m.w / m.h >= 1.7 ? 'p-full' : (p.right || []).includes(m.idx) ? 'p-center p-end' : 'p-center';
    // `size`: { index: factor } scales a single image down (e.g. 0.7 = 30% smaller)
    const k = (p.size || {})[m.idx];
    return `<div class="p-row p-place ${where}"${k ? ` style="--k:${k}"` : ''}>${fig(m)}</div>`;
  };

  if (lead) rows += withText(lead, firstText);
  // hero-only projects (a single film or image): the paragraphs share one row
  else if (solo) rows += `<div class="p-row p-with">${paras.map(text).join('')}</div>`;
  // the gallery opens with a fixed pair: the first paragraph stands in the text column above it
  else rows += `<div class="p-row p-note">${text(firstText)}</div>`;
  if (seq.length) {
    rows += `<figure class="p-seq work-in" style="--r:${(seq[0].w / seq[0].h).toFixed(4)}"><div class="wipe">${
      seq.map((m, i) => `<img src="${m.src}" alt="${esc(altOf(m))}"${i ? '' : ' class="is-on"'} decoding="async">`).join('')}</div></figure>`;
  }
  // the middle paragraphs are spread evenly through the gallery, each beside one of its images
  // (only images that are neither big nor fixed in a pair can carry one)
  const pending = solo ? [] : [...notes];
  const free = rest.map((m, k) => k).filter((k) => !bound(rest[k]));
  const noteAt = new Map();
  const loose = [];  // paragraphs that found no image of their own (very small galleries)
  pending.forEach((t, k) => {
    const at = free[Math.min(free.length - 1, Math.round((k + 1) * free.length / (pending.length + 1)))];
    if (at != null && !noteAt.has(at)) noteAt.set(at, t); else loose.push(t);
  });
  for (let i = 0; i < rest.length;) {
    if (noteAt.has(i)) { rows += withText(rest[i], noteAt.get(i)); i += 1; continue; }
    if (bigSet.has(rest[i].idx)) {
      const m = rest[i];
      rows += `<figure class="p-seq p-big work-in" style="--r:${(m.w / m.h).toFixed(4)}"><div class="wipe">${
        m.type === 'video' ? mediaHtml(m, { alt: altOf(m) }) : `<img src="${m.src}" alt="${esc(altOf(m))}" class="is-on" loading="lazy" decoding="async">`}</div></figure>`;
      i += 1;
      continue;
    }
    const after = rest[i + 1];
    const fixed = after && paired.get(rest[i].idx) === after.idx;
    // the next image carries a paragraph: hand it to this one instead, so nobody is left alone
    if (!fixed && after && noteAt.has(i + 1) && !bound(rest[i])) {
      noteAt.set(i, noteAt.get(i + 1));
      noteAt.delete(i + 1);
      continue;
    }
    // images go two by two. Only a stretch with an odd count (between paragraphs and fixed
    // images) leaves one over; it stands alone in the middle, at a place the seed picks
    let run = 0;
    while (i + run < rest.length && !noteAt.has(i + run) && !bound(rest[i + run])) run += 1;
    const canPair = after && !noteAt.has(i + 1) && !bound(rest[i]) && !bound(after);
    const alone = canPair && run % 2 === 1 && rand() < 0.5;
    const pair = fixed || (canPair && !alone);
    rows += place(rest.slice(i, i + (pair ? 2 : 1)));
    i += pair ? 2 : 1;
  }
  // they sit on their own, in the text column
  loose.forEach((n) => { rows += `<div class="p-row p-note">${text(n)}</div>`; });
  if (tail) { side = 'right'; rows += withText(tail, lastText); }
  else if (lastText && !solo) rows += `<div class="p-row p-note">${text(lastText)}</div>`;
  const next = PROJECTS[(PROJECTS.indexOf(p) + 1) % PROJECTS.length];
  root.innerHTML = `
    <figure class="p-hero work-in${p.fit === 'contain' ? ' contain' : ' parallax'}"><div class="wipe">${hero ? mediaHtml(hero, { hero: true, alt: p.title }) : ''}</div></figure>
    <h1 class="p-title reveal">${esc(p.title)}</h1>
    ${p.subtitle ? `<p class="p-sub reveal" style="--d:.04s">${esc(p.subtitle)}</p>` : ''}
    <div class="reveal" style="--d:.05s">${tagsHtml(p.tags)}</div>
    <div class="p-body">${rows}</div>
    <nav class="p-next"><span>Next project</span><a href="${projectUrl(next)}">${esc(next.title)} →</a></nav>`;
  const heroVideo = root.querySelector('.p-hero video');
  if (heroVideo) loopFrom(heroVideo, p.start);
  if (TOUCH) root.querySelectorAll('video').forEach(playWhileVisible);
  root.querySelectorAll('.p-seq:not(.p-big), figure.swap').forEach((el) => playSequence(el));
}

/* ---------- About Me ---------- */
function setupAbout(root) {
  // the toys on the first screen: each floats up and down on its own beat and slips away
  // from the mouse (or a finger), then drifts back home; their size follows the screen
  const toys = root.querySelector('#ab-toys');
  if (toys) {
    const hero = toys.parentElement;
    const rand = seeded('toy-energy');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const kept = ['550-cafe', 'switchback', 'planting-pen', 'sonar', 'leviairab', 'after-dada', 'game-zine', 'code-for-fun', 'allodox', 'ungreen-shop', 'yiwugo', 'nuclear-tide'];
    // homes (as parts of the first screen) around the top and right, clear of the title
    const homes = [[.1, .24], [.27, .15], [.46, .22], [.64, .13], [.84, .22], [.92, .44], [.74, .38], [.56, .44], [.36, .4], [.86, .66], [.68, .62], [.18, .42]];
    const items = kept.filter(bySlug).map((slug, i) => {
      const el = document.createElement('img');
      el.className = 'ab-toy';
      el.src = `assets/trinkets/${slug}.png`;
      el.alt = '';
      el.draggable = false;
      toys.append(el);
      const [hx, hy] = homes[i % homes.length];
      return {
        el, hx, hy,
        s: 90 + rand() * 60,                 // size on a 1392px-wide, 900px-tall screen
        rot: (rand() - 0.5) * 30,
        phase: rand() * Math.PI * 2,
        speed: 0.8 + rand() * 0.7,           // float rhythm, radians per second
        ox: 0, oy: 0, vx: 0, vy: 0,          // the push away from the mouse, and its speed
      };
    });
    let W = 0, H = 0, unit = 1;
    const measure = () => {
      W = hero.clientWidth;
      H = hero.clientHeight;
      unit = Math.max(0.5, Math.min(W / 1392, H / 900));
      items.forEach((it) => { it.el.style.width = `${Math.round(it.s * unit)}px`; });
    };
    measure();
    addEventListener('resize', measure);

    let mx = -1e5, my = -1e5;
    const aim = (e) => { const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; };
    const away = () => { mx = -1e5; my = -1e5; };
    hero.addEventListener('pointermove', aim);
    hero.addEventListener('pointerdown', aim);
    hero.addEventListener('pointerleave', away);
    hero.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') away(); });

    // only move while the first screen is in view
    let shown = true, lastT = 0;
    new IntersectionObserver(([e]) => { shown = e.isIntersecting; }).observe(hero);
    const tick = (now) => {
      requestAnimationFrame(tick);
      // k = frames of a 60Hz screen since the last one, so a 120Hz screen moves at the same speed
      const k = Math.min(3, lastT ? (now - lastT) / (1000 / 60) : 1);
      lastT = now;
      if (!shown) return;
      const reach = 160 + 120 * unit;            // how close the mouse may come before they move
      items.forEach((it) => {
        const hx = it.hx * W, hy = it.hy * H;
        const bob = still ? 0 : Math.sin((now / 1000) * it.speed + it.phase) * 16 * unit;
        const dx = hx + it.ox - mx, dy = hy + it.oy + bob - my;
        const d = Math.hypot(dx, dy) || 1;
        // a soft spring home, plus a push straight away from the mouse while it is near
        let fx = -it.ox * 0.026, fy = -it.oy * 0.026;
        if (d < reach) { const f = (1 - d / reach) * 9; fx += (dx / d) * f; fy += (dy / d) * f; }
        const drag = Math.pow(0.84, k);
        it.vx = (it.vx + fx * k) * drag;
        it.vy = (it.vy + fy * k) * drag;
        it.ox += it.vx * k;
        it.oy += it.vy * k;
        const tilt = it.rot + Math.max(-20, Math.min(20, it.vx * 2));
        it.el.style.transform = `translate(${(hx + it.ox).toFixed(1)}px, ${(hy + it.oy + bob).toFixed(1)}px) translate(-50%, -50%) rotate(${tilt.toFixed(1)}deg)`;
      });
    };
    requestAnimationFrame(tick);
  }

  // the info table: how much work, and which disciplines (from the tags)
  const years = PROJECTS.map((p) => p.year);
  const count = root.querySelector('#ab-count');
  if (count) count.textContent = `${PROJECTS.length} works, ${Math.min(...years)}–${Math.max(...years)}`;
  const tagsEl = root.querySelector('#ab-tags');
  if (tagsEl) {
    const n = {};
    PROJECTS.forEach((p) => p.tags.forEach((t) => { if (t !== 'VIDEO') n[t] = (n[t] || 0) + 1; }));
    tagsEl.innerHTML = tagsHtml(Object.keys(n).sort((a, b) => n[b] - n[a]));
  }
}

/* A steady random number source for a string: the same work always gets the same numbers */
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The sequence frame: images cross-fade in turn, starting from the first (the sketch)
   when the frame comes into view */
function playSequence(el, hold = 1500) {
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

  let frame = null, mx = 0, my = 0, x = 0, y = 0, tilt = 0, running = false, lastT = 0;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const target = () => {
    const r = frame.getBoundingClientRect();
    return [clamp(mx, r.left, r.right), clamp(my, r.top, r.bottom)];
  };
  const tick = (now) => {
    if (!frame) { running = false; lastT = 0; return; }
    // the same easing on any screen: k = 60Hz frames since the last one
    const k = Math.min(3, lastT ? (now - lastT) / (1000 / 60) : 1);
    lastT = now;
    const [tx, ty] = target();
    const a = 1 - Math.pow(0.8, k);
    const dx = (tx - x) * a, dy = (ty - y) * a;
    x += dx; y += dy;
    tilt += (clamp((dx / k) * 1.6, -18, 18) - tilt) * (1 - Math.pow(0.85, k));
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
const about = document.getElementById('about');
if (about) setupAbout(about);

// the begin animation plays once per visit (click or any key skips it); coming back
// from WORK or a project, or a link to #contact goes straight to the page
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
