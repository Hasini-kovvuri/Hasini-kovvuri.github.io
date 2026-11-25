/* Interaction layer: smooth scroll, back navigation, preloader and page transitions,
   menu, cursor, reveals, counters, typing line, screenshot lightbox, click-to-copy, timeline trace.
   Without JS, or with reduced motion, every page is plain, complete and readable. */
{
  const root = document.documentElement;
  const esc = t => String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- back navigation ---------- */
  const NAMES = { "index.html": "Home", "": "Home", "about.html": "About", "projects.html": "Projects", "experience.html": "Experience",
    "contact.html": "Contact", "deepshield-ai.html": "DeepShield-AI", "cohort-collab.html": "Cohort Collab", "mediqueue.html": "MediQueue" };
  const nameOf = path => NAMES[path.split("/").pop()] || "previous page";
  const here = location.pathname;
  let stack = [];
  try { stack = JSON.parse(ss.get("hk-stack") || "[]"); } catch (e) { stack = []; }
  if (stack[stack.length - 1] !== here) { if (stack[stack.length - 2] === here) stack.pop(); else stack.push(here); }
  ss.set("hk-stack", JSON.stringify(stack.slice(-40)));
  const veil = document.querySelector(".veil");
  let veilTimer = 0;
  const lift = () => { if (!veil) return; clearTimeout(veilTimer); ss.del("hk-trans"); veil.classList.remove("in"); veil.classList.add("out"); };
  // play the cover while the browser navigates; if nothing navigates (blocked, new tab, preview frame), lift it again
  const cover = () => {
    if (!veil || reduce) return;
    ss.set("hk-trans", "1"); veil.classList.remove("out"); veil.classList.add("in");
    clearTimeout(veilTimer); veilTimer = setTimeout(lift, 1600);
  };
  const backBtn = document.querySelector("[data-back]");
  if (backBtn) {
    const hasPrev = stack.length > 1, isHome = /(^|\/)(index\.html)?$/.test(here);
    if (hasPrev || !isHome) {
      const target = hasPrev ? nameOf(stack[stack.length - 2]) : nameOf(new URL(backBtn.href).pathname);
      backBtn.hidden = false;
      backBtn.querySelector("span").textContent = target;
      backBtn.setAttribute("aria-label", "Back to " + target);
      if (hasPrev) backBtn.href = stack[stack.length - 2]; // a plain link: works wherever links work
    }
  }
  const backFloat = document.querySelector(".backfloat");
  let jumpFrom = null, hideTimer = 0;
  const hideFloat = () => { if (!backFloat) return; backFloat.classList.remove("on"); setTimeout(() => backFloat.hidden = true, 400); };
  const rememberSpot = () => {
    if (!backFloat) return;
    jumpFrom = scrollY; clearTimeout(hideTimer);
    setTimeout(() => { backFloat.hidden = false; requestAnimationFrame(() => backFloat.classList.add("on")); }, 700);
    hideTimer = setTimeout(hideFloat, 15000);
  };
  backFloat?.addEventListener("click", () => {
    if (jumpFrom === null) return;
    const y = jumpFrom; jumpFrom = null; hideFloat();
    lenis ? lenis.scrollTo(y, { duration: 1.3 }) : scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  });
  for (const a of document.querySelectorAll('a[href^="#"]')) a.addEventListener("click", e => {
    const id = a.getAttribute("href").slice(1), el = id ? document.getElementById(id) : document.body;
    if (!el) return;
    e.preventDefault(); rememberSpot();
    lenis ? lenis.scrollTo(el, { offset: -84, duration: 1.3 }) : el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- split words + reveals ---------- */
  // headings and paragraphs reveal word by word as they scroll into view
  const SKIP = "header, footer, nav, .preloader, .overlay, .marq, .board, .lb, .veil, .rotin, [data-count], .mailcopy, .hint4, .brk";
  if (!reduce) for (const el of document.querySelectorAll("main h1, main h2, main h3, main p")) {
    if (el.hasAttribute("data-split") || el.closest(SKIP) || el.querySelector(".rotin, [data-count], img, svg, input, button, br") || !el.textContent.trim()) continue;
    el.setAttribute("data-split", "");
    el.classList.remove("reveal"); // the words carry the motion; no second fade on the same element
  }
  const splitNode = (node, counter) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          if (part.length > 26) { frag.appendChild(document.createTextNode(part)); return; } // long tokens such as links can still wrap
          const w = document.createElement("span"); w.className = "w";
          const i = document.createElement("span"); i.textContent = part; i.style.setProperty("--i", counter.n++);
          w.appendChild(i); frag.appendChild(w);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && !ch.classList.contains("w")) splitNode(ch, counter);
    }
  };
  for (const el of document.querySelectorAll("[data-split]")) {
    const c = { n: 0 }; splitNode(el, c);
    // whole line in well under a second, however long the text: 34ms per word for short headings, tighter for long paragraphs
    el.style.setProperty("--step", Math.max(7, Math.min(34, 650 / Math.max(c.n, 1))).toFixed(1) + "ms");
  }
  const watch = els => {
    if (!("IntersectionObserver" in window) || reduce) { els.forEach(r => r.classList.add("in")); return; }
    const pending = new Set(els);
    const sweep = () => { for (const r of pending) { if (r.classList.contains("in") || r.getBoundingClientRect().top < innerHeight * .95) { r.classList.add("in"); pending.delete(r); } } if (!pending.size) removeEventListener("scroll", sweep); };
    addEventListener("scroll", sweep, { passive: true }); setTimeout(sweep, 400);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach(r => io.observe(r));
  };

  /* ---------- preloader (first visit) and page transitions ---------- */
  const startPage = () => {
    [...document.querySelectorAll(".intro")].forEach((el, i) => setTimeout(() => el.classList.add("in"), 60 + i * 110));
    watch([...document.querySelectorAll(".reveal:not(.intro), [data-split]:not(.intro)")]);
  };
  const pre = document.querySelector(".preloader");
  const arrived = root.classList.contains("trans-in");
  ss.del("hk-trans");
  if (pre && !reduce && !ss.get("hk-seen") && !arrived) {
    ss.set("hk-seen", "1");
    const num = pre.querySelector(".pnum"), bar = pre.querySelector(".pbar i"), t0 = performance.now();
    let loaded = document.readyState === "complete";
    addEventListener("load", () => loaded = true);
    const step = now => {
      const k = clamp((now - t0) / 1400), e = 1 - (1 - k) ** 3;
      if (num) num.textContent = String(Math.round(e * 100)).padStart(3, "0");
      if (bar) bar.style.transform = `scaleX(${e})`;
      if (e >= 1 || now - t0 > 4000) finish();
      else requestAnimationFrame(step);
    };
    let finished = false;
    const finish = () => { if (finished) return; finished = true; pre.classList.add("done"); setTimeout(startPage, 320); setTimeout(() => pre.remove(), 1300); };
    requestAnimationFrame(step);
    setTimeout(finish, 4500); // even if animation frames are paused, the page always appears
  } else {
    pre?.remove();
    if (veil && arrived) { requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.remove("trans-in"); lift(); })); setTimeout(() => root.classList.remove("trans-in"), 1200); setTimeout(startPage, 240); }
    else startPage();
  }
  if (veil && !reduce) {
    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return;
      cover();
    });
    addEventListener("pageshow", ev => { if (ev.persisted) lift(); });
  }



  /* ---------- menu, clock, year ---------- */
  const toggle = document.querySelector(".toggle"), overlay = document.getElementById("overlay");
  if (toggle && overlay) {
    const set = open => {
      root.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector("span").textContent = open ? "Close" : "Menu";
      overlay.inert = !open;
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    overlay.inert = true;
    toggle.addEventListener("click", () => set(!root.classList.contains("menu-open")));
    addEventListener("keydown", e => { if (e.key === "Escape" && root.classList.contains("menu-open")) { set(false); toggle.focus(); } });
  }
  const clocks = document.querySelectorAll("[data-clock]");
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
    const tick = () => clocks.forEach(c => c.textContent = fmt.format(new Date()) + " IST");
    tick(); setInterval(tick, 20000);
  }
  for (const y of document.querySelectorAll("[data-year]")) y.textContent = new Date().getFullYear();

  /* ---------- scroll progress, nav state ---------- */
  const bar = document.querySelector(".progress i"), nav = document.querySelector(".nav");
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, h = root.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    if (nav) {
      nav.classList.toggle("scrolled", y > 8);
      if (y > 420 && y > lastY + 4 && !root.classList.contains("menu-open")) nav.classList.add("hide");
      else if (y < lastY - 4 || y < 420) nav.classList.remove("hide");
    }
    lastY = y;
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- cursor, magnetic buttons, tilt ---------- */
  if (fine && !reduce) {
    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cur-dot"; ring.className = "cur-ring"; ring.innerHTML = "<span></span>";
    document.body.append(dot, ring); root.classList.add("has-cursor");
    const label = ring.firstChild;
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; root.classList.remove("cur-out"); }, { passive: true });
    document.addEventListener("pointerleave", () => root.classList.add("cur-out"));
    const loop = () => { rx += (mx - rx) * .2; ry += (my - ry) * .2; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener("pointerover", e => {
      const t = e.target.closest("[data-cursor], a, button");
      ring.classList.toggle("big", !!t);
      const l = t?.dataset?.cursor || "";
      label.textContent = l; ring.classList.toggle("label", !!l);
    });
    addEventListener("pointerdown", () => ring.classList.add("press"));
    addEventListener("pointerup", () => ring.classList.remove("press"));
    for (const m of document.querySelectorAll(".btn")) {
      m.addEventListener("pointermove", e => { const r = m.getBoundingClientRect(); m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .25}px)`; });
      m.addEventListener("pointerleave", () => m.style.transform = "");
    }
    for (const el of document.querySelectorAll(".tilt")) {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", ((x - .5) * 7).toFixed(2) + "deg"); el.style.setProperty("--rx", ((.5 - y) * 7).toFixed(2) + "deg");
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    }
  }

  /* ---------- counters ---------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduce) {
    const run = el => {
      const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length, t0 = performance.now();
      const step = now => { const k = clamp((now - t0) / 1500), e = 1 - (1 - k) ** 4; el.textContent = (end * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const co = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } }));
    counters.forEach(c => co.observe(c));
  }

  /* ---------- typing line ---------- */
  const typed = document.getElementById("typed");
  if (typed && !reduce) {
    const lines = JSON.parse(typed.dataset.lines);
    let li = 0, ci = lines[0].length, del = true;
    const tick = () => {
      const s = lines[li]; ci += del ? -1 : 1; typed.textContent = s.slice(0, ci);
      let wait = del ? 22 : 50;
      if (!del && ci === s.length) { del = true; wait = 2200; }
      else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 300; }
      setTimeout(tick, wait);
    };
    setTimeout(tick, 3000);
  }

  /* ---------- click to copy ---------- */
  for (const b of document.querySelectorAll("[data-copy]")) b.addEventListener("click", async () => {
    const out = document.getElementById(b.dataset.out), em = b.querySelector("em");
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      if (out) out.textContent = "Copied to clipboard.";
      if (em) { em.textContent = "Copied"; setTimeout(() => em.textContent = "Copy", 1800); }
    } catch (e) { if (out) out.textContent = "Copy didn't work here. Select the text instead."; }
  });

  /* ---------- screenshot lightbox ---------- */
  const shots = [...document.querySelectorAll("[data-lb]")];
  if (shots.length) {
    const lb = document.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Screenshot viewer"); lb.inert = true;
    const arrow = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${d}"/></svg>`;
    lb.innerHTML = `<button class="x" type="button" aria-label="Close">${arrow("M6 6l12 12M18 6 6 18")}</button><img alt="" width="1600" height="900"><div class="lbbar"><button class="pv" type="button" aria-label="Previous screenshot">${arrow("M15 6l-6 6 6 6")}</button><p></p><button class="nx" type="button" aria-label="Next screenshot">${arrow("M9 6l6 6-6 6")}</button></div>`;
    document.body.appendChild(lb);
    const img = lb.querySelector("img"), cap = lb.querySelector("p");
    let i = 0, opener = null;
    const show = k => {
      i = (k + shots.length) % shots.length;
      const s = shots[i], im = s.querySelector("img");
      img.src = im.currentSrc || im.src; img.alt = im.alt; cap.textContent = s.dataset.lb;
    };
    const open = k => { opener = document.activeElement; show(k); lb.inert = false; lb.classList.add("on"); lenis?.stop(); lb.querySelector(".x").focus(); };
    const close = () => { lb.classList.remove("on"); lb.inert = true; lenis?.start(); opener?.focus(); };
    shots.forEach((s, k) => s.addEventListener("click", () => open(k)));
    lb.querySelector(".x").addEventListener("click", close);
    lb.querySelector(".pv").addEventListener("click", () => show(i - 1));
    lb.querySelector(".nx").addEventListener("click", () => show(i + 1));
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    addEventListener("keydown", e => {
      if (!lb.classList.contains("on")) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") show(i - 1); else if (e.key === "ArrowRight") show(i + 1);
    });
  }

  /* ---------- timeline trace (About) ---------- */
  const s = document.getElementById("trace");
  if (s) {
    const ev = [
      {t:2023.55, d:"2023", l:"Started B.Tech, ECE"},
      {t:2025.38, d:"May 2025", l:"AWS cloud internship"},
      {t:2025.71, d:"Sep 2025", l:"OCI AI Foundations"},
      {t:2026.38, d:"May 2026", l:"AI internship"},
      {t:2027.45, d:"2027", l:"Graduation"}
    ];
    const t0 = 2023.4, t1 = 2027.6;
    const list = document.getElementById("evlist");
    if (list) list.innerHTML = ev.map(e => `<li><span class="mono">${esc(e.d)}</span><span>${esc(e.l)}</span></li>`).join("");
    let len = 0;
    const scrub = () => {
      const p = s.querySelector(".trace");
      if (!p || !len) return;
      if (reduce) { s.querySelectorAll(".mk").forEach(m => m.style.opacity = 1); return; }
      const r = s.getBoundingClientRect(), k = clamp((innerHeight - r.top) / (innerHeight * .7 + r.height * .3));
      p.style.strokeDasharray = len; p.style.strokeDashoffset = (len * (1 - k)).toFixed(0);
      s.querySelectorAll(".mk").forEach(m => m.style.opacity = k >= parseFloat(m.dataset.d) ? 1 : 0);
    };
    const draw = () => {
      const W = s.clientWidth, H = s.clientHeight;
      if (!W || !H) return;
      const narrow = W < 520, mL = 8, mR = 8, mT = narrow ? 16 : 76, mB = 30;
      const x = t => mL + (t - t0) / (t1 - t0) * (W - mL - mR);
      const mid = mT + (H - mT - mB) / 2, amp = (H - mT - mB) / 2 - 6;
      const y = t => { const k = (t - t0) / (t1 - t0); return mid - Math.sin((t - t0) * (5 + 9 * k) * Math.PI) * amp * (0.18 + 0.72 * k); };
      let grid = "";
      for (let i = 0; i <= 10; i++) { const gx = mL + i * (W - mL - mR) / 10; grid += `<line x1="${gx}" x2="${gx}" y1="${mT - 8}" y2="${H - mB}" stroke="var(--grid)"/>`; }
      for (let i = 0; i <= 4; i++) { const gy = mT - 8 + i * (H - mB - mT + 8) / 4; grid += `<line x1="${mL}" x2="${W - mR}" y1="${gy}" y2="${gy}" stroke="var(--grid)"/>`; }
      let d = "";
      const n = Math.max(200, Math.round(W / 2));
      for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; d += (i ? "L" : "M") + x(t).toFixed(1) + " " + y(t).toFixed(1); }
      let ticks = "";
      [2024, 2025, 2026, 2027].forEach(yr => { ticks += `<text class="tick" x="${x(yr)}" y="${H - 8}" text-anchor="middle">${yr}</text>`; });
      let marks = "";
      ev.forEach((e, i) => {
        const px = x(e.t), py = y(e.t), dd = ((e.t - t0) / (t1 - t0)).toFixed(3);
        marks += `<g class="mk" data-d="${dd}"><line x1="${px}" x2="${px}" y1="${py}" y2="${narrow ? py : mT - 10}" stroke="var(--acc)" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="${px}" cy="${py}" r="6" fill="var(--panel)" stroke="var(--acc)" stroke-width="3"/>`;
        if (!narrow) {
          const anchor = i === 0 ? "start" : i === ev.length - 1 ? "end" : "middle", lift = i % 2 ? 0 : 30;
          marks += `<text x="${px}" y="${mT - 26 - lift}" text-anchor="${anchor}" style="fill:var(--mute)">${esc(e.d)}</text><text x="${px}" y="${mT - 12 - lift}" text-anchor="${anchor}">${esc(e.l)}</text>`;
        }
        marks += "</g>";
      });
      s.innerHTML = grid + `<path class="trace" d="${d}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round"/>` + ticks + marks;
      const p = s.querySelector(".trace");
      len = p ? Math.ceil(p.getTotalLength()) : 0;
      scrub();
    };
    const traceObserver = new ResizeObserver(draw); traceObserver.observe(s);
    addEventListener("scroll", scrub, { passive: true });
  }
}

