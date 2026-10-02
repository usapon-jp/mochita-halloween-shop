// お菓子さがし: かくれたプレゼントボックスをあけるとお菓子が出てくる → 好きな場所に置くと、そこがワープ地点になる。
// 保存はこのブラウザの localStorage だけ（サーバーなし・データはごく小さい）。
import * as THREE from 'three';
import { COUNTER, CUSHION, ISLAND, surfaceY, blockedAt, inRect } from './play.js';

const LS = 'mochita-sweets-v1';
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .65, ...o });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };

// ---- お菓子（手づくりの小さな形。すべて高さ約0.3m）----
function muffin() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.13, .095, .13, 18), M(0xe9c58f), 0, .065, 0));
  g.add(mesh(new THREE.CylinderGeometry(.135, .135, .02, 18), M(0xc48a4a), 0, .135, 0));
  const top = mesh(new THREE.SphereGeometry(.17, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf58a2c), 0, .13, 0); top.scale.set(1, .8, 1); g.add(top);
  g.add(mesh(new THREE.CylinderGeometry(.015, .022, .06, 8), M(0x4d8a3a), 0, .285, 0));
  return g;
}
function macaron() {
  const g = new THREE.Group(), s = M(0xb79bea);
  for (const y of [.055, .165]) { const d = mesh(new THREE.SphereGeometry(.17, 20, 12), s, 0, y, 0); d.scale.set(1, .38, 1); g.add(d); }
  g.add(mesh(new THREE.CylinderGeometry(.15, .15, .05, 20), M(0xfff1f6), 0, .11, 0));
  return g;
}
function ghost() {
  const g = new THREE.Group(), w = M(0xfffdf6, { roughness: .9 });
  g.add(mesh(new THREE.SphereGeometry(.16, 20, 16), w, 0, .2, 0));
  g.add(mesh(new THREE.CylinderGeometry(.16, .185, .2, 20), w, 0, .1, 0));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(.045, 10, 8), w, Math.cos(a) * .15, .02, Math.sin(a) * .15)); }
  const e = M(0x3a2848); for (const sx of [-.055, .055]) g.add(mesh(new THREE.SphereGeometry(.026, 10, 8), e, sx, .22, .15));
  return g;
}
function candy() {
  const g = new THREE.Group(), p = M(0xff8fb8);
  g.add(mesh(new THREE.SphereGeometry(.13, 20, 14), p, 0, .15, 0));
  const st = M(0xffffff); for (let i = 0; i < 3; i++) { const t = mesh(new THREE.TorusGeometry(.13, .018, 6, 24), st, 0, .15, 0); t.rotation.set(Math.PI / 2 + i * .5, i * .8, 0); g.add(t); }
  const w = M(0xffb35a, { side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const c = mesh(new THREE.ConeGeometry(.09, .15, 12), w, s * .22, .15, 0); c.rotation.z = -s * Math.PI / 2; g.add(c); }
  return g;
}
function bat() {
  const g = new THREE.Group(), d = M(0x57397a);
  const b = mesh(new THREE.SphereGeometry(.1, 16, 12), d, 0, .17, 0); b.scale.set(1, 1.1, .6); g.add(b);
  const shp = new THREE.Shape(); shp.moveTo(0, .06); shp.quadraticCurveTo(.12, .12, .24, .02); shp.lineTo(.2, -.01); shp.lineTo(.15, .03); shp.lineTo(.1, -.03); shp.lineTo(.05, .02); shp.lineTo(0, -.06); shp.closePath();
  for (const s of [-1, 1]) { const w = mesh(new THREE.ShapeGeometry(shp), M(0x57397a, { side: THREE.DoubleSide }), 0, .18, 0); w.scale.x = s; w.rotation.y = s * .25; g.add(w); }
  for (const sx of [-1, 1]) { g.add(mesh(new THREE.ConeGeometry(.025, .06, 6), d, sx * .05, .27, 0)); g.add(mesh(new THREE.SphereGeometry(.018, 8, 6), M(0xffd24a, { emissive: 0xffa800, emissiveIntensity: .5 }), sx * .04, .19, .055)); }
  return g;
}
function pudding() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.11, .15, .16, 20), M(0xffd466), 0, .08, 0));
  const t = mesh(new THREE.SphereGeometry(.113, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9b5a2c), 0, .16, 0); t.scale.set(1, .55, 1); g.add(t);
  g.add(mesh(new THREE.SphereGeometry(.04, 12, 10), M(0xe0334a), 0, .225, 0));
  g.add(mesh(new THREE.CylinderGeometry(.006, .006, .06, 6), M(0x4d8a3a), .015, .27, 0));
  return g;
}
// ボックスの位置は箱庭の座標（x, z）。お庭4・お店の中1・庭の端1
export const SWEETS = [
  { id: 'muffin', name: 'かぼちゃマフィン', build: muffin, box: [12.9, -.6], icon: '<circle cx="24" cy="30" r="10" fill="#f58a2c"/><path d="M15 30h18l-3 11H18z" fill="#e9c58f"/><path d="M24 20v-5" />' },
  { id: 'macaron', name: 'むらさきマカロン', build: macaron, box: [-5.6, -3.2], icon: '<ellipse cx="24" cy="17" rx="13" ry="6" fill="#b79bea"/><rect x="11" y="21" width="26" height="5" rx="2.5" fill="#fff1f6"/><ellipse cx="24" cy="31" rx="13" ry="6" fill="#b79bea"/>' },
  { id: 'ghost', name: 'おばけマシュマロ', build: ghost, box: [-6.4, .3], icon: '<path d="M11 40V22c0-8 5-13 13-13s13 5 13 13v18l-4.3-3.6-4.3 3.6-4.4-3.6-4.3 3.6-4.3-3.6z" fill="#fffdf6"/><circle cx="19" cy="24" r="2" fill="#3a2848"/><circle cx="29" cy="24" r="2" fill="#3a2848"/>' },
  { id: 'candy', name: 'ぐるぐるキャンディ', build: candy, box: [5.2, -3.8], icon: '<path d="M4 24l9-6v12zM44 24l-9-6v12z" fill="#ffb35a"/><circle cx="24" cy="24" r="10" fill="#ff8fb8"/><path d="M17 21c4-4 10-3 13 1" />' },
  { id: 'bat', name: 'コウモリクッキー', build: bat, box: [-3.5, -1.9], icon: '<path d="M24 14c-3 4-5 3-9 0-5 2-9 6-10 12 3-1 6-1 8 2 2-3 5-3 7-1 1 2 3 3 4 3s3-1 4-3c2-2 5-2 7 1 2-3 5-3 8-2-1-6-5-10-10-12-4 3-6 4-9 0z" fill="#8a63b8"/><circle cx="21" cy="22" r="1.6" fill="#ffd24a"/><circle cx="27" cy="22" r="1.6" fill="#ffd24a"/>' },
  { id: 'pudding', name: 'ハロウィンプリン', build: pudding, box: [12.5, 5.2], icon: '<path d="M12 22h24l-3 17H15z" fill="#ffd466"/><path d="M12 22c2-6 22-6 24 0z" fill="#9b5a2c"/><circle cx="24" cy="13" r="3.2" fill="#e0334a"/>' },
];
const sweetIcon = id => `<svg class="ic" viewBox="0 0 48 48" aria-hidden="true"><g class="k">${SWEETS.find(s => s.id === id).icon}</g></svg>`;

