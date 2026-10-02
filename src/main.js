import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { texSky, texCloud, texBlob, HALLOWEEN } from './kit.js';
import { buildShop, SLOT } from './shop.js';
import { anim } from './props.js';
import { SHOTS, CameraRig } from './cameras.js';
import { MOCHITA, walkSpeed } from './config.js';
import { buildProceduralMochita } from './mochita_proc.js';
import { Walker, attachControls, pickTarget, takePhoto, buildProxies } from './play.js';
const PAD_TOP = 0.045; // 座布団のミント敷物の上面（SLOTからの高さ）
const q0 = new URLSearchParams(location.search);
const MOCHITA_LOOK = { roughness: 0.8, tint: 1.0 }; // plain用: 光沢を抑え、白飛びしにくくする

const canvas = document.getElementById('c');
document.body.dataset.theme = HALLOWEEN ? 'halloween' : 'pastel'; // UIの色（style.css）
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: new URLSearchParams(location.search).has('capture') });
} catch (e) { document.getElementById('fallback').hidden = false; throw e; }
const isSmall = Math.min(innerWidth, innerHeight) < 700;
const dprCap = isSmall ? 1.75 : 2;
renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
renderer.shadowMap.autoUpdate = false; // 影は数フレームに1回だけ更新（軽量化）
const SHADOW_EVERY = isSmall ? 3 : 2; let frameN = 0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
scene.background = texSky();

// ---- 光: 柔らかい昼の自然光（白い体が飛ばないよう控えめ） ----
scene.add(new THREE.HemisphereLight(HALLOWEEN ? 0xffe8d0 : 0xfff4e8, HALLOWEEN ? 0xd9a88a : 0xf0c9bb, 1.25));
const sun = new THREE.DirectionalLight(HALLOWEEN ? 0xffe0b8 : 0xfff0dc, 2.2);
sun.position.set(5, 11, 9); sun.target.position.set(1.5, 0, -.5);
sun.castShadow = true; sun.shadow.mapSize.set(isSmall ? 1024 : 2048, isSmall ? 1024 : 2048);
const sc = sun.shadow.camera; sc.left = -12; sc.right = 14; sc.top = 10; sc.bottom = -10; sc.near = 2; sc.far = 40;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xdfe9ff, .35); fill.position.set(-8, 5, 4); scene.add(fill);
// 店内の温かい灯り（影なし）
[[0, 3.1, -1.2, 6], [-2.8, 2.4, 1.0, 4], [2.8, 2.4, 0.4, 4]].forEach(([x, y, z, i]) => { const l = new THREE.PointLight(HALLOWEEN ? 0xffbf80 : 0xffd9a8, i, 7, 2); l.position.set(x, y, z); scene.add(l); });

// ---- 店 ----
const shop = buildShop(scene);

// 雲（島の外の空）
const cloudTex = texCloud();
const clouds = [];
[[-14, 9, -22, 9], [10, 11, -26, 12], [-2, 7, -30, 10], [22, 8, -12, 8], [-24, 6, -4, 9], [14, 5, -20, 7]].forEach(([x, y, z, s]) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: .85, depthWrite: false, fog: false, color: HALLOWEEN ? 0xffe0cc : 0xffffff }));
  sp.position.set(x, y, z); sp.scale.set(s, s / 2, 1); sp.userData.base = x; sp.userData.spd = .05 + Math.random() * .05; scene.add(sp); clouds.push(sp);
});

// ---- 静的メッシュを材質ごとに結合してドローコールを削減 ----
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(), remove = [];
  root.traverse(o => {
    if (!o.isMesh || o.userData.noMerge || o.material.isShaderMaterial) return;
    for (let p = o.parent; p; p = p.parent) if (p.userData.sway || p.userData.steam || p.userData.noMerge || p.userData.bob || p.userData.fly) return;
    if (o.userData.shaft || o.userData.leaf) return;
    const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
    let e = groups.get(key); if (!e) groups.set(key, e = { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder, geos: [] });
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(o.matrixWorld); e.geos.push(g); remove.push(o);
  });
  remove.forEach(o => o.parent.remove(o));
  let n = 0;
  for (const e of groups.values()) {
    const m = new THREE.Mesh(mergeGeometries(e.geos, false), e.mat);
    m.castShadow = e.cast; m.receiveShadow = e.recv; m.renderOrder = e.ro; m.matrixAutoUpdate = false; m.frustumCulled = false;
    scene.add(m); n++;
    e.geos.forEach(g => g.dispose());
  }
  return n;
}
// 揺れるグループ(植物・看板など)は、中身を材質ごとに1メッシュへ結合してから動かす
const DYN = o => o.userData.sway || o.userData.steam || o.userData.noMerge || o.userData.bob || o.userData.fly;
function bakeDynamic(root) {
  root.updateMatrixWorld(true);
  const targets = []; root.traverse(o => { if (o.userData.sway && !o.isMesh) targets.push(o); });
  for (const g of targets) {
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), by = new Map(), kill = [];
    (function walk(n) {
      for (const c of n.children) {
        if (c.isMesh && !c.userData.noMerge && !c.userData.shaft && !c.userData.leaf && !c.material.isShaderMaterial) {
          const rel = new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld);
          let geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
          for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
          if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
          geo.applyMatrix4(rel);
          const key = c.material.uuid + '|' + c.castShadow + '|' + c.receiveShadow + '|' + c.renderOrder;
          let e = by.get(key); if (!e) by.set(key, e = { mat: c.material, cast: c.castShadow, recv: c.receiveShadow, ro: c.renderOrder, geos: [] });
          e.geos.push(geo); kill.push(c);
        } else if (!c.isMesh && !c.isSprite && !DYN(c)) walk(c);
      }
    })(g);
    kill.forEach(c => c.parent.remove(c));
    for (const e of by.values()) { const mm = new THREE.Mesh(mergeGeometries(e.geos, false), e.mat); mm.castShadow = e.cast; mm.receiveShadow = e.recv; mm.renderOrder = e.ro; mm.frustumCulled = false; g.add(mm); e.geos.forEach(x => x.dispose()); }
  }
}
bakeDynamic(shop.world);
const swayList = [], steamList = [];
shop.world.traverse(o => { if (o.userData.sway) swayList.push(o); if (o.userData.steam) steamList.push(o); });
swayList.forEach(o => { o.userData.base = { x: o.position.x, z: o.position.z, rz: o.rotation.z }; });
const mergedCount = mergeStatic(shop.world);

