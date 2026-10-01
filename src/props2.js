// ハロウィン・秋の日本の植物の小物。props.js と同じ流儀（原点=接地面中心、動くものは anim へ）。
import * as THREE from 'three';
import { C, M, rbox, box, cyl, sph, cone, tor, plane, lathe, pill, add, mesh, grp } from './kit.js';
import * as P from './props.js';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { anim, blob } from './props.js';
anim.bob = []; anim.fly = []; anim.leaves = [];

// 子メッシュを材質ごとに1つへ結合（動く小物のドローコール削減用）
export function bake(g) {
  const by = new Map();
  for (const c of [...g.children]) {
    if (!c.isMesh || c.userData.keep) continue;
    c.updateMatrix();
    let geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
    for (const n of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(n)) geo.deleteAttribute(n);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(c.matrix);
    const k = c.material.uuid + c.castShadow; let e = by.get(k); if (!e) by.set(k, e = { mat: c.material, cast: c.castShadow, geos: [] }); e.geos.push(geo);
    g.remove(c);
  }
  for (const e of by.values()) { const m = new THREE.Mesh(mergeGeometries(e.geos, false), e.mat); m.castShadow = e.cast; m.receiveShadow = true; g.add(m); }
  return g;
}

const glowMat = () => new THREE.MeshBasicMaterial({ color: 0xffd66a, polygonOffset: true, polygonOffsetFactor: -4, side: THREE.DoubleSide });
let _glow; const glow = () => (_glow ??= glowMat());
const ptsGeo = {};
function poly(key, pts) { return ptsGeo[key] ??= new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])))); }

// ---------- かぼちゃ ----------
const pumpGeo = {};
function pumpkinGeo(r) {
  return pumpGeo[r] ??= (() => {
    const g = new THREE.SphereGeometry(r, 24, 14), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(z, x), k = 1 + .075 * Math.cos(th * 10) * (1 - Math.abs(y / r) * .3);
      p.setXYZ(i, x * k, y * .78, z * k);
    }
    g.computeVertexNormals(); return g;
  })();
}
export function pumpkin(p, x, y, z, s = 1, o = {}) {
  const r = .2 * s, g = grp(p, x, y, z, o.ry ?? 0);
  const col = o.color ?? C.orange;
  add(g, pumpkinGeo(r), M(col, { r: .55 }), 0, r * .78, 0);
  const stemC = M(o.stem ?? 0x7a6a3a, { r: .85 });
  add(g, cyl(r * .1, r * .17, r * .32, 8), stemC, 0, r * 1.5, 0, { rz: .15 });
  if (o.vine) add(g, tor(r * .22, r * .02, 5, 10, Math.PI * 1.6), M(C.moss, { r: .8 }), r * .3, r * 1.52, 0, { rx: 0 });
  if (o.face) {
    const gm = glow(), R = r * .96, yE = r * .9;
    [-1, 1].forEach(sg => { const a = sg * .42; const e = new THREE.Mesh(poly('eye', [[-.5, -.4], [.5, -.4], [0, .5]]), gm); e.scale.setScalar(r * .36); e.position.set(Math.sin(a) * R, yE, Math.cos(a) * R); e.rotation.y = a; g.add(e); });
    for (let i = 0; i < 5; i++) { const a = (i - 2) * .26, up = i % 2 ? 1 : -1; const t = new THREE.Mesh(poly('tooth', [[-.5, 0], [.5, 0], [0, up * .9]]), gm); t.scale.set(r * .2, r * .22, 1); t.position.set(Math.sin(a) * R, r * .42 - (i % 2) * .0, Math.cos(a) * R); t.rotation.y = a; g.add(t); }
    const nose = new THREE.Mesh(poly('nose', [[-.3, 0], [.3, 0], [0, .5]]), gm); nose.scale.setScalar(r * .24); nose.position.set(0, r * .68, R); g.add(nose);
  }
  if (o.bake) bake(g);
  return g;
}
export function pumpkinPile(p, x, y, z, s = 1, face = true) {
  const g = grp(p, x, y, z);
  const cols = [C.orange, C.rose, 0xf7b560, 0xfff1dc, C.lav2, C.orange];
  [[0, 0, 0, 1.15, 0, 1], [.38, 0, .14, .85, 3, 0], [-.36, 0, .1, .9, 1, 0], [.12, 0, .38, .7, 5, 0], [-.1, .2, -.05, .6, 2, 0], [.2, .17, .0, .5, 0, 0]].forEach(([a, b, c, k, ci, f], i) =>
    pumpkin(g, a * s, b * s, c * s, k * s, { color: cols[ci % cols.length], face: face && f, ry: (i - 2) * .3, vine: i === 1 }));
  blob(p, x, y, z, .75 * s, .24);
  return g;
}