/* Home: rotating roles, cursor glow and tilting wall, section highlighting, lessons carousel */
{
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // rotating role line in the hero
  const rot = document.querySelector(".rotin");
  if (rot && !reduce) {
    const roles = JSON.parse(rot.dataset.roles);
    let i = 0;
    setInterval(() => {
      rot.classList.add("out");
      setTimeout(() => {
        i = (i + 1) % roles.length;
        rot.textContent = roles[i];
        rot.classList.remove("out"); rot.classList.add("pre");
        requestAnimationFrame(() => requestAnimationFrame(() => rot.classList.remove("pre")));
      }, 520);
    }, 2800);
  }

  // the hero glow follows the cursor; the wall of screens tilts toward it
  const hero = document.querySelector(".hero3"), wall = document.querySelector(".wall");
  if (hero && !reduce && matchMedia("(hover: hover)").matches) {
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      hero.style.setProperty("--hx", (x * 100).toFixed(1) + "%"); hero.style.setProperty("--hy", (y * 100).toFixed(1) + "%");
      if (wall) { wall.style.setProperty("--wry", ((x - .5) * 8).toFixed(2) + "deg"); wall.style.setProperty("--wrx", ((.5 - y) * 5).toFixed(2) + "deg"); }
    });
    hero.addEventListener("pointerleave", () => { if (wall) { wall.style.setProperty("--wry", "0deg"); wall.style.setProperty("--wrx", "0deg"); } });
  }

  // highlight the menu item for the section in view
  const spies = [...document.querySelectorAll(".icons a[data-spy]")];
  const targets = spies.map(a => document.getElementById(a.dataset.spy)).filter(Boolean);
  if (targets.length && "IntersectionObserver" in window) {
    const seen = new Map();
    const spyObserver = new IntersectionObserver(es => {
      es.forEach(e => seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, max = 0;
      seen.forEach((v, k) => { if (v > max) { max = v; best = k; } });
      if (best) spies.forEach(a => a.classList.toggle("on", a.dataset.spy === best));
    }, { threshold: [0, .15, .3, .5, .75] });
    targets.forEach(t => spyObserver.observe(t));
  }

  // lessons carousel buttons and arrow keys
  const car = document.getElementById("car");
  if (car) {
    const step = d => car.scrollBy({ left: d * (car.firstElementChild.getBoundingClientRect().width + 20), behavior: reduce ? "auto" : "smooth" });
    document.querySelectorAll("[data-car]").forEach(b => b.addEventListener("click", () => step(+b.dataset.car)));
    car.addEventListener("keydown", e => { if (e.key === "ArrowRight") { step(1); e.preventDefault(); } if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); } });
  }

  // only one experience entry open at a time keeps the list calm
  const xps = [...document.querySelectorAll("details.xp")];
  xps.forEach(d => d.addEventListener("toggle", () => { if (d.open) xps.forEach(o => { if (o !== d) o.open = false; }); }));
}

