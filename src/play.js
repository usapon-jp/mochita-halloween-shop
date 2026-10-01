// タップした所へもちたが歩いてくる／自分でカメラを動かす／写真をとる。
import * as THREE from 'three';
import { MOCHITA, walkSpeed } from './config.js';

// 歩ける場所（元の箱庭の座標）。段差(カウンター↔床)は「ぴょん」と跳ぶ。
export const COUNTER = { x0: -2.95, x1: 2.95, z0: -1.15, z1: .15, y: 1.0 };
const CUSHION = { x: 0, z: -.45, r: .5, lift: .045 }, SHOP = { x0: -4, x1: 4, z0: -3, z1: 3 }, ISLAND = { x0: -7.4, x1: 13.4, z0: -5.7, z1: 8.5 };
export const PAD_TOP = .045;
export function surfaceY(x, z, onCounter) {
  if (onCounter) return COUNTER.y + (Math.hypot(x - CUSHION.x, z - CUSHION.z) < CUSHION.r ? CUSHION.lift : 0);
  if (x > SHOP.x0 && x < SHOP.x1 && z > SHOP.z0 && z < SHOP.z1 + .35) { const t = z > SHOP.z1 ? Math.min(1, (z - SHOP.z1) / .35) : 0; return .1 * (1 - t) - .01 * t; }
  return -.01;
}
const inRect = (x, z, r, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
// 線分(a→b)が矩形に入る/出るt（Liang–Barsky）
function clipT(ax, az, bx, bz, r) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dz, az - r.z0], [dz, r.z1 - az]]) {
    if (p === 0) { if (q < 0) return null; } else { const t = q / p; if (p < 0) { if (t > t1) return null; t0 = Math.max(t0, t); } else { if (t < t0) return null; t1 = Math.min(t1, t); } }
  }
  return [t0, t1];
}

