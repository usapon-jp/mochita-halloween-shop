import * as THREE from 'three';

// pos/target は m。drift = ゆっくり漂う撮影用の小さな動き（振幅 xyz, 周期 秒）。
export const SHOTS = {
  counter:  { pos: [.35, 1.85, 4.1],  target: [0, 1.62, -.5],   fov: 35, drift: { a: [.35, .1, .25], p: 14 }, mobileBack: 0, mobileFov: .7 },
  overview: { pos: [13.0, 10.6, 17.4], target: [2.2, 1.0, .6],   fov: 31, drift: { a: [1.4, .5, .9], p: 20 }, mobileBack: .9 },
  window:   { pos: [-1.0, 1.7, 2.6], target: [-4, 1.92, -1.0],   fov: 48, drift: { a: [.3, .06, .25], p: 13 }, mobileBack: .5 },
  face:     { pos: [.25, 1.8, 2.55], target: [0, 1.5, -.45], fov: 26, drift: { a: [.05, .02, .04], p: 12 }, mobileBack: 0 },
  side:     { pos: [3.1, 1.75, -.45], target: [0, 1.5, -.45], fov: 26, drift: { a: [0, 0, 0], p: 12 }, mobileBack: 0 },
  back:     { pos: [0, 1.75, -3.4], target: [0, 1.5, -.45], fov: 26, drift: { a: [0, 0, 0], p: 12 }, mobileBack: 0 },
  three:    { pos: [2.1, 2.0, 1.7], target: [0, 1.5, -.45], fov: 26, drift: { a: [0, 0, 0], p: 12 }, mobileBack: 0 },
  closeup:  { pos: [-.4, 1.75, 2.0], target: [-2.05, 1.28, -.25], fov: 32, drift: { a: [.12, .05, .1], p: 11 }, mobileBack: .4 },
};
const ease = t => t * t * (3 - 2 * t);
const ease2 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class CameraRig {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, .1, 120);
    this.aspect = 16 / 9;
    this.from = null; this.to = null; this.k = 1; this.dur = 2.8;
    this.cur = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 30 };
  }
  setAspect(a) { this.aspect = a; this.camera.aspect = a; }
  state(name) { const s = SHOTS[name]; return { pos: new THREE.Vector3(...s.pos), tgt: new THREE.Vector3(...s.target), fov: s.fov, drift: s.drift }; }
  snap(name) { this.shot = name; this.to = this.state(name); this.from = this.to; this.k = 1; }
  go(name) {
    this.from = { pos: this.cur.pos.clone(), tgt: this.cur.tgt.clone(), fov: this.cur.fov, drift: this.cur.drift };
    this.shot = name; this.to = this.state(name); this.k = 0;
  }
  update(dt, T) {
    if (this.k < 1) this.k = Math.min(1, this.k + dt / this.dur);
    const e = ease2(this.k), f = this.from, t = this.to;
    const pos = f.pos.clone().lerp(t.pos, e), tgt = f.tgt.clone().lerp(t.tgt, e);
    // 遷移中は少し持ち上げて弧を描く
    if (this.k < 1) pos.y += Math.sin(Math.PI * e) * .35;
    let fov = THREE.MathUtils.lerp(f.fov, t.fov, e);
    this.cur.pos.copy(pos); this.cur.tgt.copy(tgt); this.cur.fov = fov; this.cur.drift = t.drift;
    // 縦長画面: 水平の見え幅を保つため引く＋fovを少し広げる
    const asp = this.aspect;
    if (asp < 1.25) {
      const back = 1 + (1.25 - asp) * SHOTS[this.shot].mobileBack;
      const dir = pos.clone().sub(tgt); pos.copy(tgt).addScaledVector(dir, back);
      fov = Math.min(fov * (1 + (1.25 - asp) * (SHOTS[this.shot].mobileFov ?? .1)), 62);
    }
    // 漂い（遷移先のdriftを使う）
    const d = t.drift, w = T * Math.PI * 2 / d.p, amp = globalThis.__still ? 0 : (e < 1 ? ease(e) : 1);
    pos.x += Math.sin(w) * d.a[0] * amp; pos.y += Math.sin(w * 1.3 + 1) * d.a[1] * amp; pos.z += Math.cos(w * .8) * d.a[2] * amp;
    this.camera.position.copy(pos); this.camera.fov = fov; this.camera.lookAt(tgt); this.camera.updateProjectionMatrix();
  }
}
