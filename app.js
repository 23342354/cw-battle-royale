(() => {
  const D = window.BR_DATA;
  const COLS = "ABCDEFGHIJ".split("");
  const STATUS_LABEL = { alive: "생존", hurt: "부상", dead: "사망" };
  const $ = (s) => document.querySelector(s);
  const svgNS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, ns) => {
    const n = ns ? document.createElementNS(svgNS, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    return n;
  };

  const state = { filter: "all", query: "", selected: D.students.find((s) => s.status !== "dead")?.id };

  const parsePos = (p) => ({ c: COLS.indexOf(p[0]), r: parseInt(p.slice(1), 10) - 1 });

  // ── header ─────────────────────────
  function renderHeader() {
    $("#game-title").textContent = D.game.title;
    $("#class-label").textContent = D.game.classLabel;
    const dead = D.students.filter((s) => s.status === "dead").length;
    const line = $("#status-line");
    line.replaceChildren(
      document.createTextNode(`${D.game.day}일차 ${D.game.time} 현재, ${D.students.length}명 중 `),
      el("strong", { text: `${D.students.length - dead}명 생존` })
    );
  }

  // 페이지에서 유일하게 스스로 움직이는 순간: 최신 방송 한 줄이 찍힌다
  function renderBroadcasts() {
    const ol = $("#broadcast-list");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    D.broadcasts.forEach((b, i) => {
      const li = el("li");
      const text = el("span", { text: b.text });
      li.append(el("time", { text: b.time }), text);
      ol.append(li);
      if (i === 0 && !reduce) {
        text.textContent = "";
        text.setAttribute("aria-label", b.text);
        const cursor = el("span", { class: "cursor", "aria-hidden": "true" });
        const typed = document.createTextNode("");
        text.append(typed, cursor);
        let n = 0;
        setTimeout(function tick() {
          typed.data = b.text.slice(0, ++n);
          if (n < b.text.length) setTimeout(tick, 38);
        }, 1100); // 화면이 켜진 뒤
      }
    });
    const ul = $("#notice-list");
    D.notices.forEach((t) => ul.append(el("li", { text: t })));
  }

  // ── roster ─────────────────────────
  function filtered() {
    const q = state.query.trim().toLowerCase();
    return D.students.filter((s) => {
      if (state.filter !== "all" && s.status !== state.filter) return false;
      if (!q) return true;
      return [s.name, s.no, s.weapon, s.club].some((v) => v.toLowerCase().includes(q));
    });
  }

  function renderRoster() {
    const ul = $("#roster-grid");
    ul.replaceChildren();
    const list = filtered();
    if (!list.length) {
      ul.append(el("li", { class: "roster-empty", text: "찾는 학생이 없습니다. 검색어를 지우거나 다른 상태를 고르세요." }));
      return;
    }
    list.forEach((s) => {
      const li = el("li");
      const btn = el("button", {
        class: `card ${s.status}`,
        type: "button",
        "aria-pressed": String(s.id === state.selected),
        "aria-label": `${s.no} ${s.name}, ${STATUS_LABEL[s.status]}`,
      });
      btn.append(
        el("span", { class: "card-state", "aria-hidden": "true", text: s.status === "hurt" ? "부상" : "" }),
        el("span", { class: "card-no", text: s.no }),
        el("span", { class: "card-name", text: s.name }),
        el("span", { class: "card-meta", text: s.weapon })
      );
      btn.addEventListener("click", () => select(s.id));
      li.append(btn);
      ul.append(li);
    });
  }

  // ── map ────────────────────────────
  // 섬 외곽선 (0~100 좌표계)
  const ISLAND =
    "M22 8 C34 2 50 6 58 4 C70 2 80 10 86 18 C94 28 90 38 95 48 C99 58 92 66 90 76 C88 88 76 96 64 94 C54 92 48 98 36 95 C24 92 14 86 10 74 C6 62 12 54 8 44 C4 32 10 16 22 8 Z";

  function buildMap() {
    const map = $("#map");
    map.append(el("span", { class: "map-axis" }));
    COLS.forEach((c) => map.append(el("span", { class: "map-axis", text: c })));
    for (let r = 0; r < 10; r++) {
      map.append(el("span", { class: "map-axis", text: r + 1 }));
      for (let c = 0; c < 10; c++) {
        const id = COLS[c] + (r + 1);
        const cell = el("div", { class: "cell", "data-cell": id, role: "gridcell", "aria-label": id });
        if (D.dangerZones.includes(id)) cell.classList.add("danger");
        if (D.upcomingZones.includes(id)) cell.classList.add("next");
        map.append(cell);
      }
    }
    const island = el("svg", { class: "map-island", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" }, true);
    island.append(el("path", { d: ISLAND }, true));
    map.prepend(island);
  }

  function renderMapPins() {
    document.querySelectorAll(".cell").forEach((c) => {
      c.replaceChildren();
      c.classList.remove("focus");
      const base = c.dataset.cell;
      const tags = [D.dangerZones.includes(base) && "금지구역", D.upcomingZones.includes(base) && "예정 금지구역"].filter(Boolean);
      c.setAttribute("aria-label", [base, ...tags].join(", "));
    });
    D.students.forEach((s) => {
      const cell = document.querySelector(`[data-cell="${s.pos}"]`);
      if (!cell) return;
      const pin = el("span", { class: `pin ${s.status}${s.id === state.selected ? " sel" : ""}`, title: `${s.name} (${STATUS_LABEL[s.status]})` });
      cell.append(pin);
      cell.setAttribute("aria-label", `${cell.getAttribute("aria-label")}, ${s.name}`);
    });
    const sel = D.students.find((s) => s.id === state.selected);
    if (sel) document.querySelector(`[data-cell="${sel.pos}"]`)?.classList.add("focus");
  }

  // ── radar ──────────────────────────
  function renderRadar() {
    const g = $("#radar-blips");
    g.replaceChildren();
    const sel = D.students.find((s) => s.id === state.selected);
    if (!sel) {
      $("#radar-legend").textContent = "출석부에서 학생을 고르면 주변 생존자가 보입니다.";
      return;
    }
    const o = parsePos(sel.pos);
    const RANGE = 4; // 격자 반경
    let count = 0;
    D.students.forEach((s) => {
      if (s.id === sel.id || s.status === "dead") return;
      const p = parsePos(s.pos);
      let dx = p.c - o.c, dy = p.r - o.r;
      const dist = Math.hypot(dx, dy);
      if (dist > RANGE) return;
      count++;
      if (dist === 0) { // 같은 칸: 살짝 흩뿌리기
        const a = (s.id * 137) % 360 * Math.PI / 180;
        dx = Math.cos(a) * 0.35; dy = Math.sin(a) * 0.35;
      }
      const x = (dx / RANGE) * 100, y = (dy / RANGE) * 100;
      const grp = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, true);
      grp.append(
        el("circle", { r: 3.2, class: `blip ${s.status}` }, true),
        el("text", { x: 6, y: 3, class: "blip-label", text: s.name }, true)
      );
      g.append(grp);
    });
    $("#radar-legend").textContent = count
      ? `${sel.name}(${sel.pos}) 주변 ${RANGE}칸 안에 ${count}명이 있습니다.`
      : `${sel.name}(${sel.pos}) 주변 ${RANGE}칸 안에는 아무도 없습니다.`;
  }

  // ── hex stats ──────────────────────
  function renderHex() {
    const svg = $("#hex");
    svg.replaceChildren();
    const sel = D.students.find((s) => s.id === state.selected);
    const R = 90, n = D.statLabels.length;
    const pt = (i, r) => {
      const a = (-90 + (360 / n) * i) * Math.PI / 180;
      return [Math.cos(a) * r, Math.sin(a) * r];
    };
    const poly = (r) => D.statLabels.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");
    [0.25, 0.5, 0.75].forEach((f) => svg.append(el("polygon", { points: poly(R * f), class: "hex-grid" }, true)));
    svg.append(el("polygon", { points: poly(R), class: "hex-frame" }, true));
    D.statLabels.forEach((label, i) => {
      const [x, y] = pt(i, R);
      svg.append(el("line", { x1: 0, y1: 0, x2: x, y2: y, class: "hex-spoke" }, true));
      const [lx, ly] = pt(i, R + 20);
      const t = el("text", { x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "middle", class: "hex-label", text: label }, true);
      svg.append(t);
      if (sel) {
        svg.append(el("text", { x: lx, y: ly + 13, "text-anchor": "middle", "dominant-baseline": "middle", class: "hex-val", text: sel.stats[i] }, true));
      }
    });
    if (!sel) return;
    const pts = sel.stats.map((v, i) => pt(i, (v / 100) * R));
    svg.append(el("polygon", { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" "), class: "hex-shape" }, true));
    pts.forEach(([x, y]) => svg.append(el("circle", { cx: x, cy: y, r: 3, class: "hex-dot" }, true)));
    svg.setAttribute("aria-label", `${sel.name} 능력치: ` + D.statLabels.map((l, i) => `${l} ${sel.stats[i]}`).join(", "));
  }

  // ── detail ─────────────────────────
  function renderDetail() {
    const box = $("#detail");
    box.replaceChildren();
    const s = D.students.find((x) => x.id === state.selected);
    if (!s) {
      box.append(el("p", { class: "detail-empty", text: "출석부에서 학생을 고르면 기록이 여기에 뜹니다." }));
      return;
    }
    const portrait = el("div", { class: `portrait ${s.status}`, "aria-hidden": "true", text: s.name[0] });
    const info = el("div");
    const h = el("h3", { class: "detail-name" });
    h.append(document.createTextNode(s.name), el("span", { class: `badge ${s.status}`, text: STATUS_LABEL[s.status] }));
    const dl = el("dl");
    const rows = [["출석번호", s.no], ["동아리", s.club], ["지급 무기", s.weapon], ["마지막 위치", s.pos]];
    if (s.killedAt) rows.push(["사망 시각", s.killedAt]);
    rows.forEach(([k, v]) => {
      const d = el("div");
      d.append(el("dt", { text: k }), el("dd", { text: v }));
      dl.append(d);
    });
    info.append(h, dl, el("p", { class: "detail-note", text: s.note }));
    box.append(portrait, info);
  }

  function select(id) {
    state.selected = id;
    renderRoster();
    renderMapPins();
    renderRadar();
    renderHex();
    renderDetail();
  }

  // ── events ─────────────────────────
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      document.querySelectorAll(".chip").forEach((c) => {
        const on = c === chip;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", String(on));
      });
      renderRoster();
    });
  });
  $("#search-input").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderRoster();
  });

  // ── desk props (손글씨 메모 / 방송 기록지) ──
  function renderDesk() {
    const fmt = (z) => `${z[0]}-${z.slice(1)}`;
    const zones = $("#note-zones");
    if (zones) {
      zones.innerHTML = "금지구역!!<br>" +
        D.dangerZones.map((z) => `<b>${fmt(z)}</b>`).join(" ") +
        (D.upcomingZones.length ? `<br>다음 → ${D.upcomingZones.map(fmt).join(", ")}` : "");
    }
    const dead = D.students.filter((s) => s.status === "dead").length;
    const note = $("#desk-note");
    if (note) note.innerHTML = `남은 사람<br><b>${D.students.length - dead}명</b><br><s>${dead}명</s> 아웃`;
    const kb = $("#keyboard");
    if (kb) {
      // [키 개수, 넓은 키 위치→폭] 단순화한 104키 배열
      const rows = [
        { n: 14, wide: { 13: 2 } },
        { n: 14, wide: { 0: 1.5, 13: 1.5 } },
        { n: 13, wide: { 0: 1.8, 12: 2.2 } },
        { n: 12, wide: { 0: 2.3, 11: 2.7 } },
        { n: 7, wide: { 3: 6.5 } },
      ];
      rows.forEach((r) => {
        const row = el("span", { class: "kb-row" });
        for (let i = 0; i < r.n; i++) {
          const k = el("i");
          if (r.wide[i]) k.style.flexGrow = r.wide[i];
          row.append(k);
        }
        kb.append(row);
      });
    }
    const lines = $("#paper-lines");
    if (lines) {
      D.broadcasts.slice().reverse().forEach((b, i, arr) => {
        const row = el("span", { text: `${b.time}  ${b.text.slice(0, 14)}…` });
        if (i === arr.length - 1) row.className = "hl";
        lines.append(row);
      });
    }
  }

  renderHeader();
  renderBroadcasts();
  renderDesk();
  buildMap();
  select(state.selected);
})();
