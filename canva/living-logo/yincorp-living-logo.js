const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const mix = (from, to, amount) => from + (to - from) * amount;

export class YincorpLivingLogo {
  constructor(mark, { dock = null, edition = 'travertino', scale = 1,
    intensity = 1, intro = true, interactive = true, mode = 'interactive' } = {}) {
    this.mark = mark;
    this.stage = mark.parentElement;
    this.word = mark.querySelector('strong');
    this.dock = dock;
    this.dockWord = dock?.querySelector('strong');
    this.edition = edition;
    this.scale = Number.isFinite(scale) ? clamp(scale, 0.6, 1.12) : 1;
    this.intensity = Number.isFinite(intensity) ? clamp(intensity, 0, 1) : 1;
    this.intro = intro;
    this.interactive = interactive && mode !== 'static';
    this.static = mode === 'static';
    this.events = new AbortController();
    this.pointer = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.visible = true;
    this.clock = 0;
    this.frame = null;
    this.invalidated = true;
  }

  async mount() {
    try {
      if (!this.word || !window.WebGL2RenderingContext) return false;
      const canvas = document.createElement('canvas');
      canvas.className = 'yi-living-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.hidden = true;
      const context = canvas.getContext('webgl2', {
        alpha: true, antialias: true, powerPreference: 'low-power',
        depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false,
      });
      if (!context) return false;
      this.canvas = canvas;
      const [scene, outline] = await Promise.all([
        import('./logo-scene.js'),
        fetch(new URL('./cormorant-wordmark.json', import.meta.url), { signal: this.events.signal })
          .then((response) => {
            if (!response.ok) throw new Error('Wordmark geometry unavailable');
            return response.json();
          }),
        document.fonts.load('400 42px "Yincorp Wordmark"', 'yincorp'),
        document.fonts.load('400 8px "Yincorp Signature"', 'PLACES WORTH LIVING'),
      ]);
      if (this.events.signal.aborted) return false;
      this.outlineWidth = outline.advance - 0.06 * outline.glyphs.length;
      this.scene = scene.createLogoScene(canvas, outline, -0.06);
      this.setEdition(this.edition);
      this.measure = document.createElement('canvas').getContext('2d');
      document.body.append(canvas);
      this.bind();
      this.paint(performance.now());
      return !this.events.signal.aborted;
    } catch {
      this.destroy();
      return false;
    }
  }

  setEdition(edition) {
    if (!this.scene?.setEdition(edition)) return false;
    this.edition = edition;
    this.mark.dataset.edition = edition;
    this.invalidate();
    return true;
  }