/* Hero: hover (or tap) to reveal the full-colour portrait through a soft circular lens */
{
  const box = document.querySelector(".reveal4");
  if (box) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lens = document.createElement("span"); lens.className = "lens"; lens.setAttribute("aria-hidden", "true"); box.appendChild(lens);
    let tx = 0, ty = 0, x = 0, y = 0, r = 0, rt = 0, full = false, raf = 0;
    const R = () => Math.max(90, Math.min(160, box.clientWidth * .24));
    const tick = () => {
      const k = reduce ? 1 : .18;
      x += (tx - x) * k; y += (ty - y) * k; r += (rt - r) * (reduce ? 1 : .12);
      box.style.setProperty("--x", x.toFixed(1) + "px"); box.style.setProperty("--y", y.toFixed(1) + "px"); box.style.setProperty("--r", r.toFixed(1) + "px");
      lens.style.setProperty("--lx", x.toFixed(1) + "px"); lens.style.setProperty("--ly", y.toFixed(1) + "px");
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(rt - r) > .3) raf = requestAnimationFrame(tick); else raf = 0;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const at = e => { const b = box.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top; };
    box.addEventListener("pointerenter", e => { if (e.pointerType !== "mouse") return; at(e); x = tx; y = ty; rt = R(); box.classList.add("active"); go(); });
    box.addEventListener("pointermove", e => { if (e.pointerType !== "mouse" || full) return; at(e); go(); });
    box.addEventListener("pointerleave", e => { if (e.pointerType !== "mouse" || full) return; rt = 0; box.classList.remove("active"); go(); });
    // touch and click: reveal the whole photo, tap again to go back
    box.addEventListener("click", e => {
      full = !full; at(e);
      if (full) { x = tx; y = ty; rt = Math.hypot(box.clientWidth, box.clientHeight) * 1.1; box.classList.add("active"); lens.style.opacity = "0"; }
      else { rt = 0; box.classList.remove("active"); lens.style.opacity = ""; }
      go();
    });
  }
}

/* Background glow: a soft aqua light follows the cursor behind every page (mouse only, off under reduced motion) */
{
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const glow = document.createElement("div");
    glow.className = "cglow"; glow.setAttribute("aria-hidden", "true");
    document.body.prepend(glow);
    let x = innerWidth / 2, y = innerHeight / 3, tx = x, ty = y, raf = 0, idle = 0;
    const tick = () => {
      x += (tx - x) * .12; y += (ty - y) * .12;
      glow.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > .3 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      glow.classList.add("on");
      clearTimeout(idle); idle = setTimeout(() => glow.classList.remove("on"), 2600);
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener("pointerleave", () => glow.classList.remove("on"));
  }
}