// もちた専用のやわらかい前ライト（顔が暗くならず、かつ白飛びしない強さ）
const mochitaFill = new THREE.PointLight(0xfff3e4, 2.6, 3.4, 2); mochitaFill.position.set(.35, 1.25, 1.35); shop.slot.add(mochitaFill);
// 縁の光（背後上から細く）。輪郭がふわっと浮く。
const rim = new THREE.SpotLight(0xffe6cc, 14, 7, .42, 1, 2); rim.position.set(-.6, 1.5, -1.4); rim.target.position.set(0, .6, 0); shop.slot.add(rim, rim.target);
// ---- もちた差し替え口 ----
// 後から GLB を置くだけ: ?model=assets/mochita.glb  または  window.placeMochita(url, {height})
let mochitaMixer = null, mochitaRoot = null;
const ghost = (() => { // 撮影構図確認用の仮ボリューム（Gキー）。モデルではない
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xff7aa0, transparent: true, opacity: .28, depthWrite: false });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), m); b.scale.set(1, .85, .9); b.position.y = .45; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), m); h.scale.set(1, .85, .9); h.position.y = .95; g.add(h);
  g.visible = false; shop.slot.add(g); return g;
})();
// ---- 法線だけのなめらか化（頂点の位置＝形は一切変えない）----
// 位置で溶接した頂点グラフ上で法線を何度かならす。凹凸の「陰影」だけが弱まり、輪郭は元のまま。
// 部位ごとに強さを変える: 手=弱め(輪郭の陰影を残す) / 全体=中 / お腹・ほっぺ=強め。顔の目鼻は元の法線(protect)。
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function regionWeights(x, y, z) { // 元モデルの座標（高さ約2.0）で実測した位置
  const ax = Math.abs(x);
  const hm = 1 - sstep(.16, .30, Math.hypot(ax - .38, y - .65, z - 1.1));                                   // 手
  const bd = Math.hypot(x / .55, (y - .48) / .38) + (z < .6 ? 9 : 0), bm = (1 - sstep(.7, 1.2, bd)) * (1 - hm); // お腹
  const cd = Math.hypot((ax - .70) / .36, (y - 1.02) / .38, (z - .80) / .6), cm = 1 - sstep(.7, 1.4, cd);      // ほっぺ
  return { hand: hm, strong: Math.max(bm, cm) };
}
function smoothNormals(geo, mid, lam = .5, protect = null) {
  const P = geo.attributes.position, N = geo.attributes.normal, idx = geo.index; if (!P || !N || !idx) return;
  const n = P.count, key = new Map(), wid = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = Math.round(P.getX(i) * 2e4) + ',' + Math.round(P.getY(i) * 2e4) + ',' + Math.round(P.getZ(i) * 2e4); let w = key.get(k); if (w === undefined) { w = key.size; key.set(k, w); } wid[i] = w; }
  const m = key.size, nb = Array.from({ length: m }, () => new Set());
  for (let t = 0; t < idx.count; t += 3) { const a = wid[idx.getX(t)], b = wid[idx.getX(t + 1)], c = wid[idx.getX(t + 2)]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  const orig = new Float32Array(N.array), nbA = nb.map(s => Int32Array.from(s));
  let cur = new Float32Array(m * 3), nxt = new Float32Array(m * 3);
  for (let i = 0; i < n; i++) { const w = wid[i] * 3; cur[w] += N.getX(i); cur[w + 1] += N.getY(i); cur[w + 2] += N.getZ(i); }
  for (let w = 0; w < m; w++) { const l = Math.hypot(cur[w * 3], cur[w * 3 + 1], cur[w * 3 + 2]) || 1; cur[w * 3] /= l; cur[w * 3 + 1] /= l; cur[w * 3 + 2] /= l; }
  const levels = { weak: Math.max(1, Math.round(mid * .25)), mid, strong: Math.round(mid * 7) }, snap = {};
  for (let it = 1; it <= levels.strong; it++) {
    for (let w = 0; w < m; w++) {
      const ns = nbA[w]; let ax = 0, ay = 0, az = 0; for (let j = 0; j < ns.length; j++) { const u = ns[j] * 3; ax += cur[u]; ay += cur[u + 1]; az += cur[u + 2]; }
      const d = ns.length || 1, x = cur[w * 3] + lam * (ax / d - cur[w * 3]), y = cur[w * 3 + 1] + lam * (ay / d - cur[w * 3 + 1]), z = cur[w * 3 + 2] + lam * (az / d - cur[w * 3 + 2]), l = Math.hypot(x, y, z) || 1;
      nxt[w * 3] = x / l; nxt[w * 3 + 1] = y / l; nxt[w * 3 + 2] = z / l;
    }
    [cur, nxt] = [nxt, cur];
    if (it === levels.weak) snap.weak = cur.slice(); if (it === levels.mid) snap.mid = cur.slice(); if (it === levels.strong) snap.strong = cur.slice();
  }
  for (let i = 0; i < n; i++) {
    const w = wid[i] * 3, r = regionWeights(P.getX(i), P.getY(i), P.getZ(i));
    let x = snap.mid[w], y = snap.mid[w + 1], z = snap.mid[w + 2];
    x += (snap.strong[w] - x) * r.strong; y += (snap.strong[w + 1] - y) * r.strong; z += (snap.strong[w + 2] - z) * r.strong;
    x += (snap.weak[w] - x) * r.hand; y += (snap.weak[w + 1] - y) * r.hand; z += (snap.weak[w + 2] - z) * r.hand;
    if (protect && protect[i] > 0) { const k = protect[i]; x += (orig[i * 3] - x) * k; y += (orig[i * 3 + 1] - y) * k; z += (orig[i * 3 + 2] - z) * k; }
    const l = Math.hypot(x, y, z) || 1; N.setXYZ(i, x / l, y / l, z / l);
  }
  N.needsUpdate = true;
}
const NSMOOTH = parseInt(q0.get('nsmooth') ?? '50', 10);
// 目・鼻・模様（暗い所）とその周囲は元の法線を残す（ふくらんだビーズ目が鏡のようになるのを防ぐ）
function featureMask(geo, map) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(map.image, 0, 0, S, S);
  const d = g.getImageData(0, 0, S, S).data, uv = geo.attributes.uv, pos = geo.attributes.position, out = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = map.flipY ? 1 - uv.getY(i) : uv.getY(i), cx = Math.round(u * (S - 1)), cy = Math.round(v * (S - 1)); let dark = 0;
    for (let dy = -14; dy <= 14; dy += 7) for (let dx = -14; dx <= 14; dx += 7) { const x = Math.min(S - 1, Math.max(0, cx + dx)), y = Math.min(S - 1, Math.max(0, cy + dy)), p = (y * S + x) * 4, lum = (d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11) / 255; if (lum > .12 && lum < .45) dark = 1; }
    out[i] = (dark && pos.getY(i) > 1.08 && Math.abs(pos.getX(i)) < .55 && pos.getZ(i) > .8) ? 1 : 0; // 目・鼻のある顔の正面だけ（ほっぺ側面や体の暗い線は対象外）
  }
  return out;
}
// ---- ふわふわフェルトの質感 ----
// 粘土っぽさの原因だった「全身が同じマット1枚」をやめ、(1)起毛の縁の光り(sheen) (2)細かい毛足の凹凸 (3)つやのあるビーズ目 (4)柔らかい環境光と縁の光 を足す。
// 形・テクスチャ・色は変えない。?look=plain で従来の見た目。
const LOOK = ['plain', 'felt', 'puffy'].includes(q0.get('look')) ? q0.get('look') : 'puffy';
let _env, _fiber;
function mochitaEnv() { // 小さなソフトボックス群からIBLを作る（目に白い反射が入る）
  if (_env) return _env;
  const s = new THREE.Scene(), bg = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8a7868, side: THREE.BackSide }));
  s.add(bg);
  const panel = (w, h, x, y, z, c, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); s.add(p); };
  panel(4, 3, 2.5, 4, 5, 0xfff4e6, 4); panel(3, 3, -5, 2.5, 3, 0xffe2c4, 2.5); panel(6, 2, 0, 5, -4, 0xffeedd, 5); panel(2, 4, 4.5, 1, -2, 0xe8e0ff, 3);
  _env = new THREE.PMREMGenerator(renderer).fromScene(s, 0.03).texture; return _env;
}
function fiberBump() {
  if (_fiber) return _fiber;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 5200; i++) { const x = r() * 256, y = r() * 256, a = r() * 6.28, l = 3 + r() * 7, v = r() > .5 ? 255 : 0; g.strokeStyle = `rgba(${v},${v},${v},${.10 + r() * .16})`; g.lineWidth = 1 + r() * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  _fiber = new THREE.CanvasTexture(c); _fiber.wrapS = _fiber.wrapT = THREE.RepeatWrapping; _fiber.repeat.set(13, 13); _fiber.anisotropy = 4; return _fiber;
}
function glossFromColor(map) { // 暗い所（目・口・額の模様）だけつやを出す粗さマップ（Gチャンネル）
  const img = map.image, S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, S, S); const d = g.getImageData(0, 0, S, S), p = d.data;
  // 元の明度を、正本色へ置換したあとの明度に直してから判定する（目・鼻=ごく濃い焦げ茶だけがつやつや。体の小さな暗い斑点は光らせない）
  const rl = [[0, .08], [.12, .08], [.357, .12], [.60, .69], [.86, .88], [1, .96]], remap = l => { let k = 0; while (k < rl.length - 2 && l > rl[k + 1][0]) k++; const [a, fa] = rl[k], [b, fb] = rl[k + 1]; return fa + (fb - fa) * Math.min(1, Math.max(0, (l - a) / (b - a))); };
  for (let i = 0; i < p.length; i += 4) { const lum = remap((p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255); const dark = THREE.MathUtils.smoothstep(.40, .20, lum); const rough = .92 - dark * .52; p[i] = 0; p[i + 1] = rough * 255; p[i + 2] = 0; p[i + 3] = 255; }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = map.flipY; t.channel = map.channel; t.wrapS = map.wrapS; t.wrapT = map.wrapT; return t;
}
// ---- 色の正本（参考画像2枚から実測。2026-10-01）----
// 体の毛 #f6e4c8 / 模様 #cdae96 / 目・鼻 #2e1b11（濃い焦げ茶） / 足裏のピンク #e29a96
const CANON = { fur: [246, 228, 200], stripe: [205, 174, 150], ink: [46, 27, 17], inkDeep: [31, 17, 9], white: [255, 242, 222], sole: '#e29a96', feetPink: '#e8a39f', furFlat: '#f7e7cf' };
function canonBaseColor(map) { // 元テクスチャの明度ランプを正本色へ置換（アンチエイリアスの連続性を保つ）
  const img = map.image, S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, S, S); const d = g.getImageData(0, 0, S, S), p = d.data;
  // 毛の部分は明度.74以上を一律に毛の色へ（元テクスチャの細かい汚れ・斑点がほっぺ側面に出るのを消す）。目・鼻・模様は保つ
  const nodes = [[0, CANON.inkDeep], [.12, CANON.inkDeep], [.357, CANON.ink], [.60, CANON.stripe], [.74, CANON.fur], [1, CANON.fur]];
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gg = p[i + 1], b = p[i + 2]; if (b > gg + 8) continue; // ピンク系は触らない
    const lum = (r * .3 + gg * .59 + b * .11) / 255; let k = 0; while (k < nodes.length - 2 && lum > nodes[k + 1][0]) k++;
    const [l0, c0] = nodes[k], [l1, c1] = nodes[k + 1], t = Math.min(1, Math.max(0, (lum - l0) / (l1 - l0)));
    p[i] = c0[0] + (c1[0] - c0[0]) * t; p[i + 1] = c0[1] + (c1[1] - c0[1]) * t; p[i + 2] = c0[2] + (c1[2] - c0[2]) * t;
  }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = map.flipY; t.channel = map.channel; t.wrapS = map.wrapS; t.wrapT = map.wrapT; t.anisotropy = 8; return t;
}
function styleMochita(mt, mesh) {
  if (LOOK === 'puffy') { // ぷっくりシール風: つるっとした面に、やわらかい広いハイライト。毛足の凹凸なし。
    const n = new THREE.MeshPhysicalMaterial({ color: mt.color.clone(), map: mt.map, roughness: .5, metalness: 0 });
    n.clearcoat = .35; n.clearcoatRoughness = .38; n.sheen = .25; n.sheenColor = new THREE.Color(0xfff0d8); n.sheenRoughness = .7;
    n.envMap = mochitaEnv(); n.envMapIntensity = 1.0;
    if (mt.map) { n.roughnessMap = glossFromColor(mt.map); n.roughness = 1; n.map = canonBaseColor(mt.map); }
    else if (mt.name === 'Mochita_Pink_Downward_Soles') n.color.set(CANON.sole);
    else if (mesh && mesh.geometry.attributes.position.count > 1000) n.color.set(CANON.furFlat); // 体に埋まった部品: 毛の色（ピンクがまだらに出ないように）
    else n.color.set(CANON.feetPink); // 足（小さな楕円）はピンク。正本: 参考画像
    n.name = mt.name; return n;
  }
  if (LOOK === 'plain') { mt.roughness = MOCHITA_LOOK.roughness; mt.metalness = 0; mt.envMapIntensity = 0; return mt; }
  const n = new THREE.MeshPhysicalMaterial({ color: mt.color.clone(), map: mt.map, roughness: .92, metalness: 0 });
  n.sheen = .55; n.sheenColor = new THREE.Color(0xf6e2c8); n.sheenRoughness = .6;
  n.bumpMap = fiberBump(); n.bumpScale = 1.1;
  n.envMap = mochitaEnv(); n.envMapIntensity = .85;
  if (mt.map) { n.roughnessMap = glossFromColor(mt.map); n.roughness = 1; }
  n.name = mt.name; return n;
}
async function placeMochita(url, opt = {}) {
  if (url === 'proc') { const root = buildProceduralMochita({ step: opt.step ?? .03 }); finishPlace(root, [], opt); console.log('procedural mochita', root.userData.stats); return { scene: root, animations: [] }; }
  const gltf = await new GLTFLoader().loadAsync(url);
  finishPlace(gltf.scene, gltf.animations, opt); return gltf;
}
function styleRoot(root) { // 影の設定・法線のなめらか化・質感（ぷっくり）
  root.traverse(o => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    if (root.userData.styled) return;
    if (NSMOOTH > 0 && o.geometry.attributes.normal && o.geometry.index && o.geometry.attributes.position.count > 5000) smoothNormals(o.geometry, NSMOOTH, .5, o.material.map ? featureMask(o.geometry, o.material.map) : null);
    if (Array.isArray(o.material)) o.material = o.material.map(mt => styleMochita(mt, o)); else o.material = styleMochita(o.material, o);
  });
}
let walker = null;
async function initWalker(standing, k, offset, h) { // 歩行版を読み込み、タップで歩けるようにする（静止版と同じ位置・大きさ）
  try {
    const gltf = await new GLTFLoader().loadAsync(MOCHITA.walk), wr = gltf.scene;
    wr.scale.setScalar(k); wr.position.copy(offset); styleRoot(wr); wr.visible = false; shop.slot.add(wr);
    const mixer = new THREE.AnimationMixer(wr), clip = gltf.animations.find(a => a.name === MOCHITA.walkClip) ?? gltf.animations[0], action = mixer.clipAction(clip);
    action.timeScale = MOCHITA.playRate; action.play(); action.paused = true;
    walker = new Walker({ slot: shop.slot, standing, walkRoot: wr, mixer, action, rig, h }); window.__walker = walker;
  } catch (e) { console.warn('walk model load failed', e); }
}
function finishPlace(root, animations, opt) {
  const h = opt.height ?? MOCHITA.height, k = h / MOCHITA.rawHeight; root.scale.setScalar(k);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3());
  // x/z は見た目の中心を座布団の中心へ。足裏はミントの敷き物の上面(0.045)にちょうど乗せる（めり込み/浮き防止）
  root.position.set(-c.x, PAD_TOP - box.min.y - .003, -c.z);
  styleRoot(root);
  if (mochitaRoot) shop.slot.remove(mochitaRoot);
  mochitaRoot = root; shop.slot.add(root);
  if (opt.playable) setTimeout(() => initWalker(root, k, root.position.clone(), h), 1200);
  mochitaMixer = null;
  if (animations?.length) {
    mochitaMixer = new THREE.AnimationMixer(root);
    const clip = animations.find(a => a.name === (opt.clip ?? MOCHITA.walkClip)) ?? animations[0];
    const act = mochitaMixer.clipAction(clip); act.timeScale = opt.rate ?? 1; act.play();
    window.__mochita = { root, mixer: mochitaMixer, action: act, clip, speed: walkSpeed(h, act.timeScale) };
  } else window.__mochita = { root };
}
window.placeMochita = placeMochita;
const q = new URLSearchParams(location.search);
// 既定: 静止版を置き場へ。?walk で歩行版（その場再生・確認用）、?model=相対パス で任意GLB、?nomodel で空の座布団
if (!q.has('nomodel')) {
  const sm = q.get('smooth'); // ?smooth=8|24 で平滑化した比較用GLB（元のGLBは無変更）
  const url = q.get('model') || (q.has('walk') ? MOCHITA.walk : sm ? (sm.startsWith('puffy') ? `assets/compare/mochita_standing_${sm}.glb` : `assets/compare/mochita_standing_smooth_${sm}.glb`) : MOCHITA.standing);
  placeMochita(url, { height: parseFloat(q.get('h') || MOCHITA.height), rate: parseFloat(q.get('rate') || '1'), playable: url === MOCHITA.standing && !q.has('noplay') }).catch(e => console.warn('mochita load failed', e));
}

