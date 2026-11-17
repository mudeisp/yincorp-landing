/* Enhances only the editorial components opted in by their templates. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mediaSelector = ':scope > img, :scope > :is(a, button, picture) > img';
  const optIn = '[data-cinematic-pan], [data-cinematic-reveal], [data-cinematic-sequence], [data-cinematic-wipe]';
  const stable = 'form, table, dialog, [role="tablist"], .ynti, .commercial-finance, .art-plans';
  const visibleFrames = new Set();
  const frames = new Map();
  const introducedHeroes = new WeakSet();
  const animated = new WeakSet();
  const activeAnimations = new Map();
  let frameRequest = 0;
  let tracking = false;

  function availableScale(image, width, height) {
    if (!image.naturalWidth || !width || !height) return 1;
    // srcset can density-correct naturalWidth. Recover the selected file's pixel width.
    const candidate = image.srcset.split(',').map(value => value.trim().split(/\s+/))
      .find(([url]) => url === image.currentSrc);
    const pixelWidth = Number(candidate?.[1]?.replace(/w$/, '')) || image.naturalWidth;
    const ratio = image.naturalWidth / image.naturalHeight;
    const coverWidth = Math.max(width, height * ratio);
    return Math.max(1, pixelWidth / (coverWidth * Math.max(1, window.devicePixelRatio)));
  }

  function drawPan() {
    frameRequest = 0;
    const height = window.innerHeight;
    const mobile = window.innerWidth <= 700;
    const updates = [];
    for (const frame of visibleFrames) {
      if (!frame.isConnected) {
        visibleFrames.delete(frame);
        frames.delete(frame);
        panObserver.unobserve(frame);
        continue;
      }
      const image = frames.get(frame);
      const bounds = frame.getBoundingClientRect();
      const headroom = availableScale(image, image.offsetWidth, image.offsetHeight);
      const hero = frame.hasAttribute('data-cinematic-hero');
      // Leave a small margin inside the overscan so the edge stays covered throughout.
      const scale = Math.min(mobile ? 1.09 : hero ? 1.24 : 1.18, headroom);
      const distance = Math.max(0, (scale - 1) * 50 - 0.6);
      const start = height * 0.86;
      const progress = Math.max(0, Math.min(1, (start - bounds.top) / (start + bounds.height * 0.2)));
      const direction = frame.dataset.cinematicPan === 'reverse' ? -1 : 1;
      const introduce = hero && image.naturalWidth > 0 &&
        bounds.top < height - 32 && bounds.bottom > 64 && !introducedHeroes.has(frame);
      updates.push({ frame, image, scale, offset: (progress * 2 - 1) * distance * direction, introduce, headroom });
    }
    for (const { frame, image, scale, offset, introduce, headroom } of updates) {
      frame.style.setProperty('--cinematic-x', offset.toFixed(2) + '%');
      frame.style.setProperty('--cinematic-scale', scale.toFixed(3));
      if (introduce) {
        introducedHeroes.add(frame);
        animate(image, [
          { opacity: 0.68, transform: 'scale(' + Math.min(1.07, headroom / scale) + ')' },
          { opacity: 1, transform: 'none' },
        ], { duration: 1700, easing: 'ease-out' });
      }
    }
  }

  function schedulePan() {
    if (!preference.matches && visibleFrames.size && !frameRequest) {
      frameRequest = requestAnimationFrame(drawPan);
    }
  }

  function syncScrollListener() {
    const needed = visibleFrames.size > 0 && !preference.matches;
    if (needed === tracking) return;
    tracking = needed;
    if (needed) window.addEventListener('scroll', schedulePan, { passive: true });
    else window.removeEventListener('scroll', schedulePan);
  }

  function animate(node, frames, options) {
    const animation = node.animate(frames, options);
    activeAnimations.set(node, animation);
    animation.finished.catch(() => {}).finally(() => {
      if (activeAnimations.get(node) === animation) activeAnimations.delete(node);
    });
  }

  function arrive(node, delay = 0) {
    if (node.matches(':focus-within')) return;
    animate(node, [
      { opacity: 0.28, translate: '0 24px' },
      { opacity: 1, translate: 'none' },
    ], { duration: 760, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  }

  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const panObserver = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) visibleFrames.add(target);
      else visibleFrames.delete(target);
    }
    syncScrollListener();
    schedulePan();
  });

  const revealObserver = new IntersectionObserver(entries => {
    // A small stagger across simultaneous arrivals keeps rows legible on quick scroll.
    entries.filter(entry => entry.isIntersecting).forEach(({ target }, index) => {
      revealObserver.unobserve(target);
      if (preference.matches || animated.has(target) || target.matches(':focus-within')) return;
      animated.add(target);
      if (target.hasAttribute('data-cinematic-wipe')) {
        animate(target, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }],
          { duration: 1200, delay: 150, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        return;
      }
      if (target.hasAttribute('data-cinematic-sequence')) {
        const parts = target.querySelectorAll(':scope > :is(h1,h2,h3,p), :scope > div > :is(h1,h2,h3,p)');
        parts.forEach((part, step) => arrive(part, Math.min(step, 3) * 145));
        return;
      }
      arrive(target, Math.min(index, 3) * 70);
    });
  }, { threshold: 0.18 });

  function register(node) {
    if (node.closest(stable)) return;
    if (node.hasAttribute('data-cinematic-pan') && !frames.has(node)) {
      const image = node.querySelector(mediaSelector);
      if (image) {
        frames.set(node, image);
        image.addEventListener('load', schedulePan);
        if (!preference.matches) panObserver.observe(node);
      }
    }
    if (!preference.matches && !animated.has(node) &&
        node.matches('[data-cinematic-reveal], [data-cinematic-sequence], [data-cinematic-wipe]')) {
      revealObserver.observe(node);
    }
  }

  function scan(root) {
    if (root.nodeType === 1 && root.matches(optIn)) register(root);
    root.querySelectorAll?.(optIn).forEach(register);
  }

  document.addEventListener('focusin', event => {
    for (const [node, animation] of activeAnimations) {
      if (node.contains(event.target)) animation.cancel();
    }
  });
  window.addEventListener('resize', schedulePan, { passive: true });

  preference.addEventListener('change', () => {
    if (!preference.matches) {
      for (const frame of frames.keys()) panObserver.observe(frame);
      scan(document);
      return;
    }
    panObserver.disconnect();
    revealObserver.disconnect();
    visibleFrames.clear();
    syncScrollListener();
    for (const frame of frames.keys()) {
      frame.style.removeProperty('--cinematic-x');
      frame.style.removeProperty('--cinematic-scale');
    }
    for (const animation of activeAnimations.values()) animation.cancel();
  });

  scan(document);
  // A few personalized pages render their editorial components through React.
  const clientRoot = document.querySelector('[data-cinematic-client]');
  if (clientRoot) {
    new MutationObserver(records => {
      for (const { addedNodes } of records) for (const node of addedNodes) scan(node);
    }).observe(clientRoot, { childList: true, subtree: true });
  }
})();