// ---------- おばけ ----------
const ghostGeo = {};
function ghostBody(r) {
  return ghostGeo[r] ??= (() => {
    const pts = [[0, r * 1.55]];
    for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push([Math.sin(a) * r, r * .75 + Math.cos(a) * r * .8]); }
    pts.push([r * 1.02, r * .3]); pts.push([r * 1.0, 0]);
    const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])).reverse(), 32), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (y < r * .45) pos.setY(i, y - (Math.sin(Math.atan2(z, x) * 4) * .5 + .5) * r * .22 * (1 - y / (r * .45))); }
    g.computeVertexNormals(); return g;
  })();
}
export function ghost(p, x, y, z, s = 1, o = {}) {
  const r = .13 * s, g = grp(p, x, y, z, o.ry ?? 0);
  add(g, ghostBody(r), M(C.ghost, { r: .5, em: .12 }), 0, r * .25, 0, { cast: o.cast ?? true });
  [-1, 1].forEach(sg => { add(g, sph(r * .11, 8, 6), M(C.ink, { r: .3 }), sg * r * .32, r * 1.45, r * .86); add(g, sph(r * .12, 8, 6), M(C.pink, { r: .6 }), sg * r * .6, r * 1.2, r * .74).scale.set(1.2, .6, .4); });
  add(g, sph(r * .12, 8, 6), M(C.ink, { r: .3 }), 0, r * 1.18, r * .93).scale.set(1, 1.3, .6);
  [-1, 1].forEach(sg => add(g, sph(r * .22, 8, 6), M(C.ghost, { r: .5, em: .12 }), sg * r * 1.04, r * 1.0, r * .1).scale.set(.7, 1.2, .7));
  bake(g);
  if (o.bob) { g.userData.bob = { amp: o.bob, spd: .8 + Math.random() * .5, ph: Math.random() * 6, y0: y }; anim.bob.push(g); }
  if (!o.noBlob) blob(p, x, 0, z, r * 1.5, .12);
  return g;
}
export function hangingGhost(p, x, y, z, len = .5, s = 1) { // 糸で吊るしたおばけ（ゆれる）
  const g = grp(p, x, y, z); g.userData.sway = { amp: .07, spd: .9, ph: x * 4 + z }; anim.sway.push(g);
  add(g, cyl(.004, .004, len, 4), M(C.ink), 0, len / 2, 0, { cast: false });
  ghost(g, 0, -.12 * s, 0, s, { noBlob: true, cast: false });
  return g;
}

// ---------- こうもり ----------
let wingShape;
function wingGeo() {
  return wingShape ??= (() => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.12, .14, .3, .1); s.quadraticCurveTo(.26, .02, .32, -.06); s.quadraticCurveTo(.22, -.03, .2, -.12); s.quadraticCurveTo(.12, -.04, .06, -.1); s.quadraticCurveTo(.03, -.04, 0, -.05); s.closePath();
    return new THREE.ShapeGeometry(s);
  })();
}
export function bat(p, x, y, z, s = 1, o = {}) {
  const g = grp(p, x, y, z, o.ry ?? 0);
  const m = M(o.color ?? C.ink, { r: .8, side: THREE.DoubleSide });
  const body = add(g, sph(.045 * s, 8, 6), m, 0, 0, 0, { cast: false }); body.scale.set(.9, 1.1, .8);
  [-.02, .02].forEach(sx => add(g, cone(.014 * s, .04 * s, 4), m, sx * s, .05 * s, 0, { cast: false }));
  bake(g);
  const wings = [];
  [-1, 1].forEach(sg => { const w = new THREE.Mesh(wingGeo(), m); w.scale.set(sg * s, s, s); w.userData.noMerge = true; g.add(w); wings.push(w); });
  g.userData.noMerge = true;
  g.userData.wings = wings;
  if (o.fly) { g.userData.fly = o.fly; anim.fly.push(g); }
  else if (o.flap) { g.userData.fly = null; anim.fly.push(g); g.userData.flapOnly = true; }
  return g;
}