export class Walker {
  constructor({ slot, standing, walkRoot, mixer, action, rig, h }) {
    Object.assign(this, { slot, standing, walkRoot, mixer, action, rig });
    this.rate = MOCHITA.playRate; this.speed = walkSpeed(h, this.rate);
    this.x = slot.position.x; this.z = slot.position.z; this.onCounter = true; this.yaw = 0; this.y = surfaceY(this.x, this.z, true);
    this.mode = 'idle'; this.steps = []; this.faceT = 0; this.poke = 0;
    const g = new THREE.RingGeometry(.12, .17, 32), m = new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide });
    this.marker = new THREE.Mesh(g, m); this.marker.rotation.x = -Math.PI / 2; this.marker.visible = false; this.marker.renderOrder = 5; slot.parent.add(this.marker);
    this.action.paused = true;
  }
  get walking() { return this.mode === 'walk'; }
  setMoving(on) { this.standing.visible = !on; this.walkRoot.visible = on; this.action.paused = !on; }
  // 目的地(x,z,onCounter)へ。段差があれば、縁まで歩いて「ぴょん」。
  goTo(tx, tz, tOnCounter) {
    const from = { x: this.x, z: this.z, c: this.onCounter }, steps = [];
    if (from.c === tOnCounter) steps.push({ type: 'walk', x: tx, z: tz });
    else if (from.c) { // カウンター→床: 縁まで歩く→ぴょん→床を歩く
      const ct = clipT(from.x, from.z, tx, tz, COUNTER), t = ct ? ct[1] : 0, ex = from.x + (tx - from.x) * t, ez = from.z + (tz - from.z) * t, d = Math.hypot(tx - from.x, tz - from.z) || 1, ux = (tx - from.x) / d, uz = (tz - from.z) / d;
      steps.push({ type: 'walk', x: ex, z: ez }, { type: 'hop', x: ex + ux * .3, z: ez + uz * .3, c: false }, { type: 'walk', x: tx, z: tz });
    } else { // 床→カウンター
      const ct = clipT(from.x, from.z, tx, tz, COUNTER), t = ct ? ct[0] : 1, ex = from.x + (tx - from.x) * t, ez = from.z + (tz - from.z) * t, d = Math.hypot(tx - from.x, tz - from.z) || 1, ux = (tx - from.x) / d, uz = (tz - from.z) / d;
      steps.push({ type: 'walk', x: ex - ux * .3, z: ez - uz * .3 }, { type: 'hop', x: ex + ux * .12, z: ez + uz * .12, c: true }, { type: 'walk', x: tx, z: tz });
    }
    this.steps = steps; this.mode = 'walk'; this.setMoving(true);
    this.marker.position.set(tx, surfaceY(tx, tz, tOnCounter) + .02, tz); this.marker.visible = true; this.markerLevel = tOnCounter;
  }
  jump() { if (this.mode === 'idle') this.poke = .0001; }
  update(dt, T) {
    const cam = this.rig.camera.position;
    if (this.mode === 'walk') {
      this.mixer.update(dt);
      const st = this.steps[0];
      if (!st) this.mode = 'face';
      else if (st.type === 'walk') {
        const dx = st.x - this.x, dz = st.z - this.z, dist = Math.hypot(dx, dz);
        if (dist < .02) this.steps.shift();
        else { const ty = Math.atan2(dx, dz), err = angDiff(this.yaw, ty); this.yaw += Math.sign(err) * Math.min(Math.abs(err), dt * 9);
          if (Math.abs(err) < .6) { const s = Math.min(dist, this.speed * dt); this.x += dx / dist * s; this.z += dz / dist * s; } }
      } else { // hop
        if (st.t === undefined) { st.t = 0; st.x0 = this.x; st.z0 = this.z; st.y0 = this.y; st.y1 = surfaceY(st.x, st.z, st.c); st.dur = .5; }
        st.t = Math.min(1, st.t + dt / st.dur); const e = st.t * st.t * (3 - 2 * st.t);
        this.x = st.x0 + (st.x - st.x0) * e; this.z = st.z0 + (st.z - st.z0) * e; this.y = st.y0 + (st.y1 - st.y0) * e + Math.sin(Math.PI * st.t) * .3;
        if (st.t >= 1) { this.onCounter = st.c; this.steps.shift(); }
      }
      if (!this.steps.length) { this.mode = 'face'; this.faceT = 0; this.setMoving(false); this.marker.visible = false; }
    } else if (this.mode === 'face') { // 止まって、こっち（カメラ）を向く
      this.faceT += dt; const ty = Math.atan2(cam.x - this.x, cam.z - this.z), err = angDiff(this.yaw, ty);
      this.yaw += Math.sign(err) * Math.min(Math.abs(err), dt * 6); if (Math.abs(err) < .02 || this.faceT > 1.2) this.mode = 'idle';
    } else if (this.poke > 0) { this.poke += dt; if (this.poke > .45) this.poke = 0; }
    if (this.marker.visible) { const k = 1 + .15 * Math.sin(T * 8); this.marker.scale.set(k, k, 1); }
    // 高さ（段差は滑らかに／ぴょん中は上で計算済み）
    const hopping = this.mode === 'walk' && this.steps[0]?.type === 'hop';
    if (!hopping) { const ty = surfaceY(this.x, this.z, this.onCounter); this.y += (ty - this.y) * Math.min(1, dt * 14); }
    const bounce = this.poke > 0 ? Math.sin(Math.PI * Math.min(1, this.poke / .45)) * .12 : 0;
    this.slot.position.set(this.x, this.y - PAD_TOP + bounce, this.z); this.slot.rotation.y = this.yaw;
  }
}

// タップ判定用の簡易な形（見えない箱）。床・カウンター・壁・棚・家具など。形全体に当てると重いので、これだけに当てる。
const PROXIES = [ // [x0,x1,y0,y1,z0,z1]
  [-2.95, 2.95, .94, 1.0, -1.15, .15],        // カウンター天板
  [-2.9, 2.9, 0, .94, -1.1, .1],              // カウンター本体（側面で止まる）
  [-4, 4, 0, .1, -3, 3.35],                   // 店の床
  [-7.5, 13.5, -.4, -.01, -5.8, 8.6],         // 庭
  [-4.2, 4.2, 0, 4.2, -3.3, -3.0],            // 奥の壁
  [-4.25, -4.0, 0, 4.2, -3.25, 3],            // 左の壁
  [4.0, 4.25, 0, 4.2, -3.25, .4],             // 右の壁
  [-3.95, -1.85, 0, 3.1, -3.0, -2.55],        // 左の棚
  [1.85, 3.95, 0, 3.1, -3.0, -2.55],          // 右の棚
  [-3.0, -2.0, 0, .8, 1.2, 2.2],              // 丸テーブル
  [1.45, 2.75, 0, .6, 1.6, 2.2],              // 陳列台
  [-1.0, 1.0, 0, .6, -2.8, -2.0],             // カウンター奥の箱・かご
];
export function buildProxies() {
  const mat = new THREE.MeshBasicMaterial(), out = [];
  for (const [x0, x1, y0, y1, z0, z1] of PROXIES) { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.visible = false; m.updateMatrixWorld(true); out.push(m); }
  return out;
}

