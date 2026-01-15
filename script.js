(() => {
  const nav = document.getElementById("nav");
  const indicator = document.getElementById("navIndicator");
  const items = Array.from(nav.querySelectorAll(".nav-item"));

  const sections = items
    .map(a => document.getElementById(a.dataset.target))
    .filter(Boolean);

  let targetX = 0, targetW = 0;
  let curX = 0, curW = 0;
  let rafId = null;

  // --- helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // "sticky then snap" mapping:
  // t in [0..1]
  // - 0..dead: almost 0 (sticky)
  // - dead..1: accelerated curve (snap)
  function stickySnap(t, dead = 0.55) {
    t = clamp(t, 0, 1);

    if (t <= dead) {
      // very slow creep (optional)
      const u = t / dead;
      return 0.08 * u * u; // tiny movement while still "sticky"
    }

    const u = (t - dead) / (1 - dead); // 0..1
    // easeOutCubic for quick finish
    const eased = 1 - Math.pow(1 - u, 3);
    return 0.08 + 0.92 * eased;
  }

  // spring-ish animation (smooth follow)
  function animate() {
    // tweak these for feel:
    const posFollow = 0.18; // smaller = more lag
    const sizeFollow = 0.22;

    curX += (targetX - curX) * posFollow;
    curW += (targetW - curW) * sizeFollow;

    indicator.style.transform = `translate3d(${curX}px, 0, 0)`;
    indicator.style.width = `${curW}px`;

    // stop when close
    if (Math.abs(targetX - curX) < 0.2 && Math.abs(targetW - curW) < 0.2) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(animate);
  }

  function setIndicatorToItem(index) {
    const el = items[index];
    const parentRect = nav.querySelector(".nav-inner").getBoundingClientRect();
    const r = el.getBoundingClientRect();

    targetX = r.left - parentRect.left;
    targetW = r.width;

    indicator.style.opacity = "1";
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  function setIndicatorBetween(i, j, mix) {
    const inner = nav.querySelector(".nav-inner");
    const pr = inner.getBoundingClientRect();

    const a = items[i].getBoundingClientRect();
    const b = items[j].getBoundingClientRect();

    const ax = a.left - pr.left;
    const bx = b.left - pr.left;

    const aw = a.width;
    const bw = b.width;

    targetX = ax + (bx - ax) * mix;
    targetW = aw + (bw - aw) * mix;

    indicator.style.opacity = "1";
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  function getScrollProgressBetweenSections() {
    const y = window.scrollY;
    const vh = window.innerHeight;

    // reference line: “reading position” a bit below top
    const ref = y + vh * 0.33;

    // find current section index based on ref position
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= ref) idx = i;
    }

    const next = clamp(idx + 1, 0, sections.length - 1);
    if (next === idx) return { idx, next, t: 0 };

    const aTop = sections[idx].offsetTop;
    const bTop = sections[next].offsetTop;

    const tRaw = (ref - aTop) / (bTop - aTop);
    const t = clamp(tRaw, 0, 1);

    return { idx, next, t };
  }

  function onScroll() {
    const { idx, next, t } = getScrollProgressBetweenSections();

    if (idx === next) {
      setIndicatorToItem(idx);
      return;
    }

    // apply “sticky + snap” mapping
    const mix = stickySnap(t, 0.58); // deadzone hier feinjustieren
    setIndicatorBetween(idx, next, mix);
  }

  // click smooth scroll + immediate indicator target
  items.forEach((a, i) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.dataset.target;
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setIndicatorToItem(i);
    });
  });

  // initial
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // show indicator after layout ready
  requestAnimationFrame(() => {
    onScroll();
    // also set current values so it doesn't jump on first frame
    curX = targetX;
    curW = targetW;
    indicator.style.width = `${curW}px`;
    indicator.style.transform = `translate3d(${curX}px, 0, 0)`;
    indicator.style.opacity = "1";
  });
})();