// ---------- お菓子・魔女グッズ ----------
export function candyCorn(p, x, y, z, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, cone(.04 * s, .05 * s, 3), M(0xfff1c8, { r: .6 }), 0, .075 * s, 0).scale.set(1, 1, .7);
  add(g, cyl(.034 * s, .04 * s, .03 * s, 3), M(0xff9d2e, { r: .6 }), 0, .035 * s, 0, { ry: Math.PI / 3 }).scale.set(1, 1, .7);
  add(g, cyl(.04 * s, .04 * s, .03 * s, 3), M(0xffd44a, { r: .6 }), 0, .012 * s, 0, { ry: Math.PI / 3 }).scale.set(1, 1, .7);
  return g;
}
export function wrappedCandy(p, x, y, z, color = C.rose, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, sph(.025 * s, 8, 6), M(color, { r: .4 }), 0, .025 * s, 0).scale.set(1.3, 1, 1);
  [-1, 1].forEach(sg => add(g, cone(.022 * s, .035 * s, 4), M(color, { r: .4 }), sg * .05 * s, .025 * s, 0, { rz: -sg * Math.PI / 2 }));
  return g;
}
export function lollipop(p, x, y, z, color = C.rose, s = 1, rz = 0) {
  const g = grp(p, x, y, z); g.rotation.z = rz;
  add(g, cyl(.004, .004, .14 * s, 5), M(C.milk), 0, .07 * s, 0);
  add(g, cyl(.04 * s, .04 * s, .012 * s, 18), M(color, { r: .35 }), 0, .16 * s, 0, { rx: Math.PI / 2 });
  add(g, tor(.022 * s, .006 * s, 5, 14), M(C.milk), 0, .16 * s, .004, {});
  return g;
}
export function candyBowl(p, x, y, z, s = 1, kind = 'pumpkin') { // かぼちゃ型のお菓子入れ
  const g = grp(p, x, y, z);
  add(g, lathe('cbowl', [[0, 0], [.07, 0], [.12, .05], [.14, .1], [.13, .12], [.11, .1], [.06, .04], [0, .02]], 28), M(kind === 'pumpkin' ? C.orange : C.ink, { r: .5 }), 0, 0, 0, { s });
  const cs = [C.rose, C.mint2, 0xfff1c8, C.butter, C.pink, C.lav2];
  for (let i = 0; i < 9; i++) wrappedCandy(g, Math.cos(i * 1.4) * .07 * s * (i % 3 ? 1 : .4), (.07 + (i % 3) * .018) * s, Math.sin(i * 1.4) * .07 * s * (i % 3 ? 1 : .4), cs[i % 6], 1.0 * s, i * 1.1);
  return g;
}
export function witchHat(p, x, y, z, s = 1, color = C.ink, band = C.rose, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, cyl(.16 * s, .17 * s, .015 * s, 28), M(color, { r: .8 }), 0, .008 * s, 0);
  add(g, cone(.1 * s, .24 * s, 20), M(color, { r: .8 }), 0, .14 * s, 0);
  add(g, cone(.04 * s, .1 * s, 12), M(color, { r: .8 }), .02 * s, .26 * s, 0, { rz: -.5 });
  add(g, cyl(.082 * s, .093 * s, .035 * s, 20), M(band, { r: .6 }), 0, .045 * s, 0);
  add(g, box(.035 * s, .035 * s, .012 * s), M(C.gold, { r: .3, m: .3 }), 0, .045 * s, .09 * s);
  return g;
}
export function cauldron(p, x, y, z, s = 1, steam = true) {
  const g = grp(p, x, y, z);
  add(g, lathe('cauld', [[0, .01], [.08, .0], [.15, .07], [.19, .15], [.18, .22], [.19, .235], [.17, .235], [.16, .22], [.0, .2]], 28), M(C.ink, { r: .45, m: .3 }), 0, 0, 0, { s });
  add(g, cyl(.16 * s, .16 * s, .004, 24), M(0x9ee06a, { r: .25, em: .45 }), 0, .205 * s, 0, { cast: false });
  [-1, 1].forEach(sg => [0, 1].forEach(f => add(g, cyl(.012 * s, .018 * s, .06 * s, 6), M(C.ink), sg * .11 * s, .02 * s, (f - .5) * .1 * s)));
  for (let i = 0; i < 3; i++) add(g, sph(.022 * s, 8, 6), M(0xc8ff9a, { r: .2, em: .7 }), (i - 1) * .06 * s, .215 * s, (i % 2 - .5) * .07 * s);
  if (steam) { const st = P.steamAt(p, x, y + .24 * s, z, .8); st.children.forEach(c => c.material.color.set(0xc8f5a0)); }
  return g;
}
export function blackCat(p, x, y, z, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry), m = M(C.ink, { r: .6 });
  add(g, sph(.1 * s, 14, 10), m, 0, .11 * s, 0).scale.set(1, 1.15, .9);
  add(g, sph(.075 * s, 14, 10), m, 0, .27 * s, .01 * s);
  [-1, 1].forEach(sg => { add(g, cone(.026 * s, .06 * s, 4), m, sg * .05 * s, .33 * s, 0, { rz: -sg * .2 }); add(g, sph(.014 * s, 8, 6), M(0xffe27a, { r: .3, em: .8 }), sg * .03 * s, .28 * s, .066 * s).scale.set(1, 1.2, .5); });
  add(g, sph(.01 * s, 6, 5), M(C.rose), 0, .26 * s, .075 * s);
  const tail = add(g, tor(.07 * s, .015 * s, 6, 14, Math.PI * 1.3), m, -.1 * s, .12 * s, -.04 * s, { ry: 1.2, rz: .6 });
  [-1, 1].forEach(sg => add(g, sph(.03 * s, 8, 6), m, sg * .05 * s, .025 * s, .07 * s).scale.set(1.1, .8, 1.4));
  add(g, tor(.062 * s, .008 * s, 5, 14), M(C.rose, { r: .5 }), 0, .2 * s, .005 * s, { rx: Math.PI / 2 });
  blob(p, x, y, z, .18 * s, .2);
  return g;
}
export function spellBook(p, x, y, z, s = 1, ry = 0, color = C.deepMint) {
  const g = grp(p, x, y, z, ry);
  add(g, rbox(.2 * s, .05 * s, .15 * s, .01), M(color, { r: .6 }), 0, .025 * s, 0);
  add(g, box(.19 * s, .03 * s, .14 * s), M(C.milk), .004, .025 * s, 0);
  add(g, rbox(.05 * s, .052 * s, .05 * s, .01), M(C.gold, { r: .35, m: .3 }), 0, .026 * s, .08 * s * 0);
  add(g, sph(.022 * s, 8, 6), M(C.gold, { r: .3, m: .4 }), -.1 * s, .052 * s, .0);
  return g;
}
export function potionBottle(p, x, y, z, color = 0x9ee06a, s = 1) {
  const g = P.bottle(p, x, y, z, color, s, true);
  add(g, sph(.012 * s, 6, 5), M(C.milk), 0, .098 * s, .045 * s);
  return g;
}
export function skullMug(p, x, y, z, s = 1) { // かわいい骸骨のカップ
  const g = grp(p, x, y, z);
  add(g, pill(.05 * s, .09 * s, .014), M(C.milk, { r: .4 }), 0, .045 * s, 0);
  [-1, 1].forEach(sg => add(g, sph(.012 * s, 6, 5), M(C.ink), sg * .02 * s, .06 * s, .045 * s));
  add(g, sph(.008 * s, 6, 5), M(C.ink), 0, .045 * s, .05 * s).scale.set(1, 1.4, .6);
  add(g, tor(.03 * s, .008, 6, 12, Math.PI), M(C.milk), .055 * s, .045 * s, 0, { rz: -Math.PI / 2 });
  return g;
}
export function webTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i <= 5; i++) { const a = i / 5 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 255, Math.sin(a) * 255); g.stroke(); }
  for (let r = 40; r < 260; r += 40) { g.beginPath(); for (let i = 0; i <= 5; i++) { const a = i / 5 * Math.PI / 2, rr = r - (i % 1 === 0 ? 0 : 0); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) g.moveTo(px, py); else g.quadraticCurveTo(Math.cos(a - Math.PI / 10) * rr * .85, Math.sin(a - Math.PI / 10) * rr * .85, px, py); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _web;
export function cobweb(p, x, y, z, s = 1, ry = 0, flipX = 1, flipY = 1) { // 隅のクモの巣
  _web ??= webTex();
  const m = new THREE.Mesh(plane(1, 1), new THREE.MeshBasicMaterial({ map: _web, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }));
  m.scale.set(s * flipX, s * flipY, 1); m.position.set(x, y, z); m.rotation.y = ry; m.userData.noMerge = true; m.renderOrder = 2; p.add(m);
  m.geometry = m.geometry.clone(); m.geometry.translate(.5, .5, 0); return m;
}
export function spider(p, x, y, len = .6, z = 0) {
  const g = grp(p, x, y, z); g.userData.bob = { amp: len * .18, spd: .5 + Math.random() * .3, ph: Math.random() * 6, y0: y }; anim.bob.push(g);
  const th = add(g, cyl(.002, .002, len, 3), M(C.ghost), 0, len / 2, 0, { cast: false });
  add(g, sph(.04, 10, 8), M(C.ink, { r: .5 }), 0, 0, 0); add(g, sph(.026, 8, 6), M(C.ink), 0, .0, .04);
  for (let i = 0; i < 4; i++) [-1, 1].forEach(sg => add(g, cyl(.004, .004, .1, 3), M(C.ink), sg * .06, -.01 + (i - 1.5) * .014, (i - 1.5) * .02, { rz: sg * .9 }));
  return g;
}

// ---------- 秋の日本の植物 ----------
export function susuki(p, x, y, z, s = 1, n = 11) { // ススキ（穂が揺れる）
  const g = grp(p, x, y, z); g.userData.sway = { amp: .04, spd: .7, ph: x * 3 + z }; anim.sway.push(g);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + i, tilt = .1 + (i % 4) * .08, h = (.7 + (i % 3) * .2) * s;
    const st = grp(g, Math.cos(a) * .05 * s, 0, Math.sin(a) * .05 * s); st.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    add(st, cyl(.004 * s, .008 * s, h, 4), M(0xc6b068, { r: .9 }), 0, h / 2, 0);
    const pl = add(st, sph(.03 * s, 8, 6), M(i % 2 ? 0xf3e2b0 : 0xf8efd0, { r: .95 }), 0, h + .02 * s, 0); pl.scale.set(.8, 3.4, .8);
    add(st, cone(.012 * s, .55 * s, 3), M(C.leaf3, { r: .9 }), .02 * s, .3 * s, 0, { rz: -.15 }).scale.set(1, 1, .3);
  }
  blob(p, x, y, z, .35 * s, .15);
  return g;
}
export function cosmos(p, x, y, z, s = 1, n = 7) { // コスモス
  const g = grp(p, x, y, z); g.userData.sway = { amp: .05, spd: .9, ph: x * 2 }; anim.sway.push(g);
  const cols = [C.rose, 0xfff1f4, 0xe8a0b4, C.pink, C.butter];
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, rr = .08 * s * (i % 3), h = (.45 + (i % 3) * .12) * s;
    add(g, cyl(.004, .004, h, 4), M(C.moss), Math.cos(a) * rr, h / 2, Math.sin(a) * rr);
    const f = grp(g, Math.cos(a) * rr, h, Math.sin(a) * rr);
    for (let k = 0; k < 8; k++) { const pa = k / 8 * Math.PI * 2; add(f, sph(.03 * s, 6, 5), M(cols[i % 5], { r: .6 }), Math.cos(pa) * .03 * s, 0, Math.sin(pa) * .03 * s).scale.set(1.2, .35, .8); }
    add(f, sph(.014 * s, 6, 5), M(C.butter), 0, .005, 0);
  }
  return g;
}
export function higanbana(p, x, y, z, s = 1) { // ヒガンバナ（赤い彼岸花）
  const g = grp(p, x, y, z);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6, h = (.35 + (i % 2) * .1) * s, bx = Math.cos(a) * .05 * s, bz = Math.sin(a) * .05 * s;
    add(g, cyl(.004, .006, h, 4), M(C.moss), bx, h / 2, bz);
    const f = grp(g, bx, h, bz);
    for (let k = 0; k < 6; k++) { const pa = k / 6 * Math.PI * 2; add(f, cyl(.002, .002, .08 * s, 3), M(0xe8403c, { r: .5 }), Math.cos(pa) * .035 * s, .02, Math.sin(pa) * .035 * s, { rz: -Math.cos(pa) * .9, rx: Math.sin(pa) * .9 }); add(f, sph(.007, 4, 3), M(C.butter), Math.cos(pa) * .075 * s, .05, Math.sin(pa) * .075 * s); }
  }
  return g;
}
export function mum(p, x, y, z, s = 1, color = C.butter, potColor = C.deepMint) { // 菊の鉢
  const g = grp(p, x, y, z);
  P.pot(g, 0, 0, 0, potColor, s);
  const top = grp(g, 0, .13 * s, 0); top.userData.sway = { amp: .02, spd: .8, ph: x }; anim.sway.push(top);
  add(top, sph(.1 * s, 12, 9), M(C.leaf2 === 0 ? C.leaf2 : 0x8a9a4a, { r: .8 }), 0, .08 * s, 0).scale.set(1.3, .8, 1.3);
  for (let i = 0; i < 9; i++) { const a = i * 2.2, r = (.04 + (i % 3) * .035) * s; add(top, sph(.04 * s, 8, 6), M([color, C.rose, C.lav2, C.milk, C.butter][i % 5], { r: .6 }), Math.cos(a) * r * 1.2, (.12 + (i % 2) * .03) * s, Math.sin(a) * r * 1.2).scale.set(1, .7, 1); }
  return g;
}
export function kakiTree(p, x, y, z, s = 1) { // 柿の木（橙の実）
  const g = grp(p, x, y, z);
  add(g, cyl(.1 * s, .15 * s, 1.1 * s, 8), M(C.woodDD), 0, .55 * s, 0);
  const top = grp(g, 0, 1.0 * s, 0); top.userData.sway = { amp: .012, spd: .4, ph: x }; anim.sway.push(top);
  [[0, .5, 0, .8], [.5, .2, .1, .55], [-.5, .25, -.1, .58], [.05, .2, -.5, .5], [.1, .85, .1, .5]].forEach(([a, b, c, r], i) =>
    add(top, sph(r * s, 14, 10), M([0xd9a13a, 0xc8702a, 0xe8c050][i % 3], { r: .8 }), a * s, b * s, c * s));
  for (let i = 0; i < 12; i++) { const a = i * 2.4, rr = (.7 + (i % 3) * .2) * s; add(top, sph(.075 * s, 10, 8), M(0xf27a1e, { r: .45 }), Math.cos(a) * rr * .75, (.35 + (i % 4) * .22) * s, Math.sin(a) * rr * .75 + .1 * s); }
  blob(p, x, y, z, 1.2 * s, .22);
  return g;
}
export function pine(p, x, y, z, s = 1) { // 松（常緑の差し色）
  const g = grp(p, x, y, z);
  add(g, cyl(.08 * s, .12 * s, 1.0 * s, 8), M(C.woodDD), 0, .5 * s, 0, { rz: .06 });
  [[0, 1.0, .75], [.1, 1.4, .6], [-.08, 1.75, .45]].forEach(([a, b, r], i) => { const c = add(g, sph(r * s, 14, 8), M(0x5f8f55, { r: .85 }), a * s, b * s, 0); c.scale.set(1.2, .5, 1.1); });
  blob(p, x, y, z, 1.0 * s, .2);
  return g;
}
export function acorns(p, x, y, z, s = 1, n = 4) {
  const g = grp(p, x, y, z);
  for (let i = 0; i < n; i++) { const a = i * 2, r = .04 * s * (i ? 1 : 0); const q = grp(g, Math.cos(a) * r * 1.6, 0, Math.sin(a) * r * 1.6); add(q, sph(.022 * s, 8, 6), M(0xc58a4a, { r: .6 }), 0, .026 * s, 0).scale.set(1, 1.2, 1); add(q, sph(.024 * s, 8, 6), M(0x7a5238, { r: .8 }), 0, .045 * s, 0).scale.set(1, .6, 1); }
  return g;
}
export function leafPile(p, x, y, z, s = 1) { // 落ち葉の山
  const g = grp(p, x, y, z);
  const cols = [0xe8892e, 0xc8502a, 0xf0c050, 0xb8742e, 0xd86a2a];
  for (let i = 0; i < 24; i++) { const a = i * 2.4, r = Math.sqrt(i / 24) * .42 * s; add(g, sph(.07 * s, 6, 4), M(cols[i % 5], { r: .85 }), Math.cos(a) * r, (.04 + (1 - r / (.42 * s)) * .1) * s, Math.sin(a) * r, { cast: false }).scale.set(1.5, .35, 1); }
  blob(p, x, y, z, .5 * s, .12);
  return g;
}
const maple = (() => { // もみじの葉（5裂の星形）
  const s = new THREE.Shape(), n = 5; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .22 : .5; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) s.lineTo(px, py); else s.moveTo(px, py); } s.closePath();
  return new THREE.ShapeGeometry(s);
})();
export function fallingLeaves(parent, n = 46, box = { x: [-8, 13], z: [-6, 8], h: 7 }) {
  const cols = [0xe8892e, 0xc8502a, 0xf0c050, 0xd86a2a, 0xe0382c];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(maple, new THREE.MeshBasicMaterial({ color: cols[i % 5], side: THREE.DoubleSide }));
    const s = .09 + Math.random() * .06; m.scale.setScalar(s); m.userData.leaf = { x: box.x[0] + Math.random() * (box.x[1] - box.x[0]), z: box.z[0] + Math.random() * (box.z[1] - box.z[0]), y: Math.random() * box.h, sp: .25 + Math.random() * .25, ph: Math.random() * 6, rs: .6 + Math.random() * 1.2, h: box.h, bx: box };
    m.position.set(m.userData.leaf.x, m.userData.leaf.y, m.userData.leaf.z); parent.add(m); anim.leaves.push(m);
  }
}
export function mapleLeafOnGround(p, x, z, color, s = 1) {
  const m = new THREE.Mesh(maple, M(color, { r: .9, side: THREE.DoubleSide })); m.scale.setScalar(.12 * s); m.rotation.set(-Math.PI / 2, 0, Math.random() * 6); m.position.set(x, .045, z); m.receiveShadow = true; p.add(m); return m;
}

