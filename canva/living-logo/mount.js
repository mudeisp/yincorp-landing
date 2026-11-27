const mark = document.querySelector('[data-living-logo]');

if (mark && 'IntersectionObserver' in window) {
  const boot = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    boot.disconnect();
    try {
      const { YincorpLivingLogo } = await import('./yincorp-living-logo.js');
      const logo = new YincorpLivingLogo(mark, {
        dock: document.querySelector(mark.dataset.dock),
      });
      if (!await logo.mount()) return;
      const controls = mark.parentElement.querySelector('.yi-living-controls');
      if (!controls) return;
      controls.hidden = false;
      controls.addEventListener('click', (event) => {
        const button = event.target.closest('[data-living-edition]');
        if (!button || !logo.setEdition(button.dataset.livingEdition)) return;
        for (const option of controls.querySelectorAll('button')) {
          option.setAttribute('aria-pressed', String(button === option));
        }
      });
      mark.addEventListener('living-logo-fallback', () => { controls.hidden = true; });
    } catch {
      // The original mark is already visible before enhancement.
    }
  }, { rootMargin: '120px' });
  boot.observe(mark);
}
