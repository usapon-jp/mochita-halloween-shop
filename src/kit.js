// 小物づくりの共通部品: 色パレット・マテリアル/ジオメトリのキャッシュ・手続き型テクスチャ
import * as THREE from 'three';

export const C = {
  cream: 0xfff1dc, cream2: 0xffe6c4, milk: 0xfffaf0,
  pink: 0xf8cdd8, rose: 0xee9fb4, deepRose: 0xd9748f,
  mint: 0xc4e8d6, mint2: 0x93d1b6, deepMint: 0x5fae92,
  lav: 0xd2c3f2, lav2: 0xaf9ce0,
  wood: 0xcf9a68, woodL: 0xe8c294, woodD: 0xa86f46, woodDD: 0x80502f,
  butter: 0xffe29b, peach: 0xffcfa6, orange: 0xf3a96a, choc: 0x8b5a3c,
  leaf: 0x7fc79a, leaf2: 0x5fae7d, leaf3: 0xa6dcae, sky: 0xcfe9f2,
  white: 0xffffff, gold: 0xf0c869, red: 0xe9788a, blue: 0x9fcbea,
};

// ---- テーマ: ?theme=pastel で春(元の配色)。既定はハロウィン・秋。 ----
export const THEME = new URLSearchParams(location.search).get('theme') === 'pastel' ? 'pastel' : 'halloween';
export const HALLOWEEN = THEME === 'halloween';
export const H = n => '#' + n.toString(16).padStart(6, '0');
if (HALLOWEEN) Object.assign(C, {
  cream: 0xfff0d8, cream2: 0xffdfb4, milk: 0xfff8ee,
  pink: 0xf9b87e, rose: 0xee8a3a, deepRose: 0xd0641c,       // かぼちゃ橙
  mint: 0xdccdf3, mint2: 0xb095e0, deepMint: 0x6f56a6,       // 淡い紫
  lav: 0xc9b2f0, lav2: 0x8e6ccf,
  butter: 0xffd770, peach: 0xffc08a, orange: 0xf0963e, choc: 0x6e4630,
  leaf: 0xe9a93c, leaf2: 0xc8582c, leaf3: 0xf3cf5a,          // 銀杏の黄・もみじの橙赤
  red: 0xe45a3c, blue: 0xb9a8e4, gold: 0xf0c050,
  ink: 0x3a2c4a, moss: 0x9cc15c, ghost: 0xfffdf8,
});
else Object.assign(C, { ink: 0x6a5a7a, moss: 0x7fc79a, ghost: 0xffffff });

const matCache = new Map();
export function M(color, o = {}) {
  const key = color + '|' + (o.r ?? .78) + '|' + (o.m ?? 0) + '|' + (o.op ?? 1) + '|' + (o.em ?? 0) + '|' + (o.map?.uuid ?? '') + '|' + (o.side ?? 0);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, roughness: o.r ?? .78, metalness: o.m ?? 0,
      transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1, map: o.map ?? null,
      emissive: o.em ? color : 0x000000, emissiveIntensity: o.em ?? 0,
      side: o.side ?? THREE.FrontSide,
    });
    if (o.op < 1) m.depthWrite = false;
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

