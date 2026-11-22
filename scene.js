// ─────────────────────────────────────────────
//  SCENE — 베이지 레트로 PC 한 대를 픽셀 아트로 그린다
//  · 스튜디오 배경(먼지 낀 하늘색) 위에 CRT 모니터 → 받침 → 데스크톱 본체 → 키보드
//  · 낮은 해상도 캔버스(한 픽셀 = S css px)를 정수배로 확대, 픽셀 그대로
//  · 화면(#screen)은 모니터 유리 자리에 픽셀 단위로 맞춰 얹는다
// ─────────────────────────────────────────────
(() => {
  const canvas = document.getElementById("scene");
  const screen = document.getElementById("screen");
  const stage = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const P = {
    // 배경
    bg0: "#6f8ea3", bg1: "#7f9db1", bg2: "#8eabbe", bg3: "#9db8c8", bg4: "#aec5d2", sh1: "#7593a7", sh2: "#62808f",
    // 베이지 플라스틱 (밝음 → 어두움)
    b0: "#f4ecd5", b1: "#e7ddc0", b2: "#d9cead", b3: "#c5b993", b4: "#aa9e79", b5: "#877c5c", out: "#4c4434",
    // 회색 키
    g0: "#b3b0a6", g1: "#97948a", g2: "#7c796f", g3: "#5e5c54",
    // 유리 · 기타
    glass: "#1c2b2b", slot: "#2a2722",
    led: "#5cff7a", ledD: "#2a6a35", amber: "#ffb648",
    blue: "#2f5ea8", blueHi: "#6f9be0", white: "#f6f6f2",
  };

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y, f) => BAYER[(y & 3) * 4 + (x & 3)] < f * 16;
  const hex = {};
  const rgb = (c) => hex[c] || (hex[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);

  let W, H, S, buf, L, staticCanvas, frame = 0, timer;

  function px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, v = rgb(c);
    buf[i] = v[0]; buf[i + 1] = v[1]; buf[i + 2] = v[2]; buf[i + 3] = 255;
  }
  function rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); }
  const hline = (x, y, w, c) => rect(x, y, w, 1, c);
  const vline = (x, y, h, c) => rect(x, y, 1, h, c);
  // 모서리를 둥글게 깎은 사각형
  function rrect(x, y, w, h, r, c) {
    for (let j = 0; j < h; j++) {
      const dy = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0;
      const cut = dy ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0;
      hline(x + cut, y + j, w - cut * 2, c);
    }
  }

  // ── 배치 ────────────────────────────
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    if (vw <= 720) { canvas.style.display = "none"; screen.removeAttribute("style"); stopLoop(); return null; }
    canvas.style.display = "";
    S = Math.max(2, Math.min(5, Math.round(Math.min(vw / 470, vh / 292))));
    W = Math.ceil(vw / S); H = Math.ceil(vh / S);

    let top = 6;
    const bT = 12, bS = 13, bB = 20;                    // 모니터 테두리 두께
    const ledge = 4, neck = 4, disc = 6, caseH = 46, kbPeek = 26;
    let gh = H - top - bT - bB - ledge - neck - disc + 2 - caseH - kbPeek;
    const gw = Math.min(Math.round(gh * 4 / 3), W - bS * 2 - (S >= 3 ? 150 : 24));
    // 폭이 모자라면(세로로 긴 창) 화면이 세로로 길쭉해지지 않게 줄이고 전체를 가운데로
    if (gh > gw * 0.9) { const ex = gh - Math.round(gw * 0.9); gh -= ex; top += Math.round(ex * 0.45); }
    const gx = Math.floor((W - gw) / 2), gy = top + bT;
    const mx0 = gx - bS, mx1 = gx + gw + bS, my0 = top, my1 = gy + gh + bB;
    const caseTop = my1 + ledge + neck + disc - 2;
    const caseW = Math.min(W - 16, Math.round((mx1 - mx0) * 1.34));
    const cx0 = Math.floor((W - caseW) / 2);
    const kbTop = caseTop + caseH - 3;
    const kbW = Math.min(W - 8, Math.round(caseW * 1.02));
    return { gx, gy, gw, gh, mx0, mx1, my0, my1, caseTop, caseH, caseW, cx0, kbTop, kbW, kx0: Math.floor((W - kbW) / 2) };
  }

  // ── 그림 ────────────────────────────
  function drawBackdrop() {
    const cx = W / 2, floorY = L.caseTop + L.caseH;
    const ramp = [P.bg0, P.bg1, P.bg2, P.bg3, P.bg4];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      // 위는 어둡고 바닥 쪽은 밝은 스튜디오 스윕 + 모니터 뒤 조명 + 가장자리 비네팅
      let t = y / H;
      const spot = 1 - Math.hypot((x - cx) / (W * 0.55), (y - H * 0.38) / (H * 0.6));
      t += Math.max(0, spot) * 0.35;
      const edge = Math.hypot((x - cx) / (W * 0.62), (y - H * 0.45) / (H * 0.75));
      t -= Math.max(0, edge - 0.75) * 0.9;
      const v = Math.max(0, Math.min(3.999, t * 4.2 - 0.3));
      const i = Math.floor(v);
      px(x, y, dith(x, y, v - i) ? ramp[Math.min(4, i + 1)] : ramp[i]);
    }
    // 바닥 그림자 (본체 + 키보드 아래)
    const shadow = (x0, x1, y0, depth) => {
      for (let y = y0; y < Math.min(H, y0 + depth); y++) for (let x = x0 - 10; x < x1 + 18; x++) {
        const f = (1 - (y - y0) / depth) * (1 - Math.max(0, Math.max(x0 - x, x - x1)) / 16);
        if (f > 0 && dith(x, y, f * 0.9)) px(x, y, f > 0.55 ? P.sh2 : P.sh1);
      }
    };
    shadow(L.cx0, L.cx0 + L.caseW, floorY - 2, 14);
  }

  function drawMonitor() {
    const { gx, gy, gw, gh, mx0, mx1, my0, my1 } = L;
    const mw = mx1 - mx0, mh = my1 - my0;
    // 몸통 + 외곽선
    rrect(mx0 - 1, my0 - 1, mw + 2, mh + 2, 5, P.out);
    rrect(mx0, my0, mw, mh, 4, P.b2);
    // 정면이 위에서 아래로 살짝 어두워짐
    for (let y = my0 + 2; y < my1 - 2; y++) for (let x = mx0 + 2; x < mx1 - 2; x++) if (dith(x, y, (y - my0) / mh * 0.35)) px(x, y, P.b3);
    // 바깥 모서리 빛: 위 · 왼쪽 밝게, 아래 · 오른쪽 어둡게
    hline(mx0 + 3, my0, mw - 6, P.b0); hline(mx0 + 2, my0 + 1, mw - 4, P.b1);
    vline(mx0, my0 + 3, mh - 6, P.b1); vline(mx0 + 1, my0 + 2, mh - 4, P.b1);
    vline(mx1 - 1, my0 + 3, mh - 6, P.b4); vline(mx1 - 2, my0 + 2, mh - 4, P.b3);
    hline(mx0 + 3, my1 - 1, mw - 6, P.b4); hline(mx0 + 2, my1 - 2, mw - 4, P.b3);

    // 안쪽 경사면 (유리 둘레 7픽셀): 위는 그늘, 아래는 빛을 받음
    const k = 7;
    const topR = [P.b4, P.b4, P.b3, P.b3, P.b5, P.b5, P.out];
    const botR = [P.b0, P.b0, P.b1, P.b1, P.b1, P.b2, P.out];
    const lefR = [P.b3, P.b3, P.b3, P.b4, P.b4, P.b5, P.out];
    const rigR = [P.b1, P.b2, P.b2, P.b2, P.b3, P.b3, P.out];
    for (let r = 0; r < k; r++) {
      const x0 = gx - k + r, y0 = gy - k + r, w = gw + (k - r) * 2, h = gh + (k - r) * 2;
      vline(x0, y0, h, lefR[r]); vline(x0 + w - 1, y0, h, rigR[r]);
      hline(x0, y0, w, topR[r]); hline(x0, y0 + h - 1, w, botR[r]);
    }
    // 유리 (HTML 화면이 덮지만 둥근 모서리 틈으로 보임)
    rect(gx, gy, gw, gh, P.out);
    rrect(gx, gy, gw, gh, 6, P.glass);

    // 아래 테두리: 로고 자리, 전원 LED, 버튼
    const by = gy + gh + k + 5;
    rect(mx0 + 16, by, 3, 4, P.b4); rect(mx0 + 21, by, 3, 4, P.b4); hline(mx0 + 26, by + 2, 18, P.b3);
    hline(mx0 + 16, by + 4, 3, P.b1); hline(mx0 + 21, by + 4, 3, P.b1);
    L.led = { x: mx1 - 34, y: by + 1 };
    rect(mx1 - 35, by, 5, 3, P.b4);
    rect(mx1 - 26, by - 1, 8, 5, P.b3); hline(mx1 - 26, by - 1, 8, P.b1); hline(mx1 - 26, by + 3, 8, P.b4);
    // 아래 턱(ledge) + 다이얼 두 개
    const ly = my1, lx0 = mx0 + 6, lx1 = mx1 - 6;
    rect(lx0, ly, lx1 - lx0, 4, P.b3); hline(lx0, ly, lx1 - lx0, P.b4); hline(lx0, ly + 3, lx1 - lx0, P.b5);
    for (let d = 0; d < 2; d++) {
      const dx = lx1 - 52 + d * 24;
      rect(dx, ly + 1, 20, 2, P.b4);
      for (let i = 0; i < 20; i += 2) px(dx + i, ly + 1, P.b2);
    }
    // 긁힘 · 손때 몇 점
    hline(mx0 + 30, my0 + 5, 7, P.b3); px(mx1 - 20, my1 - 8, P.b4); px(mx1 - 19, my1 - 8, P.b4);
  }

  function drawStandAndCase() {
    const { mx0, mx1, my1, caseTop, caseH, caseW, cx0 } = L;
    const ncx = Math.round((mx0 + mx1) / 2);

    // 본체 윗면 (살짝 보이는 띠)
    rect(cx0 + 2, caseTop - 3, caseW - 4, 3, P.b1);
    hline(cx0 + 3, caseTop - 3, caseW - 6, P.b0);
    // 정면
    rect(cx0 - 1, caseTop - 1, caseW + 2, caseH + 2, P.out);
    rect(cx0, caseTop, caseW, caseH, P.b2);
    for (let y = caseTop + 2; y < caseTop + caseH - 2; y++) for (let x = cx0 + 1; x < cx0 + caseW - 1; x++) if (dith(x, y, (y - caseTop) / caseH * 0.3)) px(x, y, P.b3);
    hline(cx0, caseTop, caseW, P.b0); hline(cx0, caseTop + 1, caseW, P.b1);
    vline(cx0, caseTop, caseH, P.b1); vline(cx0 + caseW - 1, caseTop, caseH, P.b4);
    hline(cx0, caseTop + caseH - 1, caseW, P.b5); hline(cx0, caseTop + caseH - 2, caseW, P.b4);
    // 원반 받침 그림자가 윗면에
    hline(ncx - 62, caseTop - 1, 124, P.b4); hline(ncx - 56, caseTop, 112, P.b3);
    // 목 (사다리꼴) + 원반 받침
    for (let y = 0; y < 4; y++) hline(ncx - 30 - y * 2, my1 + 4 + y, 61 + y * 4, y === 0 ? P.b5 : P.b4);
    const dw = 128, dh = 7, dy = my1 + 8;
    for (let y = 0; y < dh; y++) {
      const half = Math.round(dw / 2 * Math.sqrt(1 - ((y - dh) / dh) ** 2 * 0.25));
      hline(ncx - half, dy + y, half * 2, y === 0 ? P.b1 : y < 3 ? P.b2 : y < 5 ? P.b3 : P.b4);
    }

    // 왼쪽: 배지 + 통풍구
    rect(cx0 + 12, caseTop + 7, 12, 12, P.b3); rect(cx0 + 13, caseTop + 8, 10, 10, P.b0);
    hline(cx0 + 15, caseTop + 11, 6, P.b4); hline(cx0 + 15, caseTop + 14, 4, P.b4);
    const vx = cx0 + 12, vy = caseTop + caseH - 22;
    for (let i = 0; i < 20; i++) { vline(vx + i * 3, vy, 16, P.b5); vline(vx + i * 3 + 1, vy, 16, P.b1); }

    // 오른쪽: 드라이브 베이 (3.5" 플로피 + 5.25" 빈 칸)
    const dx0 = cx0 + Math.round(caseW * 0.56), dx1 = cx0 + caseW - 12, dyy = caseTop + 7;
    rect(dx0 - 1, dyy - 1, dx1 - dx0 + 2, caseH - 12, P.b4);
    rect(dx0, dyy, dx1 - dx0, caseH - 14, P.b3);
    const fx0 = dx0 + Math.round((dx1 - dx0) * 0.3), fx1 = dx1 - 3;
    rect(fx0, dyy + 2, fx1 - fx0, 12, P.b1); hline(fx0, dyy + 2, fx1 - fx0, P.b0); hline(fx0, dyy + 13, fx1 - fx0, P.b4);
    hline(fx0 + 6, dyy + 7, fx1 - fx0 - 18, P.slot); hline(fx0 + 6, dyy + 8, fx1 - fx0 - 18, P.b4);
    rect(fx1 - 9, dyy + 9, 5, 3, P.b3); hline(fx1 - 9, dyy + 9, 5, P.b0);
    L.floppyLed = { x: fx0 + 3, y: dyy + 10 };
    // 파란 스티커
    rect(dx0 + 4, dyy + 2, 10, 12, P.white); rect(dx0 + 5, dyy + 3, 8, 5, P.blue); hline(dx0 + 6, dyy + 5, 6, P.blueHi); hline(dx0 + 5, dyy + 10, 8, P.g1);
    // 5.25" 빈 칸
    rect(dx0 + 3, dyy + 17, dx1 - dx0 - 6, 9, P.b1); hline(dx0 + 3, dyy + 17, dx1 - dx0 - 6, P.b0); hline(dx0 + 3, dyy + 25, dx1 - dx0 - 6, P.b4);
    hline(dx0 + 10, dyy + 21, dx1 - dx0 - 20, P.b3);
    // 전원 버튼 + LED
    rect(dx1 - 6, caseTop + caseH - 8, 4, 4, P.b1); hline(dx1 - 6, caseTop + caseH - 5, 4, P.b4);
    L.caseLed = { x: dx1 - 12, y: caseTop + caseH - 6 };
  }

  function drawKeyboard() {
    const { kbTop, kbW, kx0 } = L;
    const kh = H - kbTop + 6;
    rect(kx0 - 1, kbTop - 1, kbW + 2, kh, P.out);
    rect(kx0, kbTop, kbW, kh, P.b1);
    hline(kx0 + 1, kbTop, kbW - 2, P.b0); hline(kx0, kbTop + 2, kbW, P.b2);
    vline(kx0 + kbW - 1, kbTop, kh, P.b3);
    // 키: 24칸 기준, 줄 끝은 회색 기능키
    const u = Math.max(5, Math.floor((kbW - 12) / 24)), rh = Math.max(4, Math.round(u * 0.42));
    const key = (x, y, w, gray) => {
      const c = gray ? [P.g0, P.g1, P.g3] : [P.b0, P.b1, P.b4];
      rect(x, y, w - 1, rh - 1, c[1]); hline(x, y, w - 1, c[0]); hline(x, y + rh - 2, w - 1, c[2]);
    };
    const x0 = kx0 + 6;
    rect(kx0 + 4, kbTop + 3, kbW - 8, kh, P.b4);          // 키가 앉는 어두운 홈
    hline(kx0 + 4, kbTop + 3, kbW - 8, P.b5);
    let y = kbTop + 4;
    for (let i = 0; i < 16; i++) { if (i === 1 || i === 5 || i === 9 || i === 13) continue; key(x0 + i * u, y, u, true); }
    for (let i = 0; i < 4; i++) key(x0 + (19.5 + i) * u, y, u, false);
    y += rh + 2;
    const rows = [
      [[1, 1], ...Array(12).fill([1, 0]), [2, 1]],
      [[1.5, 1], ...Array(12).fill([1, 0]), [1.5, 1]],
      [[1.8, 1], ...Array(11).fill([1, 0]), [2.2, 1]],
      [[2.3, 1], ...Array(10).fill([1, 0]), [2.7, 1]],
      [[1.5, 1], [1.2, 1], [1.5, 1], [7, 0], [1.5, 1], [1.2, 1], [1.5, 1]],
    ];
    rows.forEach((row, ri) => {
      if (y > H) return;
      let x = x0;
      row.forEach(([w, gray]) => { key(Math.round(x), y, Math.round(w * u), gray); x += w * u; });
      if (ri < 2 || ri === 4) for (let i = 0; i < 3; i++) key(x0 + (15.5 + i) * u, y, u, true);
      if (ri === 3) key(x0 + 16.5 * u, y, u, true);
      for (let i = 0; i < 4; i++) key(x0 + (19.5 + i) * u, y, u, i === 3 || ri === 0);
      y += rh;
    });
    // 케이블이 본체 뒤로
    for (let k = 0; k < 8; k++) px(kx0 + 22 + Math.round(Math.sin(k / 2) * 2), kbTop - 1 - k, P.b5);
  }

  function drawStatic() {
    buf = new Uint8ClampedArray(W * H * 4);
    drawBackdrop();
    drawStandAndCase();
    drawMonitor();
    drawKeyboard();
    staticCanvas = document.createElement("canvas");
    staticCanvas.width = W; staticCanvas.height = H;
    staticCanvas.getContext("2d").putImageData(new ImageData(buf, W, H), 0, 0);
  }

  // ── 움직이는 것: LED ────────────────
  function drawFrame() {
    ctx.drawImage(staticCanvas, 0, 0);
    ctx.fillStyle = frame % 40 === 39 ? P.ledD : P.led;
    ctx.fillRect(L.led.x, L.led.y, 3, 1);
    ctx.fillStyle = P.led;
    ctx.fillRect(L.caseLed.x, L.caseLed.y, 2, 1);
    // 플로피 접근등: 가끔 주황으로 깜빡
    ctx.fillStyle = [3, 4, 6].includes(frame % 24) ? P.amber : P.b3;
    ctx.fillRect(L.floppyLed.x, L.floppyLed.y, 2, 1);
  }
  function stopLoop() { clearInterval(timer); timer = null; }
  function startLoop() {
    stopLoop();
    drawFrame();
    if (!reduce) timer = setInterval(() => { frame++; drawFrame(); }, 250);
  }

  function place() {
    L = layout();
    stage.style.setProperty("--S", (S || 1) + "px");
    const notes = { y: document.getElementById("note-zones"), p: document.querySelector(".note-pink") };
    if (!L) { notes.y.style.display = notes.p.style.display = "none"; return; }
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * S + "px"; canvas.style.height = H * S + "px";
    ctx.imageSmoothingEnabled = false;
    drawStatic();
    Object.assign(screen.style, { left: L.gx * S + "px", top: L.gy * S + "px", width: L.gw * S + "px", height: L.gh * S + "px" });
    const put = (n, x, y, w) => Object.assign(n.style, { display: "", left: x * S + "px", top: y * S + "px", width: w * S + "px" });
    if (S >= 3) {
      put(notes.y, L.mx0 - 30, L.gy + 18, 36);
      put(notes.p, L.mx1 - 8, L.my0 - 3, 34);
    } else notes.y.style.display = notes.p.style.display = "none";
    startLoop();
  }

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(place, 120); });
  place();
})();