// ---------- 庭の飾り ----------
export function gravestone(p, x, y, z, s = 1, ry = 0, text = 'RIP') {
  const g = grp(p, x, y, z, ry);
  const m = M(0xd9d2e6, { r: .85 });
  add(g, rbox(.34 * s, .06 * s, .2 * s, .02), m, 0, .03 * s, 0);
  add(g, rbox(.26 * s, .3 * s, .06 * s, .03), m, 0, .2 * s, 0);
  add(g, cyl(.13 * s, .13 * s, .06 * s, 16), m, 0, .35 * s, 0, { rx: Math.PI / 2 });
  add(g, plane(.16 * s, .08 * s), M(0xffffff, { r: .8, map: gstex(text) }), 0, .24 * s, .032 * s, { cast: false });
  blob(p, x, y, z, .3 * s, .2);
  return g;
}
const gsc = {}; function gstex(t) { return gsc[t] ??= (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#d9d2e6'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#7a6a96'; g.font = '700 38px "Hiragino Maru Gothic ProN",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 64, 34); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })(); }
export function hayBale(p, x, y, z, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, rbox(.8 * s, .45 * s, .45 * s, .06), M(0xe8c86a, { r: 1 }), 0, .225 * s, 0);
  for (let i = -1; i <= 1; i++) add(g, rbox(.03 * s, .46 * s, .47 * s, .01), M(C.woodD, { r: .9 }), i * .27 * s, .225 * s, 0);
  for (let i = 0; i < 10; i++) add(g, cyl(.004, .004, .14 * s, 3), M(0xf3dc8a), (i - 5) * .075 * s, .47 * s, ((i * 5) % 3 - 1) * .1 * s, { rz: (i % 4 - 1.5) * .5, rx: (i % 3 - 1) * .5 });
  blob(p, x, y, z, .55 * s, .22, .7);
  return g;
}
export function scarecrow(p, x, y, z, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, cyl(.03 * s, .03 * s, 1.9 * s, 6), M(C.woodD), 0, .95 * s, -.03 * s);
  add(g, cyl(.025 * s, .025 * s, 1.3 * s, 6), M(C.woodD), 0, 1.35 * s, -.03 * s, { rz: Math.PI / 2 });
  add(g, rbox(.34 * s, .4 * s, .2 * s, .08), M(C.deepMint, { r: .9 }), 0, 1.1 * s, 0);
  add(g, rbox(.3 * s, .3 * s, .02, .02), M(C.rose, { r: .9 }), 0, 1.1 * s, .105 * s); // 服のつぎあて
  add(g, sph(.2 * s, 14, 10), M(0xf0d9a0, { r: .9 }), 0, 1.55 * s, 0);
  [-1, 1].forEach(sg => { add(g, sph(.022 * s, 6, 5), M(C.ink), sg * .07 * s, 1.58 * s, .18 * s); add(g, sph(.03 * s, 6, 5), M(C.pink), sg * .12 * s, 1.5 * s, .15 * s).scale.set(1.2, .6, .4); });
  add(g, tor(.05 * s, .008, 5, 10, Math.PI), M(C.ink), 0, 1.5 * s, .185 * s, { rz: Math.PI });
  witchHat(g, 0, 1.66 * s, 0, 1.5 * s, C.lav2, C.butter);
  [-1, 1].forEach(sg => { add(g, cyl(.02 * s, .02 * s, .5 * s, 5), M(0xf3dc8a), sg * .55 * s, 1.3 * s, -.03 * s, { rz: sg * .3 }); add(g, sph(.06 * s, 6, 5), M(0xf3dc8a), sg * .66 * s, 1.1 * s, -.03 * s).scale.set(.6, 1.6, .6); });
  P.blob(p, x, y, z, .5 * s, .2);
  return g;
}
export function cornStalk(p, x, y, z, s = 1) {
  const g = grp(p, x, y, z); g.userData.sway = { amp: .025, spd: .6, ph: x * 2 }; anim.sway.push(g);
  add(g, cyl(.02 * s, .03 * s, 1.5 * s, 6), M(0xc9b95a), 0, .75 * s, 0);
  for (let i = 0; i < 5; i++) { const a = i * 1.3, h = (.5 + i * .22) * s; add(g, cone(.04 * s, .8 * s, 3), M(i % 2 ? 0xd5c466 : 0xb9ae52, { r: .9 }), Math.cos(a) * .09 * s, h, Math.sin(a) * .09 * s, { rz: Math.cos(a) * .6, rx: -Math.sin(a) * .6 }).scale.set(1, 1, .25); }
  add(g, sph(.045 * s, 8, 6), M(C.butter, { r: .5 }), .06 * s, 1.0 * s, .02 * s).scale.set(.8, 2.2, .8);
  return g;
}
export function jackLanternRow(p, pts, s = 1) { pts.forEach(([x, z], i) => pumpkin(p, x, 0, z, s * (.8 + (i % 3) * .15), { face: i % 2 === 0, color: [C.orange, C.rose, 0xf7b560][i % 3], ry: (i % 5 - 2) * .35 })); }
export function ghostBannerFlags(p, x1, y1, z1, x2, y2, z2, n = 8) { // おばけ・かぼちゃ・こうもりのガーランド
  const g = grp(p, 0, 0, 0); g.userData.sway = { amp: .01, spd: .7, ph: x1 }; anim.sway.push(g);
  const sag = .25;
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * sag, z1 + (z2 - z1) * t)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  add(g, new THREE.TubeGeometry(curve, 20, .006, 4), M(C.ink, { r: 1 }), 0, 0, 0, { cast: false });
  for (let i = 0; i < n; i++) { const pt = curve.getPoint((i + .5) / n); if (i % 3 === 0) pumpkin(g, pt.x, pt.y - .13, pt.z, .38, { face: true, bake: true }); else if (i % 3 === 1) ghost(g, pt.x, pt.y - .16, pt.z, .75, { noBlob: true, cast: false }); else bat(g, pt.x, pt.y - .06, pt.z, .9, { flap: true, color: C.ink }); }
  return g;
}
