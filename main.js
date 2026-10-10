const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- Project data helpers ---------- */
const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug);
const mediaOf = (p) => MEDIA[p.slug] || [];
const coverItem = (p) => mediaOf(p)[p.cover || 0];
const coverOf = (p) => {
  const m = coverItem(p);
  return m && (m.poster || m.src);
};
const projectUrl = (p) => `project.html?p=${encodeURIComponent(p.slug)}`;
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
  document.querySelectorAll('.reveal').forEach((el) => {
    const watch = el.closest('.line') || el;
    targets.set(watch, el);
    io.observe(watch);
  });
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
    .map((c) => `<span style="transition-delay:${0.25 + n++ * 0.04}s">${c === ' ' ? '&nbsp;' : c}</span>`)
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
      await wait(350);
      const headline = document.querySelector('.headline');
      headline.classList.add('morph');
      const flights = flyToHeadline(hi, headline);
      await wait(450);
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
  await wait(500);
  for (const ch of 'Hello World') {
    if (skipped) return;
    helloText.textContent += ch;
    await wait(75 + Math.random() * 60);
  }
  await wait(450);
  hello.classList.add('typed');

  // 2. strike it out
  if (skipped) return;
  hello.classList.add('struck');
  await wait(750);

  // 3. Hello World slides left, "Hi, I'm Zihe." appears, frog pops up
  if (skipped) return;
  hiWrap.style.width = hi.scrollWidth + 'px';
  hi.classList.add('show');
  await wait(250);
  frog.classList.add('in');
  await wait(800);
  frog.classList.add('wiggle');
  hiShown = true;  // letters have landed, safe to fly

  // 4. hold, then fly to the top-left and reveal the main page
  await wait(1200);
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
      { duration: 1100, delay: i * 40, easing: ease, fill: 'forwards' }
    );
  });
  hi.style.visibility = 'hidden';
  return flights;
}

/* ---------- Main page: featured cards (small · large / large · small) ---------- */
function renderFeatured(root) {
  const card = (p, size, d) => `
    <a class="card ${size} reveal" style="--d:${d}s" href="${projectUrl(p)}">
      <div class="card-media"><img src="${coverOf(p)}" alt="${esc(p.title)}" decoding="async"></div>
      <p class="card-title">${esc(p.title)}</p>
      ${tagsHtml(p.tags)}
    </a>`;
  const list = FEATURED.map(bySlug).filter(Boolean);
  let html = '';
  for (let i = 0; i < list.length; i += 2) {
    const flip = (i / 2) % 2 === 1;
    const [a, b] = [list[i], list[i + 1]];
    html += `<div class="row ${flip ? 'row-2' : 'row-1'}">`
      + (a ? card(a, flip ? 'lg' : 'sm', 0.15) : '')
      + (b ? card(b, flip ? 'sm' : 'lg', 0.25) : '')
      + '</div>';
  }
  root.innerHTML = html;
}

/* Ending: the frog photo travels from frame 1 to frame 2 as the section scrolls into view */
function setupContact(section) {
  const photo = section.querySelector('.contact-photo');
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = section.getBoundingClientRect();
    // 0 when the section's top touches the bottom of the screen, 1 when it reaches the top
    const p = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
    photo.style.setProperty('--p', p.toFixed(4));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
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
          <li class="reveal" style="--d:${0.1 + gi * 0.1 + i * 0.04}s" data-tags="${p.tags.join(' ')}">
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
      preview.classList.remove('swap');
    };
    clearTimeout(swapTimer);
    if (instant) return show();
    preview.classList.add('swap');
    swapTimer = setTimeout(show, 180);
  };
  links.forEach((link) => {
    link.addEventListener('mouseenter', () => activate(link));
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
  const rest = media.filter((_, i) => i !== heroIdx);
  const fig = (m) => `<figure class="reveal" style="--r:${(m.w / m.h).toFixed(4)}">${mediaHtml(m, { alt: p.title })}</figure>`;
  const text = (t) => (t ? `<p class="p-text reveal" style="--d:.1s">${esc(t)}</p>` : '');

  // lead row (image + intro), tail row (detail + image), justified pairs in between
  const lead = rest.shift();
  const tail = rest.length > 1 && p.detail ? rest.pop() : null;
  let rows = '';
  if (lead) rows += `<div class="p-row p-lead">${fig(lead)}${text(p.intro)}</div>`;
  // hero-only projects (a single film or image): both paragraphs share one row
  else rows += `<div class="p-row p-lead">${text(p.intro)}${text(p.detail)}</div>`;
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
    <figure class="p-hero reveal${p.fit === 'contain' ? ' contain' : ''}">${hero ? mediaHtml(hero, { hero: true, alt: p.title }) : ''}</figure>
    <h1 class="p-title reveal">${esc(p.title)}</h1>
    <div class="reveal" style="--d:.05s">${tagsHtml(p.tags)}</div>
    <div class="p-body">${rows}</div>
    <nav class="p-next"><span>Next project</span><a href="${projectUrl(next)}">${esc(next.title)} →</a></nav>`;
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
if (featured) renderFeatured(featured);
const contact = document.getElementById('contact');
if (contact && !reduceMotion) setupContact(contact);
const workList = document.getElementById('work-list');
if (workList) setupWorkList(workList);
const project = document.getElementById('project');
if (project) renderProject(project);

// the intro plays once per visit; coming back to the home page skips straight to it
let seenIntro = false;
try { seenIntro = sessionStorage.getItem('ebadudu-intro') === '1'; } catch (e) {}
const intro = document.getElementById('intro');
if (intro && !reduceMotion && !seenIntro && !location.hash) {
  try { sessionStorage.setItem('ebadudu-intro', '1'); } catch (e) {}
  playIntro(intro);
} else {
  intro?.classList.add('is-gone');
  document.body.classList.remove('intro-on');
  startReveals();
}
