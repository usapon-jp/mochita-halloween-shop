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
    Object.assign(this, { slot, standing, walkRoot, mixer, action, rig, h });
    this.rate = MOCHITA.playRate; this.speed = walkSpeed(h, this.rate);
    this.x = slot.position.x; this.z = slot.position.z; this.onCounter = true; this.yaw = 0; this.y = surfaceY(this.x, this.z, true);
    this.mode = 'idle'; this.steps = []; this.faceT = 0; this.poke = 0; this.jy = 0; this.jv = 0; this.speedMul = 1;
    const g = new THREE.RingGeometry(.12, .17, 32), m = new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide });
    this.marker = new THREE.Mesh(g, m); this.marker.rotation.x = -Math.PI / 2; this.marker.visible = false; this.marker.renderOrder = 5; slot.parent.add(this.marker);
    this.action.paused = true;
  }
  setRate(r) { this.rate = r; this.action.timeScale = r * this.speedMul; this.speed = walkSpeed(this.h, r); }
  // ジャンプ（その場でぴょん。動きながらでも）／ダッシュ（押している間はやく走る。足の動きも同じ倍率で、すべらない）
  warpTo(x, z, c) { this.steps = []; this.x = x; this.z = z; this.onCounter = c; this.y = surfaceY(x, z, c); this.jv = 3.2; this.jy = .001; } // 場所へワープ（ぴょんと着地）
  jumpNow() { if (this.mode === 'manual' && this.jy === 0 && this.jv === 0) this.jv = 3.5; }
  setDash(on) { this.speedMul = on ? 1.8 : 1; this.action.timeScale = this.rate * this.speedMul; }
  get walking() { return this.mode === 'walk' || (this.mode === 'manual' && this.moving); }
  head() { this._h ??= new THREE.Vector3(); return this._h.set(this.x, this.y + MOCHITA.height * .8, this.z); }
  // ---- 手で動かす（十字ボタン / 矢印キー）。入力 input={x:右+, z:前+} はカメラの向き基準 ----
  setManual(on) {
    this.manual = on; this.input = this.input ?? { x: 0, z: 0 };
    if (on) { this.steps = []; this.marker.visible = false; this.mode = 'manual'; this.moving = false; this.setMoving(false); }
    else { this.input.x = 0; this.input.z = 0; this.mode = 'idle'; this.moving = false; this.setMoving(false); }
  }
  manualUpdate(dt) {
    const inp = this.input, mag = Math.hypot(inp.x, inp.z);
    if (mag < .15) { if (this.moving) { this.moving = false; this.setMoving(false); } return; }
    const v = (this._v ??= new THREE.Vector3()); this.rig.camera.getWorldDirection(v);
    const fl = Math.hypot(v.x, v.z) || 1, fx = v.x / fl, fz = v.z / fl, rx = -fz, rz = fx;
    let dx = fx * inp.z + rx * inp.x, dz = fz * inp.z + rz * inp.x; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const ty = Math.atan2(dx, dz), err = angDiff(this.yaw, ty); this.yaw += Math.sign(err) * Math.min(Math.abs(err), dt * 10);
    if (!this.moving) { this.moving = true; this.setMoving(true); }
    this.mixer.update(dt);
    if (Math.abs(err) > .9) return;
    const s = this.speed * this.speedMul * dt; let nx = this.x + dx * s, nz = this.z + dz * s;
    const insideC = (x, z) => inRect(x, z, COUNTER);
    if (!this.onCounter && insideC(nx, nz) && !insideC(this.x, this.z)) { // 床→カウンター: ジャンプで乗る
      const hx = this.x + dx * .45, hz = this.z + dz * .45; if (insideC(hx, hz)) { this.steps = [{ type: 'hop', x: hx, z: hz, c: true }]; this.mode = 'walk'; return; } return;
    }
    if (this.onCounter && !insideC(nx, nz)) { // カウンター→床: ジャンプで降りる
      const hx = this.x + dx * .5, hz = this.z + dz * .5; if (!blockedAt(hx, hz) && inRect(hx, hz, ISLAND)) { this.steps = [{ type: 'hop', x: hx, z: hz, c: false }]; this.mode = 'walk'; } return;
    }
    if (!this.onCounter) { // 壁・棚・家具は通れない（片方の軸だけ進めて、すべる）
      if (blockedAt(nx, this.z)) nx = this.x; if (blockedAt(this.x, nz)) nz = this.z; if (blockedAt(nx, nz)) { nx = this.x; nz = this.z; }
      nx = THREE.MathUtils.clamp(nx, ISLAND.x0, ISLAND.x1); nz = THREE.MathUtils.clamp(nz, ISLAND.z0, ISLAND.z1);
    }
    this.x = nx; this.z = nz;
  }
  setMoving(on) { this.standing.visible = !on; this.walkRoot.visible = on; this.action.paused = !on; }
  // 目的地(x,z,onCounter)へ。段差があれば、縁まで歩いて「ぴょん」。
  goTo(tx, tz, tOnCounter) {
    const from = { x: this.x, z: this.z, c: this.onCounter }, steps = [];
    const floorLeg = (x0, z0, x1, z1) => floorPath(x0, z0, x1, z1).forEach(s => steps.push({ type: 'walk', x: s.x, z: s.z }));
    const d0 = Math.hypot(tx - from.x, tz - from.z) || 1, u0x = (tx - from.x) / d0, u0z = (tz - from.z) / d0;
    if (from.c === tOnCounter) {
      const ct = !from.c ? clipT(from.x, from.z, tx, tz, COUNTER) : null;
      if (ct && (ct[1] - ct[0]) * d0 > .15) { // 床→床でも、まっすぐ行くとカウンターを突き抜ける場合: ジャンプして乗り越える
        const ex0 = from.x + (tx - from.x) * ct[0], ez0 = from.z + (tz - from.z) * ct[0], ex1 = from.x + (tx - from.x) * ct[1], ez1 = from.z + (tz - from.z) * ct[1];
        floorLeg(from.x, from.z, ex0 - u0x * .32, ez0 - u0z * .32);
        steps.push({ type: 'hop', x: ex0 + u0x * .15, z: ez0 + u0z * .15, c: true }, { type: 'walk', x: ex1 - u0x * .15, z: ez1 - u0z * .15 }, { type: 'hop', x: ex1 + u0x * .32, z: ez1 + u0z * .32, c: false });
        floorLeg(ex1 + u0x * .32, ez1 + u0z * .32, tx, tz);
      } else if (from.c) steps.push({ type: 'walk', x: tx, z: tz });
      else floorLeg(from.x, from.z, tx, tz);
    } else if (from.c) { // カウンター→床: 縁まで歩く→ぴょん→床を歩く
      const ct = clipT(from.x, from.z, tx, tz, COUNTER), t = ct ? ct[1] : 0, ex = from.x + (tx - from.x) * t, ez = from.z + (tz - from.z) * t;
      steps.push({ type: 'walk', x: ex, z: ez }, { type: 'hop', x: ex + u0x * .32, z: ez + u0z * .32, c: false });
      floorLeg(ex + u0x * .32, ez + u0z * .32, tx, tz);
    } else { // 床→カウンター
      const ct = clipT(from.x, from.z, tx, tz, COUNTER), t = ct ? ct[0] : 1, ex = from.x + (tx - from.x) * t, ez = from.z + (tz - from.z) * t;
      floorLeg(from.x, from.z, ex - u0x * .32, ez - u0z * .32);
      steps.push({ type: 'hop', x: ex + u0x * .12, z: ez + u0z * .12, c: true }, { type: 'walk', x: tx, z: tz });
    }
    this.steps = steps; this.mode = 'walk'; this.setMoving(true);
    const last = steps[steps.length - 1]; this.marker.position.set(last.x, surfaceY(last.x, last.z, tOnCounter) + .02, last.z); this.marker.visible = true;
  }
  jump() { if (this.mode === 'idle') this.poke = .0001; }
  update(dt, T) {
    const cam = this.rig.camera.position;
    if (this.mode === 'manual') this.manualUpdate(dt);
    else if (this.mode === 'walk') {
      this.mixer.update(dt);
      const st = this.steps[0];
      if (!st) this.mode = 'face';
      else if (st.type === 'walk') {
        const dx = st.x - this.x, dz = st.z - this.z, dist = Math.hypot(dx, dz);
        if (dist < .02) this.steps.shift();
        else { const ty = Math.atan2(dx, dz), err = angDiff(this.yaw, ty); this.yaw += Math.sign(err) * Math.min(Math.abs(err), dt * 9);
          if (Math.abs(err) < .6) { const s = Math.min(dist, this.speed * dt); this.x += dx / dist * s; this.z += dz / dist * s; } }
      } else { // hop
        if (st.t === undefined) { st.t = 0; st.x0 = this.x; st.z0 = this.z; st.y0 = this.y; st.y1 = surfaceY(st.x, st.z, st.c); st.big = Math.abs(st.y1 - st.y0) > .5; st.dur = st.big ? .75 : .5; }
        st.t = Math.min(1, st.t + dt / st.dur); const e = st.t * st.t * (3 - 2 * st.t);
        this.x = st.x0 + (st.x - st.x0) * e; this.z = st.z0 + (st.z - st.z0) * e; this.y = st.y0 + (st.y1 - st.y0) * e + Math.sin(Math.PI * st.t) * (st.big ? .55 : .3);
        if (st.t >= 1) { this.onCounter = st.c; this.steps.shift(); }
      }
      if (!this.steps.length) { if (this.manual) { this.mode = 'manual'; } else { this.mode = 'face'; this.faceT = 0; this.setMoving(false); this.marker.visible = false; } }
    } else if (this.mode === 'face') { // 止まって、こっち（カメラ）を向く
      this.faceT += dt; const ty = Math.atan2(cam.x - this.x, cam.z - this.z), err = angDiff(this.yaw, ty);
      this.yaw += Math.sign(err) * Math.min(Math.abs(err), dt * 6); if (Math.abs(err) < .02 || this.faceT > 1.2) this.mode = 'idle';
    } else if (this.poke > 0) { this.poke += dt; if (this.poke > .45) this.poke = 0; }
    if (this.marker.visible) { const k = 1 + .15 * Math.sin(T * 8); this.marker.scale.set(k, k, 1); }
    // 高さ（段差は滑らかに／ぴょん中は上で計算済み）
    const hopping = this.mode === 'walk' && this.steps[0]?.type === 'hop';
    if (!hopping) { const ty = surfaceY(this.x, this.z, this.onCounter); this.y += (ty - this.y) * Math.min(1, dt * 14); }
    const bounce = this.poke > 0 ? Math.sin(Math.PI * Math.min(1, this.poke / .45)) * .12 : 0;
    if (this.jy > 0 || this.jv > 0) { this.jv -= 9.8 * dt; this.jy = Math.max(0, this.jy + this.jv * dt); if (this.jy === 0) this.jv = 0; }
    this.slot.position.set(this.x, this.y - PAD_TOP + bounce + this.jy, this.z); this.slot.rotation.y = this.yaw;
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
// 床の上で通れない物。もちたの当たり判定（手で動かすとき・タップで歩くとき）。
// 四角 [x0,x1,z0,z1] と 円 [x,z,半径]。位置は箱庭の座標。
const BLOCK_RECTS = [
  [-4.25, 4.25, -3.4, -2.97], [-4.3, -3.97, -3.3, 3.1], [3.97, 4.3, -3.3, .45],            // 壁（奥・左・右）
  [-3.95, -1.85, -3.0, -2.5], [1.85, 3.95, -3.0, -2.5],                                      // 棚
  [1.45, 2.75, 1.6, 2.2], [-1.0, 1.0, -2.8, -2.0],                                           // 陳列台・カウンター奥の箱
  [3.0, 3.8, -2.45, -1.95],                                                                  // 藁
  [-6.9, -3.5, 5.05, 5.75], [3.5, 6.9, 5.05, 5.75],                                          // 手前の花壇
  [5.6, 6.8, -1.2, 2.2], [7.0, 8.2, -1.6, 1.8], [8.4, 9.6, -1.8, 1.4], [9.8, 11.0, -2.2, 1.0], // かぼちゃ畑
  [-5.1, -.9, 7.0, 7.2], [.5, 6.5, 7.0, 7.2], [7.8, 14.2, 8.1, 8.3], [6.8, 10.8, -5.9, -5.7], // フェンス
  [11.8, 12.6, 1.6, 2.2], [11.2, 12.0, -1.8, -1.4],                                          // 庭の藁
];
const BLOCK_CIRCLES = [
  [-3.5, .8, .5], [-2.5, 1.7, .6], [-3.1, 2.2, .26], [-1.8, 2.3, .26], [-.7, -1.7, .24], [.7, -1.7, .24], [-1.55, -2.25, .27], // 看板・丸テーブル・スツール・樽
  [-3.3, 1.0, .38], [3.4, -.9, .38], [-3.45, -1.2, .3], [3.5, 2.5, .3], [3.15, 2.55, .28], [3.5, 2.15, .28], [-3.7, 2.7, .26], [3.6, 1.0, .26], [1.2, 2.8, .22], [.4, 2.7, .27], // 店内の物
  [-1.9, 6.6, .2], [2.6, 6.6, .2], [6.0, 5.8, .2], [10.5, 1.8, .2],                         // 街灯
  [8.2, 4.2, 1.1], [9.2, 4.2, 1.15], [10.2, 4.2, 1.1], [9.2, 3.6, 1.0], [9.2, 4.8, 1.0],      // 池
  [7.4, 2.2, .62], [6.5, 2.5, .24], [8.3, 2.0, .24], [7.6, 3.2, .24],                          // パラソルテーブル・スツール
  [3.5, 4.2, .62], [11.8, .3, .32], [3.3, 6.8, .38], [5.9, 7.4, .32],                          // ベンチ・かかし・釜
  [-6.2, 1.6, .25], [-5.5, 1.0, .25], [-6.5, 2.7, .25], [-5.7, 2.3, .25],                      // 墓石
  [-.2, 4.2, .5], [2.4, 4.1, .46], [10.4, -2.9, .5], [-3.0, -1.2, .0],                         // かぼちゃの山
  [-6.4, -3.8, .42], [6.2, -3.6, .46], [-3.2, -5.0, .38], [1.0, -5.0, .42], [4.8, -4.9, .38], [12.2, -2.6, .46], [8.8, -4.4, .46], [11.6, 3.0, .4], [6.4, -4.8, .38], [-7.0, 3.4, .4], [-6.0, 6.2, .4], [-7.4, .6, .4], [13.0, 7.2, .4], [3.4, -5.6, .36], [-5.2, -4.7, .34], // 木の幹
];
const BODY_R = .28;
const blockedAt = (x, z, r = BODY_R) => BLOCK_RECTS.some(([x0, x1, z0, z1]) => x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) || BLOCK_CIRCLES.some(([cx, cz, cr]) => cr > 0 && Math.hypot(x - cx, z - cz) < cr + r);
// ---- 経路探索（障害物をよけて歩く）: 0.25m格子のA*＋直線化 ----
const GR = { s: .25, x0: ISLAND.x0, z0: ISLAND.z0 }; GR.nx = Math.ceil((ISLAND.x1 - ISLAND.x0) / GR.s) + 1; GR.nz = Math.ceil((ISLAND.z1 - ISLAND.z0) / GR.s) + 1;
let _grid = null;
const gridBlocked = () => (_grid ??= (() => { const g = new Uint8Array(GR.nx * GR.nz); for (let k = 0; k < GR.nz; k++) for (let i = 0; i < GR.nx; i++) { const x = GR.x0 + i * GR.s, z = GR.z0 + k * GR.s; g[i + k * GR.nx] = (blockedAt(x, z) || inRect(x, z, COUNTER, .0)) ? 1 : 0; } return g; })());
const lineClear = (x0, z0, x1, z1) => { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / .1)); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (blockedAt(x, z) || inRect(x, z, COUNTER, 0)) return false; } return true; };
function nearestFree(x, z) { const g = gridBlocked(); const ci = Math.round((x - GR.x0) / GR.s), ck = Math.round((z - GR.z0) / GR.s); for (let r = 0; r < 14; r++) { let best = null, bd = 1e9; for (let k = ck - r; k <= ck + r; k++) for (let i = ci - r; i <= ci + r; i++) { if (i < 0 || k < 0 || i >= GR.nx || k >= GR.nz || g[i + k * GR.nx]) continue; const d = Math.hypot(i - ci, k - ck); if (d < bd) { bd = d; best = [i, k]; } } if (best) return [GR.x0 + best[0] * GR.s, GR.z0 + best[1] * GR.s]; } return [x, z]; }
export function floorPath(x0, z0, x1, z1) { // 床/庭の上の道順（障害物をよける）。[{x,z}...] 最後が目的地
  if (lineClear(x0, z0, x1, z1)) return [{ x: x1, z: z1 }];
  const g = gridBlocked(), idx = (i, k) => i + k * GR.nx, si = Math.round((x0 - GR.x0) / GR.s), sk = Math.round((z0 - GR.z0) / GR.s);
  const [fx, fz] = nearestFree(x1, z1), ti = Math.round((fx - GR.x0) / GR.s), tk = Math.round((fz - GR.z0) / GR.s);
  const open = [[0, si, sk]], came = new Map(), cost = new Map([[idx(si, sk), 0]]), closed = new Set();
  const h = (i, k) => { const dx = Math.abs(i - ti), dk = Math.abs(k - tk); return (dx + dk) + (Math.SQRT2 - 2) * Math.min(dx, dk); };
  let found = false, bestId = idx(si, sk), bestH = h(si, sk);
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]); const [, ci, ck] = open.shift(), id = idx(ci, ck); if (closed.has(id)) continue; closed.add(id);
    { const hh = h(ci, ck); if (hh < bestH) { bestH = hh; bestId = id; } }
    if (ci === ti && ck === tk) { found = true; break; }
    for (let dk = -1; dk <= 1; dk++) for (let di = -1; di <= 1; di++) {
      if (!di && !dk) continue; const ni = ci + di, nk = ck + dk; if (ni < 0 || nk < 0 || ni >= GR.nx || nk >= GR.nz) continue;
      const nid = idx(ni, nk); if (g[nid] && !(ni === si && nk === sk)) continue; if (di && dk && (g[idx(ci + di, ck)] || g[idx(ci, ck + dk)])) continue; // 斜めは角をかすめない
      const nc = cost.get(id) + (di && dk ? Math.SQRT2 : 1); if (nc < (cost.get(nid) ?? 1e9)) { cost.set(nid, nc); came.set(nid, id); open.push([nc + h(ni, nk), ni, nk]); }
    }
  }
  // たどり着けないとき（壁や物に囲まれた所）は、行ける一番近い所まで
  const cells = []; let id = found ? idx(ti, tk) : bestId; while (id !== undefined) { cells.push([GR.x0 + (id % GR.nx) * GR.s, GR.z0 + Math.floor(id / GR.nx) * GR.s]); id = came.get(id); } cells.reverse();
  const pts = found ? [[x0, z0], ...cells, [fx, fz]] : [[x0, z0], ...cells]; const out = []; let a = 0; // 見通せる所まで直線にまとめる
  while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !lineClear(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--; out.push({ x: pts[b][0], z: pts[b][1] }); a = b; }
  return out;
}
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