// 画面タップ→歩く場所。実際の形に当てて、上向きの面ならそこへ。壁や小物の横なら手前で止まる。
export function pickTarget(ev, canvas, camera, pickables, selfBox) {
  const r = canvas.getBoundingClientRect(), ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables, false);
  if (selfBox) { const q = new THREE.Vector3(); if (ray.ray.intersectBox(selfBox, q) && (!hits.length || q.distanceTo(ray.ray.origin) < hits[0].distance)) return { self: true }; } // もちた自身（箱で判定: 軽い）
  if (!hits.length) return null;
  const h = hits[0], p = h.point; let x = p.x, z = p.z;
  const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
  if (n.y < .6) { const l = Math.hypot(n.x, n.z) || 1; x += n.x / l * .45; z += n.z / l * .45; }   // 壁・小物の側面: 手前で止まる
  const onCounter = p.y > .85 && inRect(p.x, p.z, COUNTER, .02);
  if (onCounter) { x = THREE.MathUtils.clamp(x, COUNTER.x0 + .25, COUNTER.x1 - .25); z = THREE.MathUtils.clamp(z, COUNTER.z0 + .25, COUNTER.z1 - .25); }
  else { x = THREE.MathUtils.clamp(x, ISLAND.x0, ISLAND.x1); z = THREE.MathUtils.clamp(z, ISLAND.z0, ISLAND.z1); }
  return { x, z, onCounter };
}

// ドラッグ=回す / ピンチ・ホイール=拡大 / 2本指・右ドラッグ・Shift=平行移動 / タップ=onTap
export function attachControls(canvas, rig, { onTap, onCamera }) {
  const ptrs = new Map(); let moved = false, t0 = 0, sx = 0, sy = 0, lastDist = 0, lastMid = null;
  const mid = () => { const a = [...ptrs.values()]; return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; };
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button });
    if (ptrs.size === 1) { moved = false; t0 = performance.now(); sx = e.clientX; sy = e.clientY; } else { moved = true; const m = mid(); lastDist = m.d; lastMid = m; }
  });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) {
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) moved = true;
      if (moved) { rig.beginFree(); if (p.btn === 2 || e.shiftKey) rig.pan(dx, dy); else rig.orbit(dx, dy); onCamera?.(); }
    } else if (ptrs.size === 2) { const m = mid(); rig.beginFree(); if (lastDist > 0) rig.zoom(lastDist / m.d); rig.pan(m.x - lastMid.x, m.y - lastMid.y); lastDist = m.d; lastMid = m; onCamera?.(); }
  });
  const up = e => { const was = ptrs.size; ptrs.delete(e.pointerId); if (was === 1 && !moved && performance.now() - t0 < 450) onTap(e); if (ptrs.size === 1) { moved = true; } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); });
  canvas.addEventListener('wheel', e => { e.preventDefault(); rig.beginFree(); rig.zoom(Math.exp(e.deltaY * .0012)); onCamera?.(); }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

// 写真: いまの画面を画像にして、スマホは共有シート、PCは保存。隅に小さくクレジットを入れる（CC BY 4.0）。
export async function takePhoto(renderer, scene, camera, toast, flash) {
  renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
  const src = renderer.domElement, out = document.createElement('canvas'); out.width = src.width; out.height = src.height;
  const g = out.getContext('2d'); g.drawImage(src, 0, 0);
  const fs = Math.max(12, Math.round(out.width * .016)); g.font = `600 ${fs}px "Hiragino Maru Gothic ProN","Hiragino Sans",sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom';
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = fs * .3; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('もちた ／ 3D: Meshy (CC BY 4.0)', out.width - fs, out.height - fs * .8);
  flash?.();
  const blob = await new Promise(r => out.toBlob(r, 'image/png')); if (!blob) { toast?.('写真をつくれませんでした'); return; }
  const d = new Date(), pad = n => String(n).padStart(2, '0'), name = `mochita-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'もちた' }); toast?.('写真をとりました'); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast?.('写真を保存しました');
}
