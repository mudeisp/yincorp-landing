const edition = document.querySelector('[data-edition]');
const root = document.documentElement;
const modes = [...document.querySelectorAll('[data-mode]')];
const sections = [...document.querySelectorAll('.chapter')];
const context = document.querySelector('#explore');
const reading = document.querySelector('#capitulos');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
const updateMotion = () => {
  root.dataset.motion = preference.matches || connection?.saveData || (navigator.deviceMemory ?? 4) < 4 ? 'reduced' : 'full';
};
updateMotion();
preference.addEventListener('change', updateMotion);
connection?.addEventListener?.('change', updateMotion);

function setMode(mode) {
  root.dataset.mode = mode;
  for (const link of modes) {
    if (link.dataset.mode === mode) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}
setMode(location.hash.startsWith('#ent-') || location.hash === '#explore' ? 'explore' : location.hash === '#cinema' || !location.hash ? 'cinema' : 'editorial');

let lastChapter = '';
function measurePosition() {
  const max = edition.offsetHeight;
  const progress = Math.max(0, Math.min(1, (innerHeight - edition.getBoundingClientRect().top) / max));
  root.style.setProperty('--progress', progress);
  let current;
  for (const section of sections) {
    if (section.getBoundingClientRect().top >= innerHeight * .38) break;
    current = section;
  }
  for (const link of reading.querySelectorAll('a')) {
    if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  if (current && current.getBoundingClientRect().bottom > innerHeight * .3) lastChapter = current.id;
}
let frame = 0;
function queueMeasure() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    measurePosition();
  });
}
addEventListener('scroll', queueMeasure, { passive: true });
addEventListener('resize', queueMeasure);
measurePosition();

for (const link of modes) {
  link.addEventListener('click', (event) => {
    setMode(link.dataset.mode);
    if (link.dataset.mode === 'editorial' && lastChapter) {
      event.preventDefault();
      location.hash = lastChapter;
    }
  });
}

const filter = context.querySelector('select');
const profiles = [...context.querySelectorAll('[data-entity]')];
filter.parentElement.hidden = false;
filter.addEventListener('change', () => {
  for (const profile of profiles) profile.hidden = Boolean(filter.value && profile.dataset.entity !== filter.value);
});
function openProfile() {
  if (!location.hash.startsWith('#ent-')) return;
  const target = document.getElementById(location.hash.slice(1));
  if (!profiles.includes(target)) return;
  setMode('explore');
  target.hidden = false;
  target.open = true;
  target.scrollIntoView({ block: 'start' });
}
addEventListener('hashchange', openProfile);
openProfile();

const network = context.querySelector('[data-network]');
const leadingProfile = profiles.find((profile) => profile.id === 'ent-' + edition.dataset.edition);
const relationships = [...leadingProfile.querySelectorAll('.connections a')];
if (relationships.length) {
  network.hidden = false;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 760 150');
  svg.setAttribute('focusable', 'false');
  function item(tag, attributes, label) {
    const node = document.createElementNS(svg.namespaceURI, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (label) node.textContent = label;
    svg.append(node);
  }
  relationships.forEach((link, index) => {
    const x = 120 + 520 * (index + 1) / (relationships.length + 1);
    item('path', { d: 'M380 36 Q380 80 ' + x + ' 99' });
    item('circle', { cx: x, cy: 99, r: 4 });
    item('text', { x, y: index % 2 ? 142 : 121, 'text-anchor': 'middle' }, link.textContent);
  });
  item('circle', { cx: 380, cy: 36, r: 5 });
  item('text', { x: 380, y: 22, 'text-anchor': 'middle' }, leadingProfile.querySelector('summary').textContent);
  network.append(svg);
}

const dialog = document.querySelector('.zoom-dialog');
let opener = null;
if (typeof dialog.showModal === 'function') {
  document.querySelector('.gallery').addEventListener('click', (event) => {
    const link = event.target.closest('[data-zoom]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    dialog.querySelector('figure').replaceChildren(link.querySelector('img').cloneNode(), link.parentElement.querySelector('figcaption').cloneNode(true));
    dialog.showModal();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
}

if (typeof window.gtag === 'function') {
  const send = (event, params) => window.gtag('event', event, { editorial_edition: edition.dataset.edition, ...params });
  const seen = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !seen.has(entry.target.id)) {
        seen.add(entry.target.id);
        send('architecture_chapter_view', { editorial_chapter: entry.target.id, editorial_mode: root.dataset.mode });
      }
    }
  }, { rootMargin: '-85px 0px -50% 0px' });
  sections.forEach((section) => observer.observe(section));
  edition.querySelector('[data-contact]').addEventListener('click', () => send('architecture_contact_click', {}));
  const thresholds = [25, 50, 75, 90];
  let activeStart = performance.now();
  function measureEngagement() {
    if (document.visibilityState === 'visible') {
      activeStart ??= performance.now();
      return;
    }
    if (activeStart === null) return;
    const seconds = Math.round((performance.now() - activeStart) / 1000);
    activeStart = null;
    if (seconds) send('architecture_engagement', { editorial_visible_seconds: seconds });
  }
  document.addEventListener('visibilitychange', measureEngagement);
  addEventListener('scroll', () => {
    const progress = 100 * (innerHeight - edition.getBoundingClientRect().top) / edition.offsetHeight;
    while (thresholds.length && progress >= thresholds[0]) send('architecture_read_depth', { editorial_percent: thresholds.shift() });
  }, { passive: true });
}