// ?studio: 店を隠して、参考画像(壁紙)と同じ無地の背景でもちただけを見る（色・形の比較用）
if (q.has('studio')) {
  scene.background = new THREE.Color(0xf3e5d0);
  scene.traverse(o => { if (o.isLight && o !== mochitaFill && o !== rim) { o.color.set(0xffffff); if (o.isHemisphereLight) o.groundColor.set(0xf3e6d6); } }); // 色比較用に光を無彩色に
  scene.children.forEach(o => { if (!o.isLight && o !== shop.world && o.type !== 'Object3D') o.visible = false; });
  shop.world.children.forEach(o => { if (o !== shop.slot) o.visible = false; });
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, .02, 40), new THREE.MeshStandardMaterial({ color: 0xf7ead6, roughness: 1 })); fl.position.copy(shop.slot.position).add(new THREE.Vector3(0, -.015, 0)); fl.receiveShadow = true; scene.add(fl);
  shop.slot.children.forEach(o => { if (o.isMesh) o.visible = false; });
}
// ---- カメラ ----
globalThis.__still = q.has('still'); // ?still でカメラの漂いを止める（比較撮影用）
const rig = new CameraRig(renderer.domElement);
let current = q.get('shot') && SHOTS[q.get('shot')] ? q.get('shot') : 'counter';
rig.snap(current);
let prevShot = current;
function setShot(name, instant) {
  if (!SHOTS[name]) return; prevShot = current; current = name; instant ? rig.snap(name) : rig.go(name);
  document.querySelectorAll('#shots [data-shot]').forEach(b => b.classList.toggle('on', b.dataset.shot === name));
}
document.querySelectorAll('#shots [data-shot]').forEach(b => b.addEventListener('click', () => { if (driving) setDriving(false); auto(false); setShot(b.dataset.shot); }));
const order = ['counter', 'overview', 'window', 'closeup'];
let autoOn = false, autoT = 0;
function auto(v, say = true) {
  if (autoOn === v) return; autoOn = v; autoT = 0; const b = document.getElementById('auto'); b.setAttribute('aria-pressed', v);
  if (say) toast(v ? 'おまかせ ON: カメラが自動でめぐるよ' : 'おまかせをとめたよ');
  if (v) { const nxt = order[(order.indexOf(current) + 1) % order.length]; setShot(nxt); } // 押したらすぐ動く
}
document.getElementById('auto').addEventListener('click', () => { if (driving) setDriving(false); auto(!autoOn); });
const toggleUI = () => document.body.classList.toggle('ui-hidden');
document.getElementById('reveal').addEventListener('click', () => { if (document.body.classList.contains('ui-hidden')) toggleUI(); });
addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '4') { auto(false); setShot(order[+e.key - 1]); }
  else if (e.key === 'h' || e.key === 'H') toggleUI();
  else if (e.key === 't' || e.key === 'T') auto(!autoOn);
  else if (e.key === 'p' || e.key === 'P') takePhoto(renderer, scene, rig.camera, toast, flash);
  else if (e.key === 'g' || e.key === 'G') ghost.visible = !ghost.visible;
});
// ---- あそぶ操作: タップ=もちたが歩いてくる／ドラッグ=回す／ピンチ=拡大 ----
const toast = msg => { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1800); };
const flash = () => { const f = document.getElementById('flash'); f.classList.add('go'); setTimeout(() => f.classList.remove('go'), 120); };
const pickables = buildProxies(); // 歩く場所を決めるための当たり判定（簡易な見えない箱）
let tipHidden = false;
function onTap(e) {
  if (driving) return;
  if (!walker) { toast('もちたの準備中…'); return; }
  const sb = new THREE.Box3(new THREE.Vector3(walker.x - .5, walker.y - .02, walker.z - .45), new THREE.Vector3(walker.x + .5, walker.y + MOCHITA.height + .1, walker.z + .45));
  const hit = pickTarget(e, canvas, rig.camera, pickables, sb);
  if (!hit) return;
  if (hit.self) { walker.jump(); return; }
  if (!tipHidden) { tipHidden = true; document.getElementById('tip').classList.add('off'); }
  walker.goTo(hit.x, hit.z, hit.onCounter);
}
attachControls(canvas, rig, { onTap, onCamera: () => { auto(false); document.querySelectorAll('#shots [data-shot]').forEach(b => b.classList.remove('on')); } });
// ---- もちたをうごかすモード: 十字ボタン / 矢印キー・WASD。カメラはあとを追いかける ----
let driving = false; const dirs = new Set();
const modeBtn = document.getElementById('mode');
function setDriving(on) {
  if (on && !walker) { toast('もちたの準備中…'); return; }
  driving = on; document.body.classList.toggle('driving', on); modeBtn.setAttribute('aria-pressed', on);
  if (!walker) return; walker.setManual(on); dirs.clear(); sv.id = null; sv.x = sv.z = 0; if (typeof knob !== 'undefined') { knob.style.transform = ''; stick.classList.remove('active'); stick.style.left = stick.style.top = stick.style.bottom = ''; } pushInput();
  if (on) { auto(false, false); rig.beginFree(); rig.followFn = () => walker.head(); rig.free.goal = { r: 3.6, pitch: .4, yaw: rig.free.yaw }; /* 今のカメラの向きのまま近づく（壁の外に出ない） */ toast('画面の左側を触って動かすと、もちたが歩くよ'); }
  else { rig.followFn = null; walker.setDash(false); btnDash.classList.remove('down'); toast('もとにもどったよ'); }
}
const zone = document.getElementById('stickzone'), stick = document.getElementById('stick'), knob = stick.querySelector('.knob'), sv = { x: 0, z: 0, id: null };
function pushInput() { // スティック優先、なければ矢印キー
  if (!walker) return; walker.input = walker.input ?? { x: 0, z: 0 };
  const kx = (dirs.has('right') ? 1 : 0) - (dirs.has('left') ? 1 : 0), kz = (dirs.has('up') ? 1 : 0) - (dirs.has('down') ? 1 : 0);
  walker.input.x = sv.id !== null ? sv.x : kx; walker.input.z = sv.id !== null ? sv.z : kz;
}
modeBtn.addEventListener('click', () => setDriving(!driving));
// 浮かぶスティック: 左半分を触った所に現れ、つまみを動かした向き・強さで歩く（原神などと同じ作法）
const STICK_R = 46; let sCenter = { x: 0, y: 0 };
function stickMove(e) {
  let dx = e.clientX - sCenter.x, dy = e.clientY - sCenter.y; const l = Math.hypot(dx, dy) || 1, k = Math.min(1, l / STICK_R), ux = dx / l, uy = dy / l;
  knob.style.transform = `translate(${ux * k * STICK_R}px,${uy * k * STICK_R}px)`; sv.x = ux * k; sv.z = -uy * k; pushInput();
}
zone.addEventListener('pointerdown', e => {
  e.preventDefault(); if (sv.id !== null) return; sv.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch {}
  const zr = zone.getBoundingClientRect(), half = 66, x = Math.min(Math.max(e.clientX, zr.left + half + 8), zr.right - half - 8), y = Math.min(Math.max(e.clientY, zr.top + half + 8), zr.bottom - half - 8);
  stick.style.left = (x - zr.left - half) + 'px'; stick.style.bottom = 'auto'; stick.style.top = (y - zr.top - half) + 'px'; sCenter = { x, y };
  stick.classList.add('active'); knob.classList.add('drag'); stickMove(e);
});
zone.addEventListener('pointermove', e => { if (e.pointerId === sv.id) stickMove(e); });
const stickEnd = e => { if (e.pointerId !== sv.id) return; sv.id = null; sv.x = sv.z = 0; stick.classList.remove('active'); knob.classList.remove('drag'); knob.style.transform = ''; stick.style.left = stick.style.top = stick.style.bottom = ''; pushInput(); };
zone.addEventListener('pointerup', stickEnd); zone.addEventListener('pointercancel', stickEnd); zone.addEventListener('lostpointercapture', stickEnd); zone.addEventListener('contextmenu', e => e.preventDefault());
const KEYDIR = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
addEventListener('keydown', e => { const d = KEYDIR[e.key]; if (d && driving) { e.preventDefault(); dirs.add(d); pushInput(); } });
addEventListener('keyup', e => { const d = KEYDIR[e.key]; if (d) { dirs.delete(d); pushInput(); } });
// ジャンプ・ダッシュ（もちたモード）
const btnJump = document.getElementById('btn-jump'), btnDash = document.getElementById('btn-dash');
const hold = (el, on, off) => { const end = e => { if (el._d) { el._d = false; el.classList.remove('down'); off(); } }; el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch {} el._d = true; el.classList.add('down'); on(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, end)); el.addEventListener('contextmenu', e => e.preventDefault()); };
hold(btnJump, () => walker?.jumpNow(), () => {}); hold(btnDash, () => walker?.setDash(true), () => walker?.setDash(false));
addEventListener('keydown', e => { if (!driving) return; if (e.key === ' ') { e.preventDefault(); walker?.jumpNow(); btnJump.classList.add('down'); } else if (e.key === 'Shift') { walker?.setDash(true); btnDash.classList.add('down'); } });
addEventListener('keyup', e => { if (e.key === ' ') btnJump.classList.remove('down'); else if (e.key === 'Shift') { walker?.setDash(false); btnDash.classList.remove('down'); } });
document.getElementById('photo').addEventListener('click', () => takePhoto(renderer, scene, rig.camera, toast, flash));
const panel = document.getElementById('panel'), openPanel = v => { panel.hidden = !v; };
document.getElementById('settings').addEventListener('click', () => openPanel(panel.hidden));
document.getElementById('panel-close').addEventListener('click', () => openPanel(false));
panel.addEventListener('click', e => { if (e.target === panel) openPanel(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') openPanel(false); });
// 歩くはやさ（再生速度。前進速度は walkSpeed() で連動）
const speedBtns = [...document.querySelectorAll('#speed [data-rate]')];
function setSpeed(r, save = true) { speedBtns.forEach(b => b.classList.toggle('on', +b.dataset.rate === r)); MOCHITA.playRate = r; if (walker) walker.setRate(r); if (save) try { localStorage.setItem('mochita-rate', String(r)); } catch {} }
speedBtns.forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.rate)));
try { const r = +localStorage.getItem('mochita-rate'); if ([4, 7, 10].includes(r)) setSpeed(r, false); } catch {}
document.getElementById('eye').addEventListener('click', () => toggleUI());
if (q.has('hideui')) document.body.classList.add('ui-hidden');
if (q.has('ghost')) ghost.visible = true;

