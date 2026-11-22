// ─────────────────────────────────────────────
//  SCENE — 모니터 밖 방을 픽셀 아트로 그린다
//  · 낮은 해상도(한 픽셀 = S css px) 캔버스에 직접 찍고, 확대할 때 픽셀을 그대로 유지
//  · 화면(#screen)은 모니터 구멍 위치에 정확히 맞춰 얹는다
//  · 움직이는 것: 머그컵 김, 창밖 등대 불빛, 전원 LED (초당 4프레임)
// ─────────────────────────────────────────────
(() => {
  const canvas = document.getElementById("scene");
  const screen = document.getElementById("screen");
  const stage = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 팔레트 (32색 안쪽)
  const P = {
    ink: "#14161c",
    wallA: "#1b222e", wallB: "#1f2734", wallC: "#242d3c", seam: "#171e29", glow: "#2b3548", glow2: "#323e55",
    sky: "#0c1322", sky2: "#14203a", star: "#c9d1e2", moon: "#efe4bd", moonD: "#c9bd94",
    sea: "#122238", sea2: "#1d3554", isl: "#080c14", beam: "#ffe7a0",
    frame: "#8c93a0", frameD: "#545a66", frameHi: "#b8bec9", blind: "#aeb5c1", blindD: "#7d8491",
    paper: "#e8e4d6", paperD: "#bcb7a6", line: "#8d897b", red: "#b23a2e", redD: "#7e241c",
    woodHi: "#8c5d3c", wood: "#6b432a", wood2: "#5c3923", woodD: "#472b1a", woodDD: "#2c190e", warm: "#a8774a",
    shell: "#cdc3a3", shellHi: "#e7e0c7", shellLo: "#a49978", shellD: "#7b7157", shellY: "#c2b388", out: "#3b3529", recess: "#25231f",
    key: "#ddd5bc", keyD: "#aaa081", kb: "#beb495",
    pad: "#26304a", padD: "#1b2236",
    mug: "#9b3029", mugHi: "#c44a40", mugD: "#6b1f1a", coffee: "#3b2416", steam: "#8d97ab",
    folder: "#c8a26a", folderD: "#9f7d4b",
    lampD: "#2b2f37", lampM: "#4b515d", lampHi: "#7b8191", bulb: "#fff2c2",
    led: "#5cff7a", ledD: "#1f5a2a",
    clock: "#e6e2d4",
  };

  // 4×4 베이어 행렬 (디더링)
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y, f) => BAYER[(y & 3) * 4 + (x & 3)] < f * 16;

  const hex = {};
  const rgb = (c) => hex[c] || (hex[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);

  let W, H, S, buf, img, L, staticCanvas, frame = 0, timer;

  function px(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, v = rgb(c);
    buf[i] = v[0]; buf[i + 1] = v[1]; buf[i + 2] = v[2]; buf[i + 3] = 255;
  }
  function rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); }
  function hline(x, y, w, c) { rect(x, y, w, 1, c); }
  function vline(x, y, h, c) { rect(x, y, 1, h, c); }
  function get(x, y) {
    const i = (y * W + x) * 4;
    return "#" + [buf[i], buf[i + 1], buf[i + 2]].map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  // 결정적 난수 (매번 같은 그림)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ── 배치 계산 ───────────────────────
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    if (vw <= 720) { // 휴대폰: 방은 숨기고 화면만
      canvas.style.display = "none";
      screen.removeAttribute("style");
      stopLoop();
      return null;
    }
    canvas.style.display = "";
    S = Math.max(2, Math.min(6, Math.round(Math.min(vw / 380, vh / 238))));
    W = Math.ceil(vw / S); H = Math.ceil(vh / S);
    const deskH = Math.max(40, Math.min(72, Math.round(H * 0.23)));
    const deskTop = H - deskH;
    const sTop = 9;
    const sb = deskTop - 18;              // 화면 아래 = 턱 13 + 목 5
    const sh = sb - sTop;
    const sw = Math.min(Math.round(sh * 4 / 3), W - 112);
    const sx = Math.floor((W - sw) / 2);
    return { deskTop, sTop, sb, sh, sw, sx };
  }

  // ── 정적인 그림 ─────────────────────
  function drawStatic() {
    seed = 7;
    buf = new Uint8ClampedArray(W * H * 4);
    const { deskTop, sTop, sb, sw, sx } = L;
    const mx0 = sx - 7, mx1 = sx + sw + 7, my0 = sTop - 7, my1 = sb + 13;

    // 벽: 위가 어둡고 아래로 갈수록 밝게, 디더로 이음 + 벽판 이음매
    for (let y = 0; y < deskTop; y++) {
      const t = y / deskTop;
      for (let x = 0; x < W; x++) {
        let c = t < 0.45 ? (dith(x, y, t / 0.45) ? P.wallB : P.wallA) : (dith(x, y, (t - 0.45) / 0.55) ? P.wallC : P.wallB);
        if (x % 48 === 0) c = P.seam;
        // 모니터 빛이 벽에 번짐
        const dx = Math.max(mx0 - x, 0, x - mx1), dy = Math.max(my0 - y, 0, y - my1);
        const d = Math.hypot(dx, dy);
        if (d < 26) c = dith(x, y, (1 - d / 26) * 0.9) ? (d < 8 ? P.glow2 : P.glow) : c;
        px(x, y, c);
      }
    }

    // 창문 (오른쪽 벽): 밤바다와 섬, 등대
    const wx0 = mx1 + 14, wx1 = W - 10, wy0 = 14, wy1 = deskTop - 30;
    L.win = null;
    if (wx1 - wx0 >= 34 && wy1 - wy0 >= 40) {
      rect(wx0 - 3, wy0 - 3, wx1 - wx0 + 6, wy1 - wy0 + 6, P.frameD);
      rect(wx0 - 2, wy0 - 2, wx1 - wx0 + 4, wy1 - wy0 + 4, P.frame);
      hline(wx0 - 2, wy0 - 2, wx1 - wx0 + 4, P.frameHi);
      for (let y = wy0; y < wy1; y++) for (let x = wx0; x < wx1; x++) px(x, y, dith(x, y, (y - wy0) / (wy1 - wy0)) ? P.sky2 : P.sky);
      for (let i = 0; i < (wx1 - wx0) * (wy1 - wy0) / 60; i++) px(wx0 + rnd() * (wx1 - wx0), wy0 + rnd() * (wy1 - wy0) * 0.6, P.star);
      // 달
      const mcx = wx1 - 11, mcy = wy0 + Math.round((wy1 - wy0) * 0.3) + 10;
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 25) px(mcx + x, mcy + y, (x + 2) * (x + 2) + (y + 1) * (y + 1) < 6 ? P.moonD : P.moon);
      // 바다 + 섬
      const hz = wy1 - 14;
      for (let y = hz; y < wy1; y++) for (let x = wx0; x < wx1; x++) px(x, y, dith(x, y, (y - hz) / 14 * 0.6) ? P.sea2 : P.sea);
      for (let x = wx0; x < wx1; x += 3) if (rnd() < 0.5) hline(x, hz + 2 + Math.floor(rnd() * 10), 2, P.sea2);
      const icx = Math.round((wx0 + wx1) / 2) - 4, iw = Math.min(30, (wx1 - wx0) * 0.55);
      for (let x = -iw / 2; x <= iw / 2; x++) {
        const h = Math.round(Math.sqrt(Math.max(0, 1 - (2 * x / iw) ** 2)) * 6 + (Math.abs(x) < 3 ? 2 : 0));
        vline(icx + x, hz - h, h, P.isl);
      }
      const lhx = icx + Math.round(iw / 2) + 2;
      hline(lhx - 2, hz - 1, 5, P.isl); vline(lhx, hz - 6, 5, P.isl);
      L.win = { wx0, wx1, wy0, wy1, lhx, lhy: hz - 7 };
      // 블라인드 (위쪽 1/3)
      const by1 = wy0 + Math.round((wy1 - wy0) * 0.3);
      for (let y = wy0; y < by1; y++) hline(wx0, y, wx1 - wx0, y % 3 === 2 ? P.blindD : P.blind);
      hline(wx0, by1, wx1 - wx0, P.frameD);
      vline(wx0 + 6, by1, 10, P.blindD); px(wx0 + 6, by1 + 10, P.frame);
      // 창틀 가운데 살
      vline(Math.round((wx0 + wx1) / 2), by1 + 1, wy1 - by1 - 1, P.frameD);
      rect(wx0 - 4, wy1 + 2, wx1 - wx0 + 8, 2, P.frame);
      hline(wx0 - 4, wy1 + 4, wx1 - wx0 + 8, P.frameD);
    }

    // 왼쪽 벽: 벽시계(18:04) + 달력(22일 동그라미)
    const leftSpace = mx0;
    if (leftSpace >= 46) {
      const cx = Math.round(leftSpace * 0.5), cy = 26, r = 9;
      for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
        const d = x * x + y * y;
        if (d <= (r + 1) * (r + 1)) px(cx + x, cy + y, d <= r * r ? P.clock : P.ink);
      }
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; px(cx + Math.round(Math.sin(a) * (r - 1)), cy - Math.round(Math.cos(a) * (r - 1)), P.line); }
      // 6시 (시침) · 4분 (분침)
      for (let k = 1; k <= 4; k++) px(cx, cy + k, P.ink);
      for (let k = 1; k <= 7; k++) { const a = 4 / 60 * Math.PI * 2; px(cx + Math.round(Math.sin(a) * k), cy - Math.round(Math.cos(a) * k), P.ink); }
      px(cx, cy, P.red);

      const kx = Math.round(leftSpace * 0.5) - 12, ky = 44;
      if (ky + 32 < deskTop - 30) {
        rect(kx + 1, ky + 1, 24, 30, P.ink);               // 그림자
        rect(kx, ky, 24, 30, P.paper);
        rect(kx, ky, 24, 6, P.red);
        px(kx + 11, ky - 2, P.lampHi); px(kx + 12, ky - 2, P.lampHi);
        for (let d = 0; d < 30; d++) {
          const c = (d + 6) % 7, rr = Math.floor((d + 6) / 7);
          const x = kx + 2 + c * 3, y = ky + 8 + rr * 4;
          px(x, y, c === 0 ? P.red : P.line); px(x + 1, y, c === 0 ? P.red : P.line);
          if (d === 21) { // 22일
            hline(x - 1, y - 1, 4, P.red); hline(x - 1, y + 1, 4, P.red); px(x - 1, y, P.red); px(x + 2, y, P.red);
          }
        }
      }
    }

    // 책상
    hline(0, deskTop - 1, W, P.ink);
    for (let y = deskTop; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const r = y - deskTop, plank = Math.floor((r - 1) / 9);
        let c = r === 0 ? P.woodHi : (r - 1) % 9 === 8 ? P.woodD : plank % 2 ? P.wood2 : P.wood;
        if (r > (H - deskTop) * 0.7 && dith(x, y, (r / (H - deskTop) - 0.7) / 0.3 * 0.6)) c = c === P.woodD ? P.woodDD : P.woodD;
        px(x, y, c);
      }
    }
    for (let i = 0; i < W * (H - deskTop) / 70; i++) { // 나뭇결
      const x = rnd() * W, y = deskTop + 2 + rnd() * (H - deskTop - 2);
      if (get(x | 0, y | 0) === P.woodD) continue;
      hline(x, y, 4 + rnd() * 14, P.woodD);
    }
    // 책상 위 모니터 빛
    const gcx = (mx0 + mx1) / 2;
    for (let y = deskTop + 1; y < H; y++) for (let x = 0; x < W; x++) {
      const f = 1 - Math.hypot((x - gcx) / ((mx1 - mx0) * 0.75), (y - deskTop) / 22);
      if (f > 0 && dith(x, y, f * 0.55)) { const c = get(x, y); px(x, y, c === P.wood ? P.warm : c === P.wood2 ? P.wood : c === P.woodD ? P.wood2 : c); }
    }

    // 스탠드 조명 (왼쪽 책상): 받침 → 아래 팔 → 관절 → 위 팔 → 갓
    if (leftSpace >= 40) {
      const bx = Math.max(12, Math.round(mx0 * 0.35)), by = deskTop + 10;
      const jx = bx - 4, jy = by - 22;               // 관절
      const hx = jx + 20, hy = jy - 10;              // 갓 위치 (모니터 쪽을 향함)
      // 불빛 원뿔 (갓 아래로)
      for (let y = hy + 4; y < H; y++) {
        const spread = (y - hy) * 0.6;
        for (let x = Math.floor(hx + 3 - spread); x <= hx + 3 + spread; x++) {
          const f = (1 - Math.abs(x - hx - 3) / (spread + 2)) * (y < deskTop ? 0.3 : 0.75) * (1 - (y - hy) / (H - hy + 30));
          if (f > 0 && dith(x, y, f)) {
            const c = get(x, y);
            const map = { [P.wood]: P.warm, [P.wood2]: P.wood, [P.woodD]: P.wood2, [P.warm]: P.woodHi, [P.wallB]: P.wallC, [P.wallA]: P.wallB, [P.wallC]: P.glow, [P.paper]: P.bulb };
            if (map[c]) px(x, y, map[c]);
          }
        }
      }
      rect(bx - 7, by, 15, 3, P.lampD); hline(bx - 7, by, 15, P.lampHi); hline(bx - 6, by + 3, 14, P.woodDD);
      for (let k = 0; k <= 22; k++) { const x = bx + Math.round((jx - bx) * k / 22), y = by - k; px(x, y, P.lampM); px(x + 1, y, P.lampD); }
      rect(jx - 1, jy - 1, 3, 3, P.lampHi);
      for (let k = 0; k <= 20; k++) { const x = jx + k, y = jy - Math.round(k * 0.5); px(x, y, P.lampM); px(x, y + 1, P.lampD); }
      // 갓: 아래로 벌어진 사다리꼴
      for (let r = 0; r < 6; r++) hline(hx - 1 - r, hy + r - 2, 9 + r * 2, r === 0 ? P.lampHi : r === 5 ? P.lampD : P.lampM);
      hline(hx - 4, hy + 4, 15, P.bulb);
    }

    // 모니터 받침
    const ncx = Math.round((mx0 + mx1) / 2);
    for (let y = 0; y < 5; y++) hline(ncx - 10 - Math.floor(y / 2), my1 + y, 21 + Math.floor(y / 2) * 2, y === 0 ? P.shellD : P.shellLo);
    rect(ncx - 34, my1 + 5, 69, 3, P.shell);
    hline(ncx - 34, my1 + 5, 69, P.shellHi);
    hline(ncx - 33, my1 + 8, 67, P.shellD);
    hline(ncx - 30, my1 + 9, 61, P.woodDD);

    // 모니터 본체 (베이지, 위쪽이 누렇게 바램)
    rect(mx0 - 1, my0 - 1, mx1 - mx0 + 2, my1 - my0 + 2, P.out);
    for (let y = my0; y < my1; y++) for (let x = mx0; x < mx1; x++) {
      px(x, y, dith(x, y, Math.max(0, 0.55 - (y - my0) / (my1 - my0))) ? P.shellY : P.shell);
    }
    hline(mx0, my0, mx1 - mx0, P.shellHi); vline(mx0, my0, my1 - my0, P.shellHi);
    hline(mx0, my1 - 1, mx1 - mx0, P.shellD); vline(mx1 - 1, my0, my1 - my0, P.shellD);
    hline(mx0 + 1, my1 - 2, mx1 - mx0 - 2, P.shellLo);
    // 화면 구멍 테두리
    rect(sx - 2, sTop - 2, sw + 4, sb - sTop + 4, P.shellLo);
    rect(sx - 1, sTop - 1, sw + 2, sb - sTop + 2, P.recess);
    hline(sx - 2, sb + 1, sw + 4, P.shellHi); vline(sx + sw + 1, sTop - 2, sb - sTop + 4, P.shellHi);
    // 손때 · 긁힘
    for (let i = 0; i < 14; i++) px(mx0 + 2 + rnd() * (mx1 - mx0 - 4), my0 + 2 + rnd() * 4, P.shellLo);
    hline(mx1 - 30, my1 - 7, 6, P.shellLo);
    // 턱: 로고 · 버튼 · LED
    const cy = sb + 6;
    rect(sx + 2, cy, 2, 3, P.shellD); rect(sx + 5, cy, 2, 3, P.shellD); hline(sx + 9, cy + 1, 14, P.shellLo); // "CW ---"
    rect(ncx - 5, cy - 1, 11, 5, P.paper); hline(ncx - 4, cy + 1, 8, P.line); px(ncx + 5, cy + 3, P.shell);  // 검수 스티커
    for (let b = 0; b < 4; b++) { const bx = sx + sw - 30 + b * 6; rect(bx, cy, 4, 2, P.shellLo); hline(bx, cy, 4, P.shellHi); }
    rect(sx + sw - 4, cy - 1, 4, 4, P.shellLo); hline(sx + sw - 4, cy - 1, 4, P.shellHi);
    L.led = { x: sx + sw - 7, y: cy };

    // 키보드 (베이지)
    const kw = Math.round(sw * 0.6), kx = Math.round(ncx - kw / 2), ky = deskTop + 15, kh = 12;
    if (ky + kh < H) {
      hline(kx + 1, ky + kh, kw, P.woodDD);
      rect(kx, ky, kw, kh, P.kb);
      hline(kx, ky, kw, P.shellHi); hline(kx, ky + kh - 1, kw, P.shellD);
      for (let r = 0; r < 4; r++) {
        for (let x = kx + 2; x < kx + kw - 3; x += 4) {
          if (r === 3 && x > kx + kw * 0.3 && x < kx + kw * 0.68) continue;
          rect(x, ky + 2 + r * 2 + (r ? r : 0) * 0, 3, 1, P.key);
          px(x, ky + 3 + r * 2, P.keyD); px(x + 1, ky + 3 + r * 2, P.keyD); px(x + 2, ky + 3 + r * 2, P.keyD);
        }
      }
      hline(Math.round(kx + kw * 0.3), ky + 8, Math.round(kw * 0.38), P.key); // 스페이스
      hline(Math.round(kx + kw * 0.3), ky + 9, Math.round(kw * 0.38), P.keyD);
      // 케이블
      for (let k = 0; k < ky - my1 - 8; k++) px(ncx + 12 + Math.round(Math.sin(k / 3)), my1 + 8 + k, P.shellD);

      // 마우스 패드 + 마우스
      const mpx = kx + kw + 8;
      if (mpx + 22 < mx1 + 30) {
        rect(mpx, ky - 2, 22, 15, P.pad); hline(mpx, ky - 2, 22, P.padD); hline(mpx + 1, ky + 13, 22, P.woodDD);
        rect(mpx + 9, ky + 3, 5, 7, P.shell); hline(mpx + 9, ky + 3, 5, P.shellHi); px(mpx + 11, ky + 4, P.shellD); hline(mpx + 9, ky + 9, 5, P.shellD);
        for (let k = 0; k < 6; k++) px(mpx + 11, ky + 2 - k, P.shellD);
      }
    }

    // 서류철 + 방송 기록지 (왼쪽 앞)
    const fx = Math.max(4, mx0 - 4), fy = deskTop + 22;
    if (fy + 12 < H + 6) {
      rect(fx + 2, fy + 2, 40, 18, P.woodDD);
      rect(fx, fy, 40, 18, P.folder); hline(fx, fy, 40, P.paper); rect(fx + 3, fy - 2, 10, 2, P.folder);
      hline(fx, fy + 17, 40, P.folderD);
      rect(fx + 5, fy + 5, 16, 5, P.paper); hline(fx + 6, fy + 7, 13, P.line);
      // 빨간 "기밀" 도장
      rect(fx + 26, fy + 4, 10, 6, P.red); rect(fx + 27, fy + 5, 8, 4, P.folder); hline(fx + 28, fy + 7, 6, P.red);
      // 기록지 (살짝 비켜 겹침)
      const qx = fx + 30, qy = fy - 9;
      rect(qx + 1, qy + 1, 26, 20, P.woodDD);
      rect(qx, qy, 26, 20, P.paper); hline(qx, qy + 19, 26, P.paperD); vline(qx + 25, qy, 20, P.paperD);
      for (let l = 0; l < 6; l++) hline(qx + 3, qy + 4 + l * 2.5, 12 + (l * 7) % 9, l === 5 ? P.red : P.line);
      rect(qx + 4, qy - 1, 2, 4, P.frameHi);          // 클립
    }

    // 머그컵 (오른쪽)
    const ux = Math.min(W - 16, mx1 + 14), uy = deskTop + 8;
    if (ux > mx1 + 4) {
      hline(ux, uy + 11, 11, P.woodDD);
      rect(ux, uy, 10, 11, P.mug); vline(ux + 1, uy + 1, 9, P.mugHi); vline(ux + 9, uy, 11, P.mugD);
      hline(ux, uy, 10, P.mugD); hline(ux + 1, uy + 1, 8, P.coffee);
      vline(ux + 11, uy + 3, 5, P.mugD); px(ux + 10, uy + 2, P.mugD); px(ux + 10, uy + 8, P.mugD);
      L.mug = { x: ux + 2, y: uy - 2 };
    } else L.mug = null;

    img = new ImageData(buf, W, H);
    staticCanvas = document.createElement("canvas");
    staticCanvas.width = W; staticCanvas.height = H;
    staticCanvas.getContext("2d").putImageData(img, 0, 0);
  }

  // ── 움직이는 것 ─────────────────────
  function drawFrame() {
    ctx.drawImage(staticCanvas, 0, 0);
    const f = frame;
    // 머그컵 김: 3줄이 번갈아 올라감
    if (L.mug) {
      ctx.fillStyle = P.steam;
      for (let s = 0; s < 3; s++) {
        for (let k = 0; k < 3; k++) {
          const t = (f + s * 2 + k * 3) % 8;
          if (t > 5) continue;
          const x = L.mug.x + s * 3 + (t % 2 ? 1 : 0), y = L.mug.y - t * 2 - k;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // 등대 불빛: 8프레임 중 3프레임 빛줄기
    if (L.win) {
      const { lhx, lhy, wx0, wx1 } = L.win;
      const on = f % 8 < 3;
      ctx.fillStyle = on ? P.beam : P.moonD;
      ctx.fillRect(lhx - (on ? 1 : 0), lhy, on ? 3 : 1, 1);
      if (on) {
        const dir = f % 16 < 8 ? -1 : 1;
        for (let k = 3; k < 30; k++) {
          const x = lhx + dir * k;
          if (x <= wx0 || x >= wx1) break;
          if ((k + f) % 2 === 0 || k < 8) ctx.fillRect(x, lhy - Math.round(k / 10), 1, 1);
        }
      }
    }
    // LED: 아주 가끔 꺼졌다 켜짐
    ctx.fillStyle = f % 40 === 39 ? P.ledD : P.led;
    ctx.fillRect(L.led.x, L.led.y, 2, 1);
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
    if (!L) { document.querySelectorAll(".note").forEach((n) => (n.style.display = "none")); return; }
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * S + "px"; canvas.style.height = H * S + "px";
    ctx.imageSmoothingEnabled = false;
    drawStatic();
    Object.assign(screen.style, {
      left: L.sx * S + "px", top: L.sTop * S + "px",
      width: L.sw * S + "px", height: L.sh * S + "px",
    });
    // 포스트잇: 모니터 테두리에 붙임 (픽셀 격자에 맞춤)
    const y = document.getElementById("note-zones"), p = document.querySelector(".note-pink");
    const put = (n, x, yy, w) => Object.assign(n.style, { display: "", left: x * S + "px", top: yy * S + "px", width: w * S + "px" });
    if (S >= 3) {
      put(y, L.sx - 7 - 22, L.sTop + 14, 28);
      put(p, L.sx + L.sw + 1, L.sTop - 4, 26);
    } else { y.style.display = p.style.display = "none"; } // 너무 작으면 글씨가 안 들어감
    startLoop();
  }

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(place, 120); });
  place();
})();
