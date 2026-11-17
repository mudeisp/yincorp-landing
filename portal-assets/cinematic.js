/* Enhances only the editorial components opted in by their templates. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mediaSelector = ':scope > img, :scope > :is(a, button, picture) > img';
  const optIn = '[data-cinematic-pan], [data-cinematic-reveal], [data-cinematic-sequence], [data-cinematic-wipe]';
  const stable = 'form, table, dialog, [role="tablist"], .ynti, .commercial-finance, .art-plans';
  const visibleFrames = new Set();
  const frames = new Set();
  const animated = new WeakSet();
  const activeAnimations = new Map();
  let frameRequest = 0;
  let tracking = false;

  function drawPan() {
    frameRequest = 0;
    const height = window.innerHeight;
    const distance = window.innerWidth <= 700 ? 3.5 : 5;
    const updates = [];
    for (const frame of visibleFrames) {
      if (!frame.isConnected) {
        visibleFrames.delete(frame);
        frames.delete(frame);
        panObserver.unobserve(frame);
        continue;
      }
      const bounds = frame.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (height - bounds.top) / (height + bounds.height)));
      const direction = frame.dataset.cinematicPan === 'reverse' ? -1 : 1;
      updates.push([frame, (progress * 2 - 1) * distance * direction]);
    }
    for (const [frame, offset] of updates) {
      frame.style.setProperty('--cinematic-x', offset.toFixed(2) + '%');
      frame.style.setProperty('--cinematic-scale', '1.12');
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
      { opacity: 0.45, translate: '0 14px' },
      { opacity: 1, translate: 'none' },
    ], { duration: 650, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
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
        parts.forEach((part, step) => arrive(part, Math.min(step, 3) * 100));
        return;
      }
      arrive(target, Math.min(index, 3) * 70);
    });
  }, { threshold: 0.12 });

  function register(node) {
    if (node.closest(stable)) return;
    if (node.hasAttribute('data-cinematic-pan') && node.querySelector(mediaSelector) && !frames.has(node)) {
      frames.add(node);
      if (!preference.matches) panObserver.observe(node);
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
      frames.forEach(frame => panObserver.observe(frame));
      scan(document);
      return;
    }
    panObserver.disconnect();
    revealObserver.disconnect();
    visibleFrames.clear();
    syncScrollListener();
    for (const frame of frames) {
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
