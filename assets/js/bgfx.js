/* Living grid behind the Connect section.
   - lines bend toward the cursor and light up near it; the pull grows with cursor speed
   - a soft aqua spotlight follows the cursor
   - signals travel along the grid lines like current on a circuit, and fast cursor moves spark new ones
   - a click or tap sends a ripple across the grid; gentle ripples also run when the page is idle
   Sized to its section; runs only while the section is on screen and the tab is visible; a still grid under reduced motion. */
{
  const cv = document.querySelector(".bgfx");
  if (cv && cv.getContext) {
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement, host = cv.parentElement;
    let inView = false;
    let W = 0, H = 0, DPR = 1, GAP = 56, cols = 0, rows = 0, ox = 0, scrollOff = 0;
    let mx = -9999, my = -9999, tx = -9999, ty = -9999, power = 0, ptarget = 0, speed = 0, lastMove = performance.now();
    let acc = "45,212,191", raf = 0, lastSpark = 0, lastT = performance.now();
    const ripples = [], pulses = [];

    const readColors = () => { acc = (getComputedStyle(root).getPropertyValue("--accA") || "45,212,191").trim(); };
    const size = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      GAP = W < 600 ? 44 : 56;
      cols = Math.ceil(W / GAP) + 3; rows = Math.ceil(H / GAP) + 3;
      ox = (W % GAP) / 2 - GAP;
      draw();
    };

    // grid node (column i, world row j) to screen position, before warping
    const nodeX = i => ox + i * GAP;
    const nodeY = j => j * GAP - scrollOff;

    // where a point sits after the cursor's pull and the ripples' push
    const R = () => Math.max(170, Math.min(280, W * .17)) * (1 + Math.min(speed, 1) * .35);
    const warp = (x, y, out) => {
      let dx = 0, dy = 0, glow = 0;
      if (power > .01) {
        const ex = mx - x, ey = my - y, d = Math.hypot(ex, ey), r = R();
        if (d < r) { const f = (1 - d / r) ** 2 * power; dx += ex * f * (.38 + Math.min(speed, 1) * .18); dy += ey * f * (.38 + Math.min(speed, 1) * .18); glow = Math.max(glow, f); }
      }
      for (const rp of ripples) {
        const ex = x - rp.x, ey = y - rp.y, d = Math.hypot(ex, ey), band = 95, off = d - rp.r;
        if (Math.abs(off) < band) { const f = (1 - Math.abs(off) / band) * rp.a, n = d || 1; dx += ex / n * f * 12; dy += ey / n * f * 12; glow = Math.max(glow, f * .85); }
      }
      out.x = x + dx; out.y = y + dy; out.g = glow;
      return out;
    };

    // signals: a head moving from node to node, leaving a short fading trail
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const maxPulses = () => (W < 600 ? 3 : 6);
    const firstRow = () => Math.floor(scrollOff / GAP);
    const spawn = (i, j) => {
      if (pulses.length >= maxPulses() + 3) return;
      const [di, dj] = DIRS[(Math.random() * 4) | 0];
      i = i ?? 1 + ((Math.random() * (cols - 3)) | 0);
      j = j ?? firstRow() + 1 + ((Math.random() * (rows - 3)) | 0);
      pulses.push({ i, j, di, dj, t: 0, v: 1.6 + Math.random() * 1.8, trail: [[i, j]], life: 10 + ((Math.random() * 14) | 0) });
    };
    const stepPulse = (p, dt) => {
      p.t += p.v * dt;
      while (p.t >= 1) {
        p.t -= 1; p.i += p.di; p.j += p.dj; p.life--;
        p.trail.push([p.i, p.j]); if (p.trail.length > 5) p.trail.shift();
        if (Math.random() < .3) { const turn = Math.random() < .5 ? 1 : -1; [p.di, p.dj] = p.di ? [0, turn] : [turn, 0]; }
      }
      const fr = firstRow();
      return p.life > 0 && p.i > -1 && p.i < cols && p.j > fr - 2 && p.j < fr + rows + 1;
    };

    const tmp = {}, tmp2 = {};
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const j0 = firstRow() - 1, pts = new Array(cols * rows);
      for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) pts[r * cols + i] = warp(nodeX(i), nodeY(j0 + r), {});
      const P = (i, r) => pts[r * cols + i];

      // soft spotlight under the cursor
      if (power > .02) {
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 340);
        g.addColorStop(0, `rgba(${acc},${(.075 * power).toFixed(3)})`); g.addColorStop(1, `rgba(${acc},0)`);
        ctx.fillStyle = g; ctx.fillRect(mx - 340, my - 340, 680, 680);
      }

      // base lines
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(230,240,239,.05)"; ctx.beginPath();
      for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
        const p = P(i, r);
        if (i + 1 < cols) { const q = P(i + 1, r); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
        if (r + 1 < rows) { const q = P(i, r + 1); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
      }
      ctx.stroke();

      // glowing lines and nodes near the cursor or a ripple
      ctx.lineCap = "round";
      for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
        const p = P(i, r);
        const seg = q => {
          const g = Math.max(p.g, q.g);
          if (g < .03) return;
          ctx.strokeStyle = `rgba(${acc},${Math.min(.95, g * 1.6).toFixed(3)})`;
          ctx.lineWidth = 1 + g * 1.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        };
        if (i + 1 < cols) seg(P(i + 1, r));
        if (r + 1 < rows) seg(P(i, r + 1));
      }
      for (const p of pts) if (p.g > .08) {
        ctx.fillStyle = `rgba(${acc},${Math.min(1, p.g * 2).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + p.g * 2.4, 0, Math.PI * 2); ctx.fill();
      }

      // travelling signals
      for (const p of pulses) {
        const tr = p.trail, n = tr.length;
        const hx = nodeX(p.i) + p.di * GAP * p.t, hy = nodeY(p.j) + p.dj * GAP * p.t;
        const head = warp(hx, hy, tmp);
        let px = head.x, py = head.y;
        const fade = Math.min(1, p.life / 3);
        for (let k = n - 1; k >= 0; k--) {
          const a = warp(nodeX(tr[k][0]), nodeY(tr[k][1]), tmp2);
          const alpha = ((k + 1) / (n + 1)) * .42 * fade;
          ctx.strokeStyle = `rgba(${acc},${alpha.toFixed(3)})`; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(a.x, a.y); ctx.stroke();
          px = a.x; py = a.y;
        }
        const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
        glow.addColorStop(0, `rgba(${acc},${(.75 * fade).toFixed(3)})`); glow.addColorStop(1, `rgba(${acc},0)`);
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(head.x, head.y, 10, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = now => {
      const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
      const nx = mx + (tx - mx) * .16, ny = my + (ty - my) * .16;
      if (mx > -999) speed += (Math.min(2, Math.hypot(nx - mx, ny - my) / 18) - speed) * .12;
      mx = nx; my = ny;
      if (now - lastMove > 1200) ptarget = Math.min(ptarget, .55); // relax when the cursor rests
      power += (ptarget - power) * .08;
      for (let k = ripples.length - 1; k >= 0; k--) { const rp = ripples[k]; rp.r += 6; rp.a *= .984; if (rp.a < .02 || rp.r > Math.hypot(W, H)) ripples.splice(k, 1); }
      for (let k = pulses.length - 1; k >= 0; k--) if (!stepPulse(pulses[k], dt)) pulses.splice(k, 1);
      if (pulses.length < maxPulses() && Math.random() < .04) spawn();
      // fast cursor moves spark a signal from the nearest node
      if (speed > .6 && power > .5 && now - lastSpark > 260) {
        lastSpark = now;
        spawn(Math.round((mx - ox) / GAP), Math.round((my + scrollOff) / GAP));
      }
      draw();
      raf = document.hidden || !inView ? 0 : requestAnimationFrame(loop);
    };
    const go = () => { if (!raf && !reduce && !document.hidden && inView) { lastT = performance.now(); raf = requestAnimationFrame(loop); } };

    const local = e => { const b = host.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top, b]; };
    addEventListener("pointermove", e => {
      if (e.pointerType === "touch" || !inView) return;
      const [x, y, b] = local(e);
      if (x < 0 || y < 0 || x > b.width || y > b.height) { ptarget = 0; return; }
      if (mx < -999) { mx = x; my = y; }
      tx = x; ty = y; ptarget = 1; lastMove = performance.now(); go();
    }, { passive: true });
    document.addEventListener("pointerleave", () => { ptarget = 0; });
    host.addEventListener("pointerdown", e => {
      if (reduce) return;
      const [x, y] = local(e);
      ripples.push({ x, y, r: 0, a: e.pointerType === "touch" ? .9 : .75 });
      if (ripples.length > 4) ripples.shift();
      go();
    }, { passive: true });
    addEventListener("resize", size);
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (host.clientWidth !== W || host.clientHeight !== H) size(); }).observe(host);
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; if (inView) go(); else ptarget = 0; }).observe(host);
    else inView = true;
    addEventListener("hk:theme", () => { readColors(); draw(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) go(); });
    // idle ripples so the page never feels static
    if (!reduce) setInterval(() => {
      if (document.hidden || !inView || ripples.length || performance.now() - lastMove < 3500) return;
      ripples.push({ x: W * (.15 + Math.random() * .7), y: H * (.2 + Math.random() * .6), r: 0, a: .6 });
    }, 5600);
    readColors(); size();
    if (!reduce) { for (let k = 0; k < maxPulses() - 2; k++) spawn(); go(); }
  }
}
