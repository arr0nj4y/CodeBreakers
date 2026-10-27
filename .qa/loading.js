// One startup coordinator. Percentages describe completed startup tasks,
// including local fonts, artwork, interface setup and the first planet frame.
(() => {
  'use strict';
  const screen = document.getElementById('bootScreen');
  let active = false, session = null;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduce-motion') || !!document.getElementById('reducedMotion')?.checked;

  function imageReady(source) {
    if (!source) return Promise.resolve();
    return new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = source;
      if (img.complete) resolve();
    });
  }

  function firstFrame(canvas) {
    if (!canvas || canvas.dataset.renderer === 'fallback' || Number(canvas.dataset.frame) > 0) return Promise.resolve();
    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (canvas.dataset.renderer === 'fallback' || Number(canvas.dataset.frame) > 0) done();
      });
      const timeout = setTimeout(done, 2500);
      function done() { clearTimeout(timeout); observer.disconnect(); resolve(); }
      observer.observe(canvas, { attributes: true, attributeFilter: ['data-renderer', 'data-frame'] });
    });
  }

  function start({ images = [], tableReady = Promise.resolve(), canvas = null } = {}) {
    if (session) return session;
    active = true;
    screen.hidden = false;
    screen.classList.remove('is-leaving');
    screen.setAttribute('aria-busy', 'true');
    screen.dataset.ready = 'false';
    document.body.classList.add('booting');
    const roots = [...document.querySelectorAll('#helmRail,.screen:not(#bootScreen),.app')].map(root => [root, root.inert]);
    roots.forEach(([root]) => { root.inert = true; });
    document.getElementById('bootTitle')?.focus({ preventScroll: true });

    const started = performance.now();
    const fill = document.getElementById('loadFill');
    const number = document.getElementById('loadPercent');
    const progress = document.getElementById('bootProgress');
    const status = document.getElementById('bootText');
    let target = 10, displayed = 0, last = started, frame = 0, complete = false, painted = -1;
    let finishDisplay;
    const displayDone = new Promise(resolve => { finishDisplay = resolve; });
    const marks = new Set();
    function mark(name, weight) { if (!marks.has(name)) { marks.add(name); target = Math.min(100, target + weight); } }
    function paint(value) {
      const percent = Math.max(0, Math.min(100, Math.floor(value)));
      if (percent !== painted) {
        painted = percent;
        fill.style.width = percent + '%';
        number.textContent = percent + '%';
        progress.setAttribute('aria-valuenow', String(percent));
        progress.setAttribute('aria-valuetext', percent + '% ready');
      }
      const message = complete ? 'Systems ready. Entering command deck.'
        : percent < 25 ? 'Initializing command engine...'
        : percent < 55 ? 'Preparing interface and local fonts...'
        : percent < 85 ? 'Loading mission sectors and planet artwork...'
        : 'Calibrating the command deck...';
      if (status.textContent !== message) status.textContent = message;
    }
    paint(0);
    function tick(now) {
      // The first frame timestamp can precede performance.now() from startup.
      const dt = Math.max(0, Math.min(64, now - last)); last = Math.max(last, now);
      const ceiling = complete ? 100 : Math.min(95, target);
      displayed += (ceiling - displayed) * (1 - Math.exp(-dt / 115));
      if (complete && displayed > 99.6) displayed = 100;
      paint(displayed);
      if (displayed === 100) finishDisplay();
      else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    let resolveUI;
    const uiReady = new Promise(resolve => { resolveUI = resolve; });
    const fonts = Promise.resolve(document.fonts?.ready).catch(() => {}).then(() => mark('fonts', 15));
    const artwork = Promise.all(images.map(imageReady)).then(() => mark('artwork', 10));
    const planets = Promise.resolve(tableReady).catch(() => {}).then(() => mark('planets', 40));
    const rendered = uiReady.then(() => firstFrame(canvas)).then(() => mark('frame', 10));

    const ready = (async () => {
      let deadline;
      try {
        // A failed image/font must never leave the game behind a stuck loader.
        await Promise.all([uiReady, Promise.race([
          Promise.all([fonts, artwork, planets, rendered]),
          new Promise(resolve => { deadline = setTimeout(resolve, 5000); })
        ])]);
      } finally { clearTimeout(deadline); }
      await delay(Math.max(0, 1000 - (performance.now() - started)));
      target = 100; complete = true;
      screen.dataset.ready = 'true';
      await displayDone;
      screen.setAttribute('aria-busy', 'false');
      await delay(300); // Keep the completed 100% state readable.
      screen.classList.add('is-leaving');
      await delay(reduced() ? 0 : 240);
      cancelAnimationFrame(frame);
      screen.hidden = true;
      roots.forEach(([root, inert]) => { root.inert = inert; });
      document.body.classList.remove('booting');
      active = false;
      const heading = document.querySelector('#helmDeck .head-title h1');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      window.dispatchEvent(new Event('cb-ready'));
    })();
    session = { ready, markUIReady() { mark('interface', 15); resolveUI(); } };
    return session;
  }
  window.CBBoot = { start, get active() { return active; } };
})();