// ---- プレゼントボックス ----
function boxTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f4963a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#6b3f8f'; for (const [x, y] of [[24, 24], [88, 24], [56, 64], [24, 104], [88, 104], [120, 64], [-8, 64]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  g.fillStyle = '#ffd978'; for (const [x, y] of [[56, 20], [8, 64], [56, 108], [104, 64]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.5 : 8, a = i / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function giftBox(tex) {
  const g = new THREE.Group(), body = M(0xffffff, { map: tex }), rb = M(0xffd24a, { roughness: .5 }), lidM = M(0x7a4aa0, { transparent: true });
  g.add(mesh(new THREE.BoxGeometry(.5, .36, .5), body, 0, .18, 0));
  g.add(mesh(new THREE.BoxGeometry(.08, .361, .502), rb, 0, .18, 0)); g.add(mesh(new THREE.BoxGeometry(.502, .361, .08), rb, 0, .18, 0));
  const lid = new THREE.Group(); lid.position.y = .36; g.add(lid);
  lid.add(mesh(new THREE.BoxGeometry(.56, .1, .56), lidM, 0, .05, 0));
  lid.add(mesh(new THREE.BoxGeometry(.08, .102, .562), rb, 0, .05, 0)); lid.add(mesh(new THREE.BoxGeometry(.562, .102, .08), rb, 0, .05, 0));
  for (const s of [-1, 1]) { const b = mesh(new THREE.SphereGeometry(.09, 12, 10), rb, s * .09, .15, 0); b.scale.set(1, .7, .6); lid.add(b); }
  lid.add(mesh(new THREE.SphereGeometry(.045, 10, 8), rb, 0, .14, 0));
  g.userData.lid = lid; g.userData.lidMat = lidM; return g;
}