// ?frame=16:9 で画面内に指定比率の撮影枠（レターボックス）を作る。PV撮影・確認用。
const frame = (q.get('frame') || '').split(':').map(Number);
function resize() {
  let w = innerWidth, h = innerHeight;
  if (frame.length === 2 && frame[0] > 0 && frame[1] > 0) {
    const r = frame[0] / frame[1]; if (w / h > r) w = Math.round(h * r); else h = Math.round(w / r);
    Object.assign(canvas.style, { position: 'fixed', left: ((innerWidth - w) / 2) + 'px', top: ((innerHeight - h) / 2) + 'px', width: w + 'px', height: h + 'px', inset: 'auto' });
    document.body.style.background = '#1d1620';
  }
  renderer.setSize(w, h, false); rig.setAspect(w / h);
}
addEventListener('resize', resize); resize();

// ---- アニメーション ----
const clock = new THREE.Clock(); let T = 0;
const steamTmp = new THREE.Vector3();
function tick() {
  const dt = Math.min(clock.getDelta(), .1); T += dt;
  for (const o of swayList) { const s = o.userData.sway; const a = Math.sin(T * s.spd + s.ph) * s.amp; o.rotation.z = (o.userData.base?.rz ?? 0) + a; o.rotation.x = Math.cos(T * s.spd * .8 + s.ph) * s.amp * .6; }
  for (const g of steamList) for (const sp of g.children) {
    const u = (T * .22 + sp.userData.ph) % 1, sc = sp.userData.scale;
    sp.position.set(Math.sin(u * 5 + sp.userData.ph * 9) * .03 * sc + sp.userData.drift * u, u * .42 * sc, 0);
    const s = (.06 + u * .2) * sc; sp.scale.set(s, s, 1); sp.material.opacity = Math.sin(Math.PI * Math.min(u * 1.1, 1)) * .42;
  }
  for (const s of anim.twinkle) { const k = .55 + .45 * Math.sin(T * 2.2 + s.userData.ph); s.material.opacity = .25 + .6 * k; s.scale.setScalar(s.userData.s * (.8 + .5 * k)); }
  for (const g of anim.bob) { const b = g.userData.bob; g.position.y = b.y0 + Math.sin(T * b.spd + b.ph) * b.amp; }
  for (const g of anim.fly) {
    const f = g.userData.fly, w = g.userData.wings;
    if (f) { const a = T * f.spd + f.ph; g.position.set(f.cx + Math.cos(a) * f.r, f.cy + Math.sin(a * 2.1) * .35, f.cz + Math.sin(a) * f.r * .75); g.rotation.y = -a + (f.spd > 0 ? 0 : Math.PI); g.rotation.z = Math.sin(a * 2.1) * .12; }
    const fl = f ? 14 : 3, am = f ? .75 : .18, k = Math.sin(T * fl + g.id) * am; w[0].rotation.z = k; w[1].rotation.z = -k;
  }
  for (const m of anim.leaves) { const l = m.userData.leaf; l.y -= l.sp * dt; l.x += Math.sin(T * .6 + l.ph) * .25 * dt; l.z += Math.cos(T * .5 + l.ph) * .15 * dt; if (l.y < .05) { l.y = l.h; l.x = l.bx.x[0] + Math.random() * (l.bx.x[1] - l.bx.x[0]); l.z = l.bx.z[0] + Math.random() * (l.bx.z[1] - l.bx.z[0]); } m.position.set(l.x, l.y, l.z); m.rotation.set(T * l.rs + l.ph, T * l.rs * .7, l.ph); }
  for (const c of clouds) { c.position.x = c.userData.base + Math.sin(T * c.userData.spd) * 3; }
  if (mochitaMixer) mochitaMixer.update(dt);
  if (walker) walker.update(dt, T);
  if (autoOn) { autoT += dt; if (autoT > 6) { autoT = 0; setShot(order[(order.indexOf(current) + 1) % order.length]); } }
  rig.update(dt, T);
  shop.front.visible = current === 'overview' || (rig.k < .6 && prevShot === 'overview');
  renderer.shadowMap.needsUpdate = (frameN++ % (walker?.walking ? 1 : SHADOW_EVERY)) === 0;
  renderer.render(scene, rig.camera);
  perf(dt);
  requestAnimationFrame(tick);
}
const perfState = { n: 0, t: 0, fps: 0 };
function perf(dt) {
  perfState.n++; perfState.t += dt;
  if (perfState.t > 1) { perfState.fps = perfState.n / perfState.t; perfState.n = 0; perfState.t = 0;
    window.__perf = { fps: +perfState.fps.toFixed(1), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, merged: mergedCount }; }
}
window.__shot = async (name) => { renderer.shadowMap.needsUpdate = true; renderer.render(scene, rig.camera); const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', .92)); const res = await fetch('/__save/' + name, { method: 'POST', body: blob }); return res.status; };
window.__scene = scene; window.__renderer = renderer; window.__setShot = setShot; window.__T = () => T;
tick();