// 角の丸い箱（ExtrudeGeometryのbevelで作る）。中心原点。
export function rbox(w, h, d, r = .04, seg = 3) {
  r = Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001);
  return cached(`rb${w}|${h}|${d}|${r}|${seg}`, () => {
    const iw = w - 2 * r, ih = h - 2 * r;
    const s = new THREE.Shape();
    s.moveTo(-iw / 2, -ih / 2); s.lineTo(iw / 2, -ih / 2); s.lineTo(iw / 2, ih / 2); s.lineTo(-iw / 2, ih / 2); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * r, .0001), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 1 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return g;
  });
}
export const box = (w, h, d) => cached(`bx${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt, rb, h, seg = 20) => cached(`cy${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const sph = (r, ws = 20, hs = 14) => cached(`sp${r}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const cone = (r, h, seg = 20) => cached(`co${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const tor = (R, r, ts = 8, rs = 24, arc = Math.PI * 2) => cached(`to${R}|${r}|${ts}|${rs}|${arc}`, () => new THREE.TorusGeometry(R, r, ts, rs, arc));
export const plane = (w, h) => cached(`pl${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
export function lathe(key, pts, seg = 28) {
  return cached('la' + key, () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg));
}
// 丸みのある円柱（缶・ケーキ）: 面取り付き
export function pill(r, h, bevel = .02, seg = 28) {
  return cached(`pi${r}|${h}|${bevel}|${seg}`, () => {
    const b = Math.min(bevel, r * .9, h / 2 * .9);
    const pts = [[0, -h / 2], [r - b, -h / 2]];
    for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 + i / 4 * Math.PI / 2; pts.push([r - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b]); }
    for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; pts.push([r - b + Math.cos(a) * b, h / 2 - b + Math.sin(a) * b]); }
    pts.push([0, h / 2]);
    return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
  });
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.setScalar(o.s);
  if (o.sx) m.scale.set(o.sx, o.sy ?? o.sx, o.sz ?? o.sx);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true;
  return m;
}
export function add(parent, geo, mat, x, y, z, o) { const m = mesh(geo, mat, x, y, z, o); parent.add(m); return m; }
export function grp(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
}

// ---------- 手続き型テクスチャ ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function texWoodFloor(rep = [4, 3]) {
  return canvasTex(512, 512, (g, w, h) => {
    const rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * w * .37;
      for (let k = -1; k < 3; k++) {
        const x0 = off + k * w * .55, tone = rnd();
        g.fillStyle = `hsl(${28 + tone * 6},${52 + tone * 12}%,${66 + tone * 8}%)`;
        g.fillRect(x0, r * rh, w * .55, rh);
        g.strokeStyle = 'rgba(120,70,40,.10)'; g.lineWidth = 1;
        for (let i = 0; i < 5; i++) { g.beginPath(); const y = r * rh + rnd() * rh; g.moveTo(x0, y); g.bezierCurveTo(x0 + w * .15, y + 2, x0 + w * .35, y - 2, x0 + w * .55, y + 1); g.stroke(); }
        g.fillStyle = 'rgba(110,64,36,.35)'; g.fillRect(x0, r * rh, 2, rh);
      }
      g.fillStyle = 'rgba(110,64,36,.35)'; g.fillRect(0, r * rh, w, 2);
    }
  }, rep);
}
export function texPlaster(base = '#fff0dc', rep = [3, 2]) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,255,255' : '190,150,120'},${rnd() * .07})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 3, 0, 7); g.fill(); }
  }, rep);
}
export function texPlank(base = '#d9a874', rep = [2, 1]) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(120,70,36,${.05 + rnd() * .08})`; g.lineWidth = 1 + rnd() * 1.5; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + rnd() * 6 - 3, w * .6, y + rnd() * 6 - 3, w, y + rnd() * 4 - 2); g.stroke(); }
    g.fillStyle = 'rgba(110,64,36,.18)'; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2);
  }, rep);
}
export function texRoof(_c1, c2 = '#eaa0b4', rep = [6, 3]) { // パステルのうろこ瓦（段ごとに色が変わる）
  const pal = HALLOWEEN ? ['#f6a04d', '#b99be6', '#ffd27a', '#8d6fc4', '#f28a3a'] : ['#f8c6d3', '#c8ead9', '#dccff6', '#fde3b0', '#bfe0f2'];
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = c2; g.fillRect(0, 0, w, h);
    const n = 8, rh = h / n, cw = w / 4;
    for (let r = n; r >= -1; r--) for (let k = -1; k < 5; k++) {
      const x = k * cw + (r % 2 ? cw / 2 : 0), y = r * rh;
      const col = pal[(((k + (r % 2 ? 0 : 0)) % 5) + 5 + r) % 5];
      g.fillStyle = col; g.beginPath(); g.arc(x + cw / 2, y, cw / 2, 0, Math.PI); g.lineTo(x, y); g.fill();
      g.strokeStyle = 'rgba(150,90,110,.28)'; g.lineWidth = 2; g.beginPath(); g.arc(x + cw / 2, y, cw / 2 - 1, .05, Math.PI - .05); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; g.beginPath(); g.arc(x + cw / 2, y, cw / 2 - 7, .35, Math.PI - .9); g.stroke();
    }
  }, rep);
}
export function texStripe(c1 = '#f8cdd8', c2 = '#fffaf0', n = 8) {
  return canvasTex(256, 64, (g, w, h) => {
    const sw = w / n; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c2 : c1; g.fillRect(i * sw, 0, sw, h); }
  });
}
export function texGingham(c1 = '#f6b9c9', rep = [4, 4]) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h);
    g.fillStyle = c1 + 'aa'; g.fillRect(0, 0, w / 2, h); g.fillRect(0, 0, w, h / 2);
    g.fillStyle = c1 + 'aa'; g.globalCompositeOperation = 'source-over';
    g.fillRect(w / 2, 0, w / 2, h / 2); g.fillRect(0, h / 2, w / 2, h / 2);
    g.fillStyle = '#ee9fb4aa'; g.fillRect(0, 0, w / 2, h / 2);
  }, rep);
}
export function texStones(rep = [1, 1]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#9fd3a8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,255,220' : '70,150,100'},${rnd() * .10})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 6, 0, 7); g.fill(); }
  }, rep);
}
export function texGrass(rep = [6, 6]) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = HALLOWEEN ? '#cdc27c' : '#a8dba5'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { const l = rnd(); g.strokeStyle = HALLOWEEN ? `hsla(${42 + l * 24},${42 + l * 20}%,${55 + l * 20}%,.5)` : `hsla(${110 + l * 30},${45 + l * 20}%,${55 + l * 22}%,.5)`; g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 4 - 2, y - 3 - rnd() * 5); g.stroke(); }
    if (HALLOWEEN) { const lc = ['#e8892e', '#c8502a', '#f0c050', '#b8742e']; for (let i = 0; i < 70; i++) { g.save(); g.translate(rnd() * w, rnd() * h); g.rotate(rnd() * 6); g.fillStyle = lc[Math.floor(rnd() * 4)]; g.beginPath(); g.ellipse(0, 0, 3.6, 1.8, 0, 0, 7); g.fill(); g.restore(); } }
    else for (let i = 0; i < 40; i++) { g.fillStyle = rnd() > .5 ? '#fff6d0' : '#fbd0dc'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1.6, 0, 7); g.fill(); }
  }, rep);
}
export function texSky() {
  return canvasTex(8, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (HALLOWEEN) { gr.addColorStop(0, '#c4b2ea'); gr.addColorStop(.5, '#ffd6b2'); gr.addColorStop(1, '#ffeacb'); } else { gr.addColorStop(0, '#bfe3f0'); gr.addColorStop(.55, '#e3f2ee'); gr.addColorStop(1, '#fde9d6'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
export function texBlob() { // 接地影・光だまり用の放射グラデ
  return canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
export function texCloud() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = 'rgba(255,255,255,.9)';
    [[60, 80, 36], [100, 62, 44], [150, 66, 40], [190, 82, 30], [128, 86, 50]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
  });
}
export function texLabel(text, bg = '#fffaf0', fg = '#b8657c', w = 512, h = 256, sub) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.globalAlpha = .45; g.lineWidth = 6; g.setLineDash([2, 14]); g.lineCap = 'round'; g.strokeRect(18, 18, w - 36, h - 36); g.setLineDash([]); g.globalAlpha = 1;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${sub ? h * .30 : h * .36}px "Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic",sans-serif`;
    g.fillText(text, w / 2, sub ? h * .42 : h / 2);
    if (sub) { g.font = `600 ${h * .13}px "Hiragino Maru Gothic ProN","Hiragino Sans",sans-serif`; g.globalAlpha = .75; g.fillText(sub, w / 2, h * .74); }
  });
}
export function texSpine(c = '#f6b9c9', accent = '#fffaf0') {
  return canvasTex(64, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = accent; g.fillRect(0, h * .2, w, 5); g.fillRect(0, h * .75, w, 5); });
}