  bind() {
    const { signal } = this.events;
    const listen = (target, event, callback) =>
      target.addEventListener(event, callback, { signal, passive: true });
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.invalidate();
    });
    this.observer.observe(this.stage);
    listen(window, 'scroll', () => this.invalidate());
    listen(window, 'resize', () => this.invalidate());
    listen(document, 'visibilitychange', () => {
      this.lastTime = 0;
      if (!document.hidden) this.invalidate();
    });
    listen(reduced, 'change', () => {
      this.pointer.x = this.pointer.y = this.target.x = this.target.y = 0;
      this.invalidate();
    });
    listen(window, 'pagehide', (event) => {
      if (!event.persisted) this.destroy();
    });
    listen(window, 'pageshow', () => this.invalidate());
    listen(this.canvas, 'webglcontextlost', () => this.destroy());
    if (this.interactive) {
      listen(this.stage, 'pointermove', (event) => {
        if (reduced.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
        const rect = this.stage.getBoundingClientRect();
        this.target.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
        this.target.y = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
        this.invalidate();
      });
      const resetPointer = () => {
        this.target.x = this.target.y = 0;
        this.invalidate();
      };
      listen(this.stage, 'pointerleave', resetPointer);
      listen(window, 'blur', resetPointer);
    }
  }

  invalidate() {
    this.invalidated = true;
    this.queue();
  }

  queue() {
    if (this.frame !== null || document.hidden || this.events.signal.aborted) return;
    this.frame = requestAnimationFrame((now) => this.paint(now));
  }

  layout() {
    const stage = this.stage.getBoundingClientRect();
    const hero = this.word.getBoundingClientRect();
    const header = this.dockWord?.getBoundingClientRect();
    const heroSize = parseFloat(getComputedStyle(this.word).fontSize);
    const headerSize = header ? parseFloat(getComputedStyle(this.dockWord).fontSize) : heroSize;
    const start = Math.max(0, stage.height * 0.055);
    const distance = Math.max(1, stage.height * 0.46 - start);
    const headerBottom = this.dock?.parentElement.getBoundingClientRect().bottom ?? 0;
    let dock = !this.static && !reduced.matches && header && header.bottom > 0
      ? clamp((headerBottom - stage.top - start) / distance, 0, 1) : 0;
    if (dock > 0 && stage.bottom < headerBottom) dock = 1;
    dock = dock * dock * (3 - 2 * dock);
    const size = mix(heroSize * this.scale, headerSize, dock);
    const centerX = mix(hero.left + hero.width / 2, header ? header.left + this.outlineWidth * headerSize / 2 : 0, dock);
    const centerY = mix(hero.top + hero.height / 2, header ? header.top + header.height / 2 : 0, dock);
    const width = Math.ceil(size * 3.02);
    const height = Math.ceil(size * 1.66);
    this.measure.font = '400 ' + size + 'px "Yincorp Wordmark"';
    const metrics = this.measure.measureText('yincorp');
    const baseline = -(metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / (2 * size);
    return { dock, width, height, size, centerX, centerY, baseline: Number.isFinite(baseline) ? baseline : -0.25 };
  }

  paint(now) {
    this.frame = null;
    if (!this.scene || document.hidden || this.events.signal.aborted) return;
    try {
      const motion = !this.static && !reduced.matches && this.intensity > 0;
      const mobile = !finePointer.matches;
      const dock = this.layout();
      const docked = dock.dock >= 0.999;
      const show = this.visible || docked;
      this.canvas.hidden = !show;
      if (!show) {
        this.mark.removeAttribute('data-rendering');
        this.dock?.removeAttribute('data-rendering');
        this.lastTime = 0;
        return;
      }
      if (!this.invalidated && now - this.lastTime < (mobile ? 32 : 22)) {
        this.queue();
        return;
      }
      const elapsed = this.lastTime ? clamp(now - this.lastTime, 0, 64) : 16;
      this.lastTime = now;
      this.invalidated = false;
      if (motion && this.intro && dock.dock < 0.12) this.clock += elapsed / 1000;
      else this.clock = Math.max(this.clock, 4.85);
      const settle = 1 - Math.exp(-elapsed / 260);
      this.pointer.x = mix(this.pointer.x, this.target.x, settle);
      this.pointer.y = mix(this.pointer.y, this.target.y, settle);
      const left = dock.centerX - dock.width / 2;
      const top = dock.centerY - dock.height / 2;
      Object.assign(this.canvas.style, {
        left: left + 'px', top: top + 'px',
        width: dock.width + 'px', height: dock.height + 'px',
      });
      const time = motion ? this.clock : 4.85;
      const quality = Math.min(devicePixelRatio || 1, docked ? 2.4 : mobile ? 1.8 : 1.75,
        Math.sqrt(520000 / (dock.width * dock.height)));
      this.scene.render({
        width: dock.width, height: dock.height, pixelsPerEm: dock.size, baseline: dock.baseline,
        x: 0, y: 0, time, pointer: this.pointer, intensity: motion ? this.intensity : 0,
        dock: dock.dock, quality,
      });
      const signature = clamp((time - 3.8) / 0.92, 0, 1);
      this.mark.style.setProperty('--living-signature', signature * (1 - clamp(dock.dock * 2.1, 0, 1)));
      this.mark.toggleAttribute('data-rendering', this.visible || docked);
      if (this.dock) {
        // Fade the destination out at the start and reveal its signature as the sculpture arrives.
        this.dock.style.setProperty('--living-signature', clamp((dock.dock - 0.68) / 0.32, 0, 1));
        this.dock.toggleAttribute('data-rendering', dock.dock > 0.015);
      }
      if (motion && !docked && (this.clock < 4.85 || !mobile ||
          Math.abs(this.pointer.x - this.target.x) + Math.abs(this.pointer.y - this.target.y) > 0.003)) {
        this.queue();
      }
    } catch {
      this.destroy();
    }
  }

  destroy() {
    if (this.events.signal.aborted) return;
    this.events.abort();
    this.observer?.disconnect();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.mark.removeAttribute('data-rendering');
    this.mark.removeAttribute('data-edition');
    this.dock?.removeAttribute('data-rendering');
    this.canvas?.remove();
    this.scene?.dispose();
    this.mark.dispatchEvent(new Event('living-logo-fallback'));
  }
}
