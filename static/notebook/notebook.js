(() => {
  'use strict';
  const notebook = document.querySelector('.notebook');
  if (!notebook) return;
  const reader = notebook.querySelector('.notebook-reader');
  const sheets = [...notebook.querySelectorAll('[data-sheet]')];
  const dates = [...notebook.querySelectorAll('.notebook-date')];
  if (!reader || !sheets.length || dates.length !== sheets.length) return;
  const dots = [...notebook.querySelectorAll('.notebook-dots button')];
  const status = notebook.querySelector('.notebook-status');
  const timeline = notebook.querySelector('.notebook-timeline');
  const mobile = window.matchMedia('(max-width: 700px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const movingSword = dates[0].querySelector('.notebook-sword').cloneNode(true);
  movingSword.classList.add('floating-sword');
  timeline.appendChild(movingSword);
  timeline.classList.add('has-moving-sword');
  let active = 0;
  let wheelTotal = 0;
  let lastWheel = 0;
  let lastSwitch = -Infinity;
  let touchStart = null;
  let swordAnimation = null;
  const dateAnimations = new Map();
  const easing = 'cubic-bezier(0.23, 1, 0.32, 1)';

  function moveSword(animate, previousIndex = active) {
    const timelineBounds = timeline.getBoundingClientRect();
    const dateBounds = dates[active].getBoundingClientRect();
    const targetTop = `${dateBounds.top - timelineBounds.top + dateBounds.height / 2}px`;
    const currentStyle = getComputedStyle(movingSword);
    const startTop = currentStyle.top;
    const startTransform = currentStyle.transform;
    if (swordAnimation) swordAnimation.cancel();
    movingSword.style.left = `${dateBounds.left - timelineBounds.left - 34}px`;
    movingSword.style.top = targetTop;
    const shouldAnimate = animate && !mobile.matches && !reducedMotion.matches && typeof movingSword.animate === 'function';
    dates.forEach((button, index) => {
      const label = button.querySelector('time');
      const start = getComputedStyle(label).transform;
      const running = dateAnimations.get(label);
      if (running) running.cancel();
      const target = `translateX(${index === active && !mobile.matches ? 50 : 0}px)`;
      label.style.transform = target;
      if (!shouldAnimate || (index !== previousIndex && index !== active)) return;
      dateAnimations.set(label, label.animate([
        { transform: start, offset: 0, easing },
        { transform: index === previousIndex ? 'translateX(96px)' : start, offset: 0.25, easing },
        { transform: index === active ? 'translateX(96px)' : target, offset: 0.72, easing },
        { transform: target, offset: 1 }
      ], { duration: 400, easing: 'linear' }));
    });
    if (!shouldAnimate) return;
    swordAnimation = movingSword.animate([
      { top: startTop, transform: startTransform, offset: 0, easing },
      { top: startTop, transform: 'translate(46px, -50%)', offset: 0.25, easing },
      { top: targetTop, transform: 'translate(46px, -50%)', offset: 0.72, easing },
      { top: targetTop, transform: 'translate(0px, -50%)', offset: 1 }
    ], { duration: 400, easing: 'linear' });
  }

  function selectEntry(index) {
    const previous = active;
    const target = Math.max(0, Math.min(sheets.length - 1, index));
    if (target !== previous && sheets[previous].contains(document.activeElement)) reader.focus({ preventScroll: true });
    active = target;
    sheets.forEach((sheet, index) => {
      const distance = index - active;
      sheet.dataset.position = String(Math.max(-3, Math.min(3, distance)));
      sheet.style.zIndex = String(10 - Math.min(3, Math.abs(distance)));
      sheet.setAttribute('aria-hidden', String(distance !== 0));
      sheet.inert = distance !== 0;
    });
    dates.forEach((button, index) => {
      if (index === active) button.setAttribute('aria-current', 'date');
      else button.removeAttribute('aria-current');
    });
    dots.forEach((button, index) => button.setAttribute('aria-pressed', String(index === active)));
    status.textContent = `Page ${active + 1} of ${sheets.length}, ${dates[active].querySelector('time').dateTime}`;
    moveSword(previous !== active, previous);
    wheelTotal = 0;
  }

  notebook.querySelectorAll('[data-entry]').forEach(button => {
    button.addEventListener('click', () => selectEntry(Number(button.dataset.entry)));
  });
  reader.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    selectEntry(event.key === 'Home' ? 0 : event.key === 'End' ? sheets.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
  });
  // Wheel paging requires a fully visible reader and a viewport at least 700px wide.
  notebook.addEventListener('wheel', event => {
    if (event.ctrlKey || window.matchMedia('(width < 700px)').matches || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      wheelTotal = 0;
      return;
    }
    const direction = Math.sign(event.deltaY);
    const bounds = reader.getBoundingClientRect();
    const header = document.querySelector('header');
    const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const readingVisible = bounds.top >= headerBottom && bounds.bottom <= window.innerHeight;
    if (!direction || !readingVisible || (active === 0 && direction < 0) || (active === sheets.length - 1 && direction > 0)) {
      wheelTotal = 0;
      return;
    }
    const scrollable = event.target.closest('.notebook-writing');
    if (scrollable && ((direction > 0 && scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 1) || (direction < 0 && scrollable.scrollTop > 0))) {
      wheelTotal = 0;
      return;
    }
    event.preventDefault();
    const now = performance.now();
    if (now - lastSwitch < 450) return;
    if (now - lastWheel > 200 || Math.sign(wheelTotal) !== direction) wheelTotal = 0;
    lastWheel = now;
    wheelTotal += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? reader.clientHeight : 1);
    if (Math.abs(wheelTotal) >= 65) {
      selectEntry(active + direction);
      lastSwitch = now;
    }
  }, { passive: false });
  reader.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  reader.addEventListener('touchmove', event => {
    if (event.touches.length !== 1) touchStart = null;
  }, { passive: true });
  reader.addEventListener('touchend', event => {
    if (!touchStart || event.touches.length || !event.changedTouches.length) return;
    const dx = touchStart.x - event.changedTouches[0].clientX;
    const dy = touchStart.y - event.changedTouches[0].clientY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) selectEntry(active + Math.sign(dx));
    touchStart = null;
  }, { passive: true });
  reader.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
  window.addEventListener('resize', () => moveSword(false));
  reducedMotion.addEventListener('change', () => moveSword(false));
  if (document.fonts) document.fonts.ready.then(() => moveSword(false));
  selectEntry(0);
})();