const ease = t => t * t * (3 - 2 * t);
export class SweetHunt {
  // ctx: { parent, canvas, camera(), walker(), toast(msg), driving(), closeCard() }
  constructor(ctx) {
    this.ctx = ctx; this.group = new THREE.Group(); ctx.parent.add(this.group);
    this.state = this.load(); this.boxes = []; this.fx = []; this.placed = {}; this.T = 0;
    this.tex = boxTex();
    for (const s of SWEETS) {
      if (!this.state.opened.includes(s.id)) { const b = giftBox(this.tex), [x, z] = s.box, y = surfaceY(x, z, false); b.position.set(x, y, z); b.rotation.y = (s.box[0] * 1.7) % 6; this.group.add(b); this.boxes.push({ s, b, y, ph: Math.random() * 6, t: -1 }); }
      const sp = this.state.spots[s.id]; if (sp) this.showPlaced(s, sp);
    }
    this.marker = new THREE.Group(); this.marker.visible = false; this.marker.renderOrder = 8;
    const mk = (g, o) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ transparent: true, opacity: o, depthTest: false, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = 8; this.marker.add(m); return m; };
    this.mRing = mk(new THREE.RingGeometry(.34, .44, 40), .95); this.mDisc = mk(new THREE.CircleGeometry(.34, 40), .35);
    this.group.add(this.marker);
    this.mode = null; this.dom();
  }
  load() { try { const s = JSON.parse(localStorage.getItem(LS)); if (s && Array.isArray(s.opened)) return { opened: s.opened, spots: s.spots || {} }; } catch {} return { opened: [], spots: {} }; }
  save() { try { localStorage.setItem(LS, JSON.stringify(this.state)); } catch {} }
  reset() { try { localStorage.removeItem(LS); } catch {} location.reload(); }
  get found() { return this.state.opened.length; }
  get placing() { return !!this.mode; }

  // ---- 置いたお菓子を世界に出す／消す ----
  showPlaced(s, sp) {
    this.hidePlaced(s.id);
    const g = new THREE.Group(), y = surfaceY(sp.x, sp.z, sp.c);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 36), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .8, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .012; g.add(ring);
    const sw = s.build(); sw.scale.setScalar(.9); sw.position.y = .02; g.add(sw); g.position.set(sp.x, y, sp.z);
    this.group.add(g); this.placed[s.id] = { g, sw, ring, ph: Math.random() * 6 };
  }
  hidePlaced(id) { const p = this.placed[id]; if (p) { this.group.remove(p.g); delete this.placed[id]; } }

  // ---- ボックスをあける ----
  open(bx) {
    if (bx.t >= 0) return; bx.t = 0;
    const s = bx.s; this.state.opened.push(s.id); this.save();
    bx.sweet = s.build(); bx.sweet.visible = false; bx.sweet.position.set(bx.b.position.x, bx.y + .3, bx.b.position.z); this.group.add(bx.sweet);
    this.renderList();
  }
  burst(x, y, z) {
    for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(.035), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd24a : 0xcfa8ff, transparent: true })); m.position.set(x, y, z); this.group.add(m); const a = i / 10 * Math.PI * 2; this.fx.push({ m, vx: Math.cos(a) * .9, vz: Math.sin(a) * .9, vy: 1.4 + Math.random() * .6, t: 0 }); }
  }
  update(dt, T) {
    this.T = T; const w = this.ctx.walker();
    for (const bx of this.boxes) {
      const b = bx.b;
      if (bx.t < 0) {
        b.position.y = bx.y + Math.sin(T * 2 + bx.ph) * .018; b.rotation.y += dt * .25; const sc = 1 + Math.sin(T * 3 + bx.ph) * .015; b.scale.setScalar(sc);
        if (w && Math.abs(w.y - bx.y) < .6 && Math.hypot(w.x - b.position.x, w.z - b.position.z) < 1.0) this.open(bx);
      } else {
        bx.t += dt; const t = bx.t, lid = b.userData.lid;
        if (t < .4) { b.rotation.z = Math.sin(t * 60) * .08 * (1 - t / .4); b.rotation.x = Math.cos(t * 52) * .06 * (1 - t / .4); }
        else {
          b.rotation.z = b.rotation.x = 0; const u = t - .4;
          if (!bx.burst) { bx.burst = true; this.burst(b.position.x, bx.y + .4, b.position.z); bx.sweet.visible = true; this.ctx.toast(`${bx.s.name}を みつけた！`); }
          lid.position.y = .36 + Math.min(u, 1) * 1.1; lid.rotation.set(u * 3, u * 4, u * 2); b.userData.lidMat.opacity = Math.max(0, 1 - u * 1.4); lid.visible = b.userData.lidMat.opacity > 0;
          const k = Math.min(1, u / 1.0), sw = bx.sweet; sw.position.y = bx.y + .3 + Math.sin(k * Math.PI) * .9 * (k < 1 ? 1 : 0) + (k >= 1 ? .25 + Math.sin(T * 5) * .03 : 0); sw.rotation.y += dt * 4;
          const grow = ease(Math.min(1, u / .5)); sw.scale.setScalar(Math.max(.01, grow * (u > 2.2 ? Math.max(0, 1 - (u - 2.2) / .5) : 1)));
          if (u > 2.7) { this.group.remove(b); this.group.remove(sw); bx.done = true; }
        }
      }
    }
    this.boxes = this.boxes.filter(b => !b.done);
    for (const f of this.fx) { f.t += dt; f.m.position.x += f.vx * dt; f.m.position.z += f.vz * dt; f.vy -= 4 * dt; f.m.position.y += f.vy * dt; f.m.material.opacity = Math.max(0, 1 - f.t / .9); f.m.rotation.y += dt * 8; if (f.t > .9) { this.group.remove(f.m); f.dead = true; } }
    this.fx = this.fx.filter(f => !f.dead);
    for (const id in this.placed) { const p = this.placed[id]; p.sw.position.y = .02 + (Math.sin(T * 2 + p.ph) * .5 + .5) * .05; p.sw.rotation.y = Math.sin(T * .8 + p.ph) * .35; p.ring.material.opacity = .55 + Math.sin(T * 2.4 + p.ph) * .25; }
    if (this.mode && this.mode.spot) { this.marker.children.forEach(m => m.material.opacity = (m === this.mRing ? .75 : .28) + Math.sin(T * 5) * .12); if (this.mode.prev) this.mode.prev.position.y = this.mode.spot.y + .06 + Math.sin(T * 3) * .03; }
  }

  // ---- 置き場所をえらぶ ----
  startPlace(id, rename) {
    const s = SWEETS.find(x => x.id === id); this.cancel(true);
    this.ctx.closeCard(); document.body.classList.add('placing');
    this.mode = { s, step: 'pick', spot: null, prev: null }; this.setBar();
  }
  cancel(silent) {
    if (this.mode?.prev) this.group.remove(this.mode.prev);
    this.marker.visible = false; this.mode = null; document.body.classList.remove('placing'); this.bar.hidden = true;
    if (!silent) { this.renderList(); }
  }
  evalSpot(x, z, c, selfId) {
    if (c) {
      if (!inRect(x, z, COUNTER, -.3)) return 'カウンターの はしっこだよ';
      if (Math.hypot(x - CUSHION.x, z - CUSHION.z) < .7) return 'もちたの せきだよ';
    } else {
      if (!inRect(x, z, ISLAND, -.5)) return 'はしっこすぎるよ';
      if (blockedAt(x, z, .3)) return 'ものがあって おけないよ';
      if (inRect(x, z, COUNTER, .3)) return 'カウンターの まえだよ';
    }
    for (const id in this.state.spots) { if (id === selfId) continue; const o = this.state.spots[id]; if (Math.hypot(o.x - x, o.z - z) < .7 && o.c === c) return 'ほかのお菓子と ちかいよ'; }
    return null;
  }
  pick(e) {
    if (!this.mode || this.mode.step === 'name') return;
    const r = this.ctx.canvas.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.ctx.camera()); const hit = new THREE.Vector3();
    let x, z, c = false;
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -COUNTER.y), hit) && inRect(hit.x, hit.z, COUNTER)) { x = hit.x; z = hit.z; c = true; }
    else if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) { x = hit.x; z = hit.z; } else return;
    const why = this.evalSpot(x, z, c, this.mode.s.id), y = surfaceY(x, z, c) + .02;
    const m = this.mode; m.spot = { x, z, c, y: y - .02, ok: !why }; m.step = 'confirm'; m.why = why;
    this.marker.position.set(x, y, z); this.marker.visible = true; const col = why ? 0xff4d4d : 0x3ecf6a; this.mRing.material.color.setHex(col); this.mDisc.material.color.setHex(col);
    if (!m.prev) { m.prev = m.s.build(); m.prev.scale.setScalar(.9); this.group.add(m.prev); } m.prev.visible = !why; m.prev.position.set(x, y, z);
    this.setBar();
  }
  confirm(yes) {
    const m = this.mode; if (!m) return;
    if (m.step === 'confirm') {
      if (!yes) { m.step = 'pick'; m.spot = null; this.marker.visible = false; if (m.prev) m.prev.visible = false; this.setBar(); return; }
      if (!m.spot?.ok) return;
      const sp = { x: m.spot.x, z: m.spot.z, c: m.spot.c, name: this.state.spots[m.s.id]?.name || m.s.name };
      this.state.spots[m.s.id] = sp; this.save(); this.showPlaced(m.s, sp);
      this.group.remove(m.prev); m.prev = null; this.marker.visible = false; m.step = 'name'; this.setBar();
    } else if (m.step === 'name') this.finishName();
  }
  rename(id) { const s = SWEETS.find(x => x.id === id); this.cancel(true); this.ctx.closeCard(); document.body.classList.add('placing'); this.mode = { s, step: 'name', spot: null, prev: null }; this.setBar(); }
  finishName() {
    const m = this.mode; if (!m) return; const v = this.nameIn.value.trim().slice(0, 12), sp = this.state.spots[m.s.id];
    if (sp) { sp.name = v || m.s.name; this.save(); }
    this.cancel(true); this.ctx.toast(`「${sp?.name}」に ワープできるよ`); this.renderList();
  }

  // ---- DOM ----
  dom() {
    this.bar = document.getElementById('placebar'); this.msg = document.getElementById('pb-msg'); this.nameIn = document.getElementById('pb-name'); this.yes = document.getElementById('pb-yes'); this.no = document.getElementById('pb-no');
    this.yes.addEventListener('click', () => this.confirm(true)); this.no.addEventListener('click', () => { if (this.mode?.step === 'confirm' && this.mode.spot?.ok) this.confirm(false); else this.cancel(); });
    this.nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') this.finishName(); e.stopPropagation(); }); this.nameIn.addEventListener('keyup', e => e.stopPropagation());
    this.list = document.getElementById('sweets');
    this.list.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const row = b.closest('[data-id]'), id = row?.dataset.id; if (!id) return;
      const act = b.dataset.act, sp = this.state.spots[id];
      if (act === 'main') { if (!sp) this.startPlace(id); else { const w = this.ctx.walker(); if (w) { w.warpTo(sp.x, sp.z, sp.c); this.ctx.toast(`${sp.name}へワープ！`); } } }
      else if (act === 'more') { row.classList.toggle('open'); }
      else if (act === 'rename') this.rename(id);
      else if (act === 'move') this.startPlace(id);
      else if (act === 'remove') { delete this.state.spots[id]; this.save(); this.hidePlaced(id); this.renderList(); this.ctx.toast('お菓子を しまったよ'); }
    });
    this.renderList();
  }
  setBar() {
    const m = this.mode, bar = this.bar; bar.hidden = false; this.nameIn.hidden = m.step !== 'name'; bar.dataset.ok = '';
    if (m.step === 'pick') { this.msg.innerHTML = `<b>${m.s.name}</b>を おく場所を タップしてね`; this.yes.hidden = true; this.no.hidden = false; this.no.textContent = 'やめる'; }
    else if (m.step === 'confirm') {
      if (m.spot.ok) { bar.dataset.ok = 'y'; this.msg.innerHTML = '<b>ここに おいていい？</b>'; this.yes.hidden = false; this.yes.textContent = 'はい'; this.no.hidden = false; this.no.textContent = 'いいえ'; }
      else { bar.dataset.ok = 'n'; this.msg.innerHTML = `<b>ここには おけないよ</b><small>${m.why}。ほかの場所を タップしてね</small>`; this.yes.hidden = true; this.no.hidden = false; this.no.textContent = 'やめる'; }
    } else { this.msg.innerHTML = '<b>この場所に なまえをつけてね</b>'; this.nameIn.value = this.state.spots[m.s.id]?.name || m.s.name; this.yes.hidden = false; this.yes.textContent = 'きめる'; this.no.hidden = true; setTimeout(() => this.nameIn.focus(), 50); }
  }
  renderList() {
    if (!this.list) return; const rest = SWEETS.length - this.found;
    let h = `<p class="sw-head"><b>お菓子のワープ</b><span>みつけた ${this.found}/${SWEETS.length}</span></p>`;
    for (const s of SWEETS) {
      if (!this.state.opened.includes(s.id)) continue; const sp = this.state.spots[s.id];
      h += `<div class="sw-row" data-id="${s.id}"><div class="sw-line"><button data-act="main" class="sw-main">${sweetIcon(s.id)}<span><b>${esc(sp ? sp.name : s.name)}</b><small>${sp ? 'ワープする' : 'おく場所を えらぶ'}</small></span></button>${sp ? '<button data-act="more" class="sw-more" aria-label="へんしゅう"><svg class="ic" viewBox="0 0 48 48"><g class="k"><circle cx="12" cy="24" r="2.2"/><circle cx="24" cy="24" r="2.2"/><circle cx="36" cy="24" r="2.2"/></g></svg></button>' : ''}</div>${sp ? '<div class="sw-edit"><button data-act="rename">なまえ</button><button data-act="move">おきなおす</button><button data-act="remove">しまう</button></div>' : ''}</div>`;
    }
    h += rest > 0 ? `<p class="sw-hint">あと ${rest}こ、お店や お庭に プレゼントボックスが かくれているよ。ちかづくと あくよ</p>` : '<p class="sw-hint">ぜんぶ みつけたよ！</p>';
    this.list.innerHTML = h;
  }
}
const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
