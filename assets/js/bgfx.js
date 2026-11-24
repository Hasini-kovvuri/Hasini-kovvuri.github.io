/* Living grid behind the Connect section: lines bend toward the cursor and light up near it; gentle ripples when idle.
   Sized to its section. Pauses when off screen or the tab is hidden; still under reduced motion. */
{
  const cv = document.querySelector(".bgfx");
  if (cv && cv.getContext) {
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement, host = cv.parentElement;
    let inView = false;
    let W = 0, H = 0, DPR = 1, GAP = 56, cols = 0, rows = 0;
    let mx = -9999, my = -9999, tx = -9999, ty = -9999, power = 0, ptarget = 0;
    let ripple = null, lastMove = performance.now(), raf = 0, colors = null;

    const readColors = () => {
      const cs = getComputedStyle(root), light = false;
      const a = (cs.getPropertyValue("--accA") || "45,212,191").trim();
      colors = { base: light ? "rgba(13,23,22,.07)" : "rgba(230,240,239,.055)", acc: a, light };
    };
    const size = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      GAP = W < 600 ? 44 : 56;
      cols = Math.ceil(W / GAP) + 2; rows = Math.ceil(H / GAP) + 2;
      draw();
    };

    // where a grid point sits after being pulled toward the cursor (and pushed by a ripple)
    const R = () => Math.max(170, Math.min(260, W * .17));
    const warp = (x, y, out) => {
      let dx = 0, dy = 0, glow = 0;
      if (power > .01) {
        const ex = mx - x, ey = my - y, d = Math.hypot(ex, ey), r = R();
        if (d < r) { const f = (1 - d / r) ** 2 * power; dx += ex * f * .42; dy += ey * f * .42; glow = Math.max(glow, f); }
      }
      if (ripple) {
        const ex = x - ripple.x, ey = y - ripple.y, d = Math.hypot(ex, ey), band = 90, off = d - ripple.r;
        if (Math.abs(off) < band) { const f = (1 - Math.abs(off) / band) * ripple.a, n = d || 1; dx += ex / n * f * 10; dy += ey / n * f * 10; glow = Math.max(glow, f * .8); }
      }
      out.x = x + dx; out.y = y + dy; out.g = glow;
      return out;
    };

    const pts = [];
    const draw = () => {
      if (!colors) readColors();
      ctx.clearRect(0, 0, W, H);
      const ox = (W % GAP) / 2 - GAP, oy = (H % GAP) / 2 - GAP;
      pts.length = 0;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) pts.push(warp(ox + i * GAP, oy + j * GAP, {}));
      const P = (i, j) => pts[j * cols + i];
      // base lines
      ctx.lineWidth = 1; ctx.strokeStyle = colors.base; ctx.beginPath();
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = P(i, j);
        if (i + 1 < cols) { const q = P(i + 1, j); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
        if (j + 1 < rows) { const q = P(i, j + 1); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
      }
      ctx.stroke();
      // glowing lines and nodes near the cursor or a ripple
      ctx.lineCap = "round";
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = P(i, j);
        const seg = q => {
          const g = Math.max(p.g, q.g);
          if (g < .03) return;
          ctx.strokeStyle = `rgba(${colors.acc},${Math.min(.95, g * 1.6).toFixed(3)})`;
          ctx.lineWidth = 1 + g * 1.4;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        };
        if (i + 1 < cols) seg(P(i + 1, j));
        if (j + 1 < rows) seg(P(i, j + 1));
      }
      for (const p of pts) if (p.g > .08) {
        ctx.fillStyle = `rgba(${colors.acc},${Math.min(1, p.g * 2).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + p.g * 2.2, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = now => {
      mx += (tx - mx) * .16; my += (ty - my) * .16;
      power += (ptarget - power) * .08;
      if (ripple) { ripple.r += 5.5; ripple.a *= .985; if (ripple.a < .02 || ripple.r > Math.hypot(W, H)) ripple = null; }
      draw();
      const moving = Math.abs(tx - mx) + Math.abs(ty - my) > .5 || Math.abs(ptarget - power) > .01 || ripple;
      raf = moving && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const go = () => { if (!raf && !reduce) raf = requestAnimationFrame(loop); };

    addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      if (!inView) return;
      const b = host.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      const inside = x >= 0 && y >= 0 && x <= b.width && y <= b.height;
      if (!inside) { if (ptarget) { ptarget = 0; go(); } return; }
      if (mx < -999) { mx = x; my = y; }
      tx = x; ty = y; ptarget = 1; lastMove = performance.now(); go();
    }, { passive: true });
    document.addEventListener("pointerleave", () => { ptarget = 0; go(); });
    host.addEventListener("pointerdown", e => { if (e.pointerType === "touch" && !reduce) { const b = host.getBoundingClientRect(); ripple = { x: e.clientX - b.left, y: e.clientY - b.top, r: 0, a: .9 }; go(); } }, { passive: true });
    addEventListener("resize", size);
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (host.clientWidth !== W || host.clientHeight !== H) size(); }).observe(host);
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; if (!inView) { ptarget = 0; go(); } }).observe(host); else inView = true;
    addEventListener("hk:theme", () => { readColors(); draw(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) go(); });
    // idle ripples so the page never feels static
    if (!reduce) setInterval(() => {
      if (document.hidden || !inView || ripple || performance.now() - lastMove < 3500) return;
      ripple = { x: W * (.15 + Math.random() * .7), y: H * (.2 + Math.random() * .6), r: 0, a: .7 };
      go();
    }, 5200);
    readColors(); size();
  }
}
