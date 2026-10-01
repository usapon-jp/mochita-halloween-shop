import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { texSky, texCloud, texBlob, HALLOWEEN } from './kit.js';
import { buildShop, SLOT } from './shop.js';
import { anim } from './props.js';
import { SHOTS, CameraRig } from './cameras.js';

const canvas = document.getElementById('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: new URLSearchParams(location.search).has('capture') });
} catch (e) { document.getElementById('fallback').hidden = false; throw e; }
const isSmall = Math.min(innerWidth, innerHeight) < 700;
const dprCap = isSmall ? 1.75 : 2;
renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
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

// ---- もちた差し替え口 ----
// 後から GLB を置くだけ: ?model=assets/mochita.glb  または  window.placeMochita(url, {height})
let mochitaMixer = null, mochitaRoot = null;
const ghost = (() => { // 撮影構図確認用の仮ボリューム（Gキー）。モデルではない
  const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xff7aa0, transparent: true, opacity: .28, depthWrite: false });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), m); b.scale.set(1, .85, .9); b.position.y = .45; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), m); h.scale.set(1, .85, .9); h.position.y = .95; g.add(h);
  g.visible = false; shop.slot.add(g); return g;
})();
async function placeMochita(url, opt = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene, box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const k = (opt.height ?? 1.0) / size.y; root.scale.setScalar(k);
  box.setFromObject(root); const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y + .03, -c.z);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  if (mochitaRoot) shop.slot.remove(mochitaRoot);
  mochitaRoot = root; shop.slot.add(root);
  if (gltf.animations?.length) { mochitaMixer = new THREE.AnimationMixer(root); const clip = gltf.animations.find(a => /idle|stand|wait/i.test(a.name)) ?? gltf.animations[0]; mochitaMixer.clipAction(clip).play(); }
  return gltf;
}
window.placeMochita = placeMochita;
const q = new URLSearchParams(location.search);
if (q.get('model')) placeMochita(q.get('model'), { height: parseFloat(q.get('h') || '1') }).catch(e => console.warn('model load failed', e));

// ---- カメラ ----
const rig = new CameraRig(renderer.domElement);
let current = q.get('shot') && SHOTS[q.get('shot')] ? q.get('shot') : 'counter';
rig.snap(current);
let prevShot = current;
function setShot(name, instant) {
  if (!SHOTS[name]) return; prevShot = current; current = name; instant ? rig.snap(name) : rig.go(name);
  document.querySelectorAll('#shots [data-shot]').forEach(b => b.classList.toggle('on', b.dataset.shot === name));
}
document.querySelectorAll('#shots [data-shot]').forEach(b => b.addEventListener('click', () => { auto(false); setShot(b.dataset.shot); }));
const order = ['counter', 'overview', 'window', 'closeup'];
let autoOn = false, autoT = 0;
function auto(v) { autoOn = v; autoT = 0; const b = document.getElementById('auto'); b.setAttribute('aria-pressed', v); }
document.getElementById('auto').addEventListener('click', () => auto(!autoOn));
const toggleUI = () => document.body.classList.toggle('ui-hidden');
document.getElementById('reveal').addEventListener('click', () => { if (document.body.classList.contains('ui-hidden')) toggleUI(); });
addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '4') { auto(false); setShot(order[+e.key - 1]); }
  else if (e.key === 'h' || e.key === 'H') toggleUI();
  else if (e.key === 't' || e.key === 'T') auto(!autoOn);
  else if (e.key === 'g' || e.key === 'G') ghost.visible = !ghost.visible;
});
let lastTap = 0;
canvas.addEventListener('pointerup', () => { const n = performance.now(); if (n - lastTap < 320) toggleUI(); lastTap = n; });
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
  if (autoOn) { autoT += dt; if (autoT > 7.5) { autoT = 0; setShot(order[(order.indexOf(current) + 1) % order.length]); } }
  rig.update(dt, T);
  shop.front.visible = current === 'overview' || (rig.k < .6 && prevShot === 'overview');
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
window.__scene = scene; window.__renderer = renderer; window.__setShot = setShot; window.__T = () => T;
tick();
