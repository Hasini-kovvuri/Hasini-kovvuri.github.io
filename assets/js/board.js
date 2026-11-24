/* Circuit board project map.
   Projects are chips, skills are pads, copper traces join each skill to the projects that use it.
   Hover, tap or focus a pad or chip to light its traces; filters light a whole area. */
{
  const host = document.getElementById("board");
  if (host) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const esc = t => String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const base = host.dataset.base || "";

    const CHIPS = [
      { id: "D", ref: "U1", name: "DeepShield-AI", sub: "Deepfake detection", metric: "+40%", ml: "detection accuracy", href: "projects/deepshield-ai.html", img: "assets/img/work/deepshield-dashboard.webp",
        about: "Detects deepfake images and video with a PyTorch ResNet18 model, matches faces with FaceNet embeddings in a FAISS index, and traces where a face appears online." },
      { id: "C", ref: "U2", name: "Cohort Collab", sub: "Generative AI learning", metric: "+35%", ml: "user engagement", href: "projects/cohort-collab.html", img: "assets/img/work/cohort-overview.webp",
        about: "Gemini on Vertex AI builds personalized 4-week study plans, turns them into quizzes and powers AI study-mentor chats." },
      { id: "M", ref: "U3", name: "MediQueue", sub: "Appointments + live queues", metric: "−60%", ml: "manual scheduling", href: "projects/mediqueue.html", img: "assets/img/work/mediqueue-specialists.webp",
        about: "Appointment booking with live doctor-wise queues on AWS serverless, plus Medoc, a Gemini symptom checker." }
    ];
    // [skill, area, projects, side]
    const SKILLS = [
      ["PyTorch", "ai", "D", "L"], ["FaceNet", "ai", "D", "L"], ["FAISS", "ai", "D", "L"], ["OpenCV", "ai", "D", "L"],
      ["Python", "ai", "DCM", "L"], ["Gemini", "gen", "CM", "L"], ["Vertex AI", "gen", "C", "L"], ["Prompt Eng.", "gen", "C", "L"],
      ["FastAPI", "be", "D", "R"], ["Flask", "be", "DCM", "R"], ["React", "be", "D", "R"], ["PostgreSQL", "be", "D", "R"], ["Firebase", "cloud", "C", "R"],
      ["AWS", "cloud", "DM", "R"], ["Lambda", "cloud", "M", "R"], ["DynamoDB", "cloud", "M", "R"], ["Docker", "cloud", "M", "R"], ["Terraform", "cloud", "M", "R"]
    ].map(([name, area, ps, side], i) => ({ i, name, area, ps: ps.split(""), side }));
    const AREAS = { ai: "AI and machine learning", gen: "Generative AI", cloud: "Cloud and DevOps", be: "Backend and data" };

    host.innerHTML = `<svg class="traces" aria-hidden="true"></svg>
      <div class="pads">${SKILLS.map(s => `<button type="button" class="pad" data-s="${s.i}" data-area="${s.area}" aria-describedby="board-info"><i></i>${esc(s.name)}</button>`).join("")}</div>
      <div class="chips3">${CHIPS.map(c => `<button type="button" class="pchip" data-c="${c.id}" aria-describedby="board-info"><span class="ref">${c.ref}</span><b>${esc(c.name)}</b><span class="sub">${esc(c.sub)}</span><span class="met">${esc(c.metric)}</span></button>`).join("")}</div>
      <span class="silk s1">HK-PCB · REV 2026</span><span class="silk s2">AI ⟷ CLOUD</span>
      <i class="hole h1"></i><i class="hole h2"></i><i class="hole h3"></i><i class="hole h4"></i>`;
    const svg = host.querySelector(".traces");
    const pads = [...host.querySelectorAll(".pad")], chips = [...host.querySelectorAll(".pchip")];
    const info = document.getElementById("board-info");
    const filters = [...document.querySelectorAll("[data-area-filter]")];

    let narrow = false, sel = null, pinned = false, demo = !reduce, demoT = 0, demoI = 0;
    const traces = []; // {s, c, el}

    const rounded = (raw, r) => {
      // drop repeated points so no corner is built on a zero-length segment
      const pts = raw.filter((q, i) => i === 0 || Math.hypot(q[0] - raw[i - 1][0], q[1] - raw[i - 1][1]) > .5);
      if (pts.length < 2) return "";
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
        const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1), rr = Math.min(r, l1 / 2, l2 / 2);
        const ax = x1 - (x1 - x0) / l1 * rr, ay = y1 - (y1 - y0) / l1 * rr, bx = x1 + (x2 - x1) / l2 * rr, by = y1 + (y2 - y1) / l2 * rr;
        d += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${x1} ${y1} ${bx.toFixed(1)} ${by.toFixed(1)}`;
      }
      const e = pts[pts.length - 1];
      return d + ` L${e[0]} ${e[1]}`;
    };

    const layout = () => {
      const W = host.clientWidth;
      narrow = W < 760;
      host.classList.toggle("narrow", narrow);
      const padH = narrow ? 36 : 40, pitch = narrow ? 44 : 50, top = narrow ? 64 : 70;
      const left = SKILLS.filter(s => narrow || s.side === "L"), right = narrow ? [] : SKILLS.filter(s => s.side === "R");
      const padW = narrow ? Math.min(130, W * .36) : 150;
      const chipW = narrow ? Math.min(170, W * .42) : Math.min(260, W * .24), chipH = narrow ? 128 : 150;
      const colH = Math.max(left.length, right.length) * pitch;
      const H = Math.max(colH, 3 * chipH + 2 * (narrow ? 60 : 56)) + top + (narrow ? 40 : 54);
      host.style.height = H + "px";
      const yOf = (k, n) => top + (H - top - (narrow ? 40 : 54) - n * pitch) / 2 + k * pitch + (pitch - padH) / 2;
      const gx = narrow ? 16 : 28;
      const pos = new Map();
      left.forEach((s, k) => pos.set(s.i, { x: gx, y: yOf(k, left.length), w: padW, side: "L" }));
      right.forEach((s, k) => pos.set(s.i, { x: W - gx - padW, y: yOf(k, right.length), w: padW, side: "R" }));
      pads.forEach(p => {
        const s = +p.dataset.s, q = pos.get(s);
        p.style.cssText = `left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${padH}px`;
      });
      const cx = narrow ? W - gx - chipW : (W - chipW) / 2;
      const gap = (H - top - (narrow ? 40 : 54) - 3 * chipH) / 2;
      const cpos = {};
      CHIPS.forEach((c, k) => { cpos[c.id] = { x: cx, y: top + k * (chipH + gap), w: chipW, h: chipH }; });
      chips.forEach(el => { const q = cpos[el.dataset.c]; el.style.cssText = `left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px`; });

      // pins on each chip side, ordered by pad height to limit crossings
      const conns = [];
      SKILLS.forEach(s => s.ps.forEach(c => conns.push({ s, c, side: pos.get(s.i).side })));
      const pinY = new Map();
      CHIPS.forEach(c => ["L", "R"].forEach(side => {
        const list = conns.filter(k => k.c === c.id && k.side === side).sort((a, b) => pos.get(a.s.i).y - pos.get(b.s.i).y);
        const q = cpos[c.id];
        list.forEach((k, j) => pinY.set(k, q.y + 22 + (q.h - 44) * (list.length === 1 ? .5 : j / (list.length - 1))));
      }));
      // a vertical lane per skill between the pads and the chips
      const laneFor = (side, list) => {
        const a = side === "L" ? gx + padW + 14 : cx + chipW + 14, b = side === "L" ? cx - 14 : W - gx - padW - 14;
        const m = new Map();
        list.forEach((s, k) => m.set(s.i, a + (b - a) * ((side === "L" ? k + 1 : list.length - k) / (list.length + 1))));
        return m;
      };
      const lanesL = laneFor("L", left), lanesR = laneFor("R", right);
      let html = "", vias = "";
      traces.length = 0;
      conns.forEach(k => {
        const p = pos.get(k.s.i), q = cpos[k.c], y0 = p.y + padH / 2, y1 = pinY.get(k);
        let pts;
        if (k.side === "L") { const lx = lanesL.get(k.s.i); pts = [[p.x + p.w, y0], [lx, y0], [lx, y1], [q.x, y1]]; }
        else { const lx = lanesR.get(k.s.i); pts = [[p.x, y0], [lx, y0], [lx, y1], [q.x + q.w, y1]]; }
        html += `<path class="tr" data-s="${k.s.i}" data-c="${k.c}" data-area="${k.s.area}" d="${rounded(pts, 10)}"/>`;
        vias += `<circle class="via" data-s="${k.s.i}" data-c="${k.c}" cx="${pts[1][0]}" cy="${pts[1][1]}" r="3"/>`;
      });
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = `<g class="all">${html}</g><g>${vias}</g>`;
      svg.querySelectorAll(".tr").forEach(el => {
        const L = el.getTotalLength(); el.style.setProperty("--len", L.toFixed(0));
        traces.push({ s: +el.dataset.s, c: el.dataset.c, area: el.dataset.area, el });
      });
      paint();
    };

    const paint = () => {
      const on = t => !sel ? false : sel.t === "s" ? t.s === sel.v : sel.t === "c" ? t.c === sel.v : t.area === sel.v;
      let any = !!sel;
      traces.forEach(t => t.el.classList.toggle("on", on(t)));
      svg.querySelectorAll(".via").forEach(v => v.classList.toggle("on", traces.some(t => on(t) && t.s === +v.dataset.s && t.c === v.dataset.c)));
      host.classList.toggle("focus", any);
      pads.forEach(p => {
        const s = SKILLS[+p.dataset.s];
        const lit = sel && (sel.t === "s" ? s.i === sel.v : sel.t === "c" ? s.ps.includes(sel.v) : s.area === sel.v);
        p.classList.toggle("on", !!lit); p.setAttribute("aria-pressed", String(!!(lit && sel.t === "s" && pinned)));
      });
      chips.forEach(el => {
        const id = el.dataset.c;
        const lit = sel && (sel.t === "c" ? id === sel.v : sel.t === "s" ? SKILLS[sel.v].ps.includes(id) : SKILLS.some(s => s.area === sel.v && s.ps.includes(id)));
        el.classList.toggle("on", !!lit);
      });
      filters.forEach(f => f.setAttribute("aria-pressed", String(!!(sel && sel.t === "a" && sel.v === f.dataset.areaFilter) || (!sel && f.dataset.areaFilter === "all"))));
      if (!info) return;
      if (!sel) {
        info.innerHTML = `<span class="label">How to read the board</span><h3>Hover a skill or a chip.</h3><p>Each copper trace joins a skill to a project that uses it. ${SKILLS.length} skills, 3 projects, ${traces.length} connections.</p>`;
      } else if (sel.t === "s") {
        const s = SKILLS[sel.v], ps = s.ps.map(id => CHIPS.find(c => c.id === id));
        info.innerHTML = `<span class="label">${esc(AREAS[s.area])}</span><h3>${esc(s.name)}</h3><p>Used in ${ps.length} ${ps.length === 1 ? "project" : "projects"}:</p><div class="row">${ps.map(c => `<a class="btn" href="${base}${c.href}">${esc(c.name)} →</a>`).join("")}</div>`;
      } else if (sel.t === "c") {
        const c = CHIPS.find(x => x.id === sel.v), sk = SKILLS.filter(s => s.ps.includes(c.id));
        info.innerHTML = `<span class="label">${c.ref} · ${esc(c.sub)}</span><h3>${esc(c.name)} <span style="color:var(--accInk)">${esc(c.metric)}</span></h3><p>${esc(c.about)}</p><img src="${base}${c.img}" alt="Screenshot of ${esc(c.name)}" loading="lazy"><div class="chips" style="margin-top:12px">${sk.map(s => `<span class="chip">${esc(s.name)}</span>`).join("")}</div><div class="row" style="margin-top:16px"><a class="btn primary" href="${base}${c.href}">Read the case study →</a></div>`;
      } else {
        const sk = SKILLS.filter(s => s.area === sel.v), ps = CHIPS.filter(c => sk.some(s => s.ps.includes(c.id)));
        info.innerHTML = `<span class="label">Area</span><h3>${esc(AREAS[sel.v])}</h3><p>${sk.length} skills across ${ps.map(c => esc(c.name)).join(", ")}.</p>`;
      }
    };

    const select = (s, pin = false) => { sel = s; pinned = pin; paint(); };
    const stopDemo = () => { demo = false; host.classList.remove("demo"); };
    pads.forEach(p => {
      const v = +p.dataset.s;
      p.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { stopDemo(); if (!pinned) select({ t: "s", v }); } });
      p.addEventListener("focus", () => { stopDemo(); if (!pinned) select({ t: "s", v }); });
      p.addEventListener("click", () => { stopDemo(); const same = pinned && sel?.t === "s" && sel.v === v; select(same ? null : { t: "s", v }, !same); });
    });
    chips.forEach(el => {
      const v = el.dataset.c;
      el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { stopDemo(); if (!pinned) select({ t: "c", v }); } });
      el.addEventListener("focus", () => { stopDemo(); if (!pinned) select({ t: "c", v }); });
      el.addEventListener("click", () => { stopDemo(); const same = pinned && sel?.t === "c" && sel.v === v; select(same ? null : { t: "c", v }, !same); });
    });
    host.addEventListener("pointerleave", e => { if (e.pointerType === "mouse" && !pinned) select(null); });
    filters.forEach(f => f.addEventListener("click", () => { stopDemo(); const a = f.dataset.areaFilter; select(a === "all" ? null : { t: "a", v: a }, a !== "all"); }));

    // attract mode: the board demonstrates itself until someone touches it
    const order = [9, 5, 13, 0, 4, 2, 16];
    const demoLoop = now => {
      if (!demo) return;
      if (now - demoT > 2400 && host.getBoundingClientRect().top < innerHeight) {
        demoT = now; select({ t: "s", v: order[demoI++ % order.length] });
      }
      requestAnimationFrame(demoLoop);
    };
    if (demo) { host.classList.add("demo"); requestAnimationFrame(demoLoop); }

    const ro = new ResizeObserver(layout); ro.observe(host);
    layout();
  }
}
