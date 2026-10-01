// 立体小物ライブラリ。すべて原点=接地面中心。動くもの(葉・湯気)は anim に登録する。
import * as THREE from 'three';
import { C, HALLOWEEN, M, rbox, box, cyl, sph, cone, tor, plane, lathe, pill, add, mesh, grp,
  texStripe, texGingham, texLabel, texSpine, texBlob } from './kit.js';

export const anim = { sway: [], steam: [], bob: [], twinkle: [] };
let blobTex;
export function blob(parent, x, y, z, r, op = .22, sy = 1) {
  blobTex ??= texBlob();
  const m = new THREE.Mesh(plane(2, 2), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x9a6a58, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + .004, z); m.scale.set(r, r * sy, 1); m.renderOrder = 1; m.userData.keep = true;
  parent.add(m); return m;
}

// ---------- 食べ物 ----------
export function macaron(p, x, y, z, color, s = 1) {
  const g = grp(p, x, y, z);
  const m = M(color, { r: .6 });
  add(g, sph(.07 * s, 18, 10), m, 0, .012 * s, 0).scale.set(1, .42, 1);
  add(g, cyl(.066 * s, .066 * s, .02 * s, 18), M(C.milk), 0, .03 * s, 0);
  add(g, sph(.07 * s, 18, 10), m, 0, .048 * s, 0).scale.set(1, .42, 1);
  return g;
}
export function cookie(p, x, y, z, s = 1, tone = C.orange) {
  const g = grp(p, x, y, z);
  add(g, pill(.11 * s, .04 * s, .016 * s, 24), M(tone, { r: .85 }), 0, .02 * s, 0);
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + .4, r = (.025 + (i % 3) * .022) * s; add(g, sph(.014 * s, 8, 6), M(C.choc, { r: .6 }), Math.cos(a) * r, .043 * s, Math.sin(a) * r).scale.set(1, .6, 1); }
  return g;
}
export function donut(p, x, y, z, color = C.pink, s = 1) {
  const g = grp(p, x, y, z);
  add(g, tor(.07 * s, .035 * s, 12, 24), M(C.peach, { r: .8 }), 0, .035 * s, 0, { rx: Math.PI / 2 });
  add(g, tor(.07 * s, .03 * s, 12, 24), M(color, { r: .45 }), 0, .045 * s, 0, { rx: Math.PI / 2 }).scale.set(1, 1, .6);
  for (let i = 0; i < 7; i++) { const a = i * .9; add(g, box(.014 * s, .004, .004), M([C.mint2, C.butter, C.white, C.lav][i % 4]), Math.cos(a) * .07 * s, .075 * s, Math.sin(a) * .07 * s, { ry: a }); }
  return g;
}
export function cupcake(p, x, y, z, color = C.pink, s = 1) {
  const g = grp(p, x, y, z);
  add(g, cyl(.06 * s, .04 * s, .06 * s, 14), M(C.mint2, { r: .8 }), 0, .03 * s, 0);
  add(g, sph(.06 * s, 16, 10), M(C.cream2, { r: .8 }), 0, .075 * s, 0).scale.set(1, .7, 1);
  add(g, cone(.05 * s, .07 * s, 14), M(color, { r: .55 }), 0, .125 * s, 0);
  add(g, sph(.018 * s, 10, 8), M(C.red, { r: .4 }), 0, .17 * s, 0);
  return g;
}
export function mochi(p, x, y, z, color = C.pink, s = 1) { // 小さな大福
  const g = grp(p, x, y, z);
  add(g, sph(.07 * s, 18, 12), M(color, { r: .55 }), 0, .04 * s, 0).scale.set(1, .68, 1);
  add(g, sph(.02 * s, 8, 6), M(C.leaf2), 0, .085 * s, 0).scale.set(1.4, .5, 1);
  return g;
}
export function bread(p, x, y, z, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry);
  const m = M(0xe9b777, { r: .85 });
  add(g, sph(.1 * s, 16, 10), m, 0, .06 * s, 0).scale.set(1.5, .75, 1);
  for (let i = -1; i <= 1; i++) add(g, box(.006 * s, .01, .09 * s), M(0xc98d4f), i * .05 * s, .108 * s, 0, { ry: .5 });
  return g;
}
export function cakeSlice(p, x, y, z, s = 1, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, rbox(.16 * s, .05 * s, .12 * s, .01), M(C.cream2), 0, .025 * s, 0);
  add(g, rbox(.16 * s, .016 * s, .12 * s, .006), M(C.pink), 0, .058 * s, 0);
  add(g, rbox(.16 * s, .045 * s, .12 * s, .01), M(C.cream2), 0, .09 * s, 0);
  add(g, sph(.022 * s, 10, 8), M(C.red, { r: .35 }), -.03 * s, .125 * s, 0);
  return g;
}

// ---------- 器 ----------
export function plate(p, x, y, z, r = .22, color = C.milk) {
  const g = grp(p, x, y, z);
  add(g, lathe(`plate${r}`, [[0, 0], [r * .55, 0], [r * .9, .03], [r, .045], [r * .96, .05], [r * .85, .035], [r * .55, .012], [0, .012]], 36), M(color, { r: .35 }), 0, 0, 0);
  add(g, tor(r * .78, .004, 6, 36), M(C.rose, { r: .5 }), 0, .03, 0, { rx: Math.PI / 2 });
  return g;
}
export function cup(p, x, y, z, color = C.pink, s = 1, withTea = true, steam = true) {
  const g = grp(p, x, y, z);
  add(g, lathe('cup', [[0, 0], [.04, 0], [.05, .01], [.062, .06], [.066, .085], [.062, .085], [.056, .06], [.0, .02]], 24), M(color, { r: .3 }), 0, 0, 0, { s });
  add(g, tor(.03, .008, 6, 14, Math.PI * 1.2), M(color, { r: .3 }), .066 * s, .05 * s, 0, { rz: -Math.PI * .6, s });
  add(g, cyl(.057 * s, .057 * s, .004, 20), M(0xc77b4e, { r: .2 }), 0, .075 * s, 0);
  add(g, lathe('saucer', [[0, 0], [.08, 0], [.105, .012], [.1, .014], [.07, .008], [0, .008]], 24), M(C.milk, { r: .35 }), 0, -.0, 0, { s }).position.y = -.004 * s;
  if (steam) steamAt(p, x, y + .1 * s, z, .45);
  return g;
}
export function mug(p, x, y, z, color = C.mint, s = 1) {
  const g = grp(p, x, y, z);
  add(g, pill(.055 * s, .1 * s, .012), M(color, { r: .35 }), 0, .05 * s, 0);
  add(g, tor(.032 * s, .008, 6, 14, Math.PI), M(color, { r: .35 }), .06 * s, .05 * s, 0, { rz: -Math.PI / 2 });
  add(g, cyl(.045 * s, .045 * s, .004, 18), M(0x9a6038, { r: .2 }), 0, .098 * s, 0);
  add(g, sph(.013, 8, 6), M(C.pink), .01, .102 * s, .01);
  return g;
}
export function teapot(p, x, y, z, color = C.pink, s = 1, steam = true) {
  const g = grp(p, x, y, z);
  const m = M(color, { r: .3 });
  add(g, lathe('teapot', [[0, 0], [.08, 0], [.12, .04], [.135, .09], [.12, .15], [.07, .185], [.0, .19]], 28), m, 0, 0, 0, { s });
  add(g, cyl(.05 * s, .06 * s, .02 * s, 18), m, 0, .195 * s, 0);
  add(g, sph(.022 * s, 10, 8), M(C.rose, { r: .3 }), 0, .222 * s, 0);
  add(g, tor(.06 * s, .012 * s, 8, 16, Math.PI * 1.15), m, -.14 * s, .1 * s, 0, { rz: Math.PI * .45 });
  add(g, cyl(.016 * s, .026 * s, .1 * s, 10), m, .17 * s, .1 * s, 0, { rz: -.9 });
  add(g, tor(.06 * s, .004, 6, 24), M(C.milk), 0, .075 * s, 0, { rx: Math.PI / 2, s });
  if (steam) steamAt(p, x + .22 * s, y + .2 * s, z, .7);
  return g;
}
export function jar(p, x, y, z, fill = C.pink, s = 1, kind = 'candy') {
  const g = grp(p, x, y, z);
  add(g, pill(.075 * s, .15 * s, .02), M(0xe9f6f4, { r: .12, op: .38 }), 0, .075 * s, 0, { cast: false });
  add(g, pill(.062 * s, .115 * s, .02), M(fill, { r: .45 }), 0, .062 * s, 0, { cast: false });
  if (kind === 'candy') for (let i = 0; i < 6; i++) { const a = i * 1.05; add(g, sph(.014 * s, 8, 6), M([C.white, C.lav, C.mint2, C.butter][i % 4], { r: .4 }), Math.cos(a) * .035 * s, .12 * s, Math.sin(a) * .035 * s); }
  add(g, cyl(.06 * s, .06 * s, .03 * s, 18), M(C.woodL, { r: .7 }), 0, .165 * s, 0);
  add(g, sph(.014 * s, 8, 6), M(C.wood), 0, .188 * s, 0);
  return g;
}
export function bottle(p, x, y, z, fill = C.lav2, s = 1, glow = false) { // 小瓶
  const g = grp(p, x, y, z);
  add(g, lathe('bottle', [[0, 0], [.04, 0], [.05, .02], [.05, .06], [.035, .09], [.018, .11], [.018, .14], [0, .14]], 18), M(0xe9f6f4, { r: .1, op: .45 }), 0, 0, 0, { s, cast: false });
  add(g, lathe('bottleIn', [[0, .004], [.034, .004], [.044, .02], [.044, .055], [.03, .082], [0, .082]], 18), M(fill, { r: .3, em: glow ? .25 : 0 }), 0, 0, 0, { s, cast: false });
  add(g, cyl(.02 * s, .018 * s, .03 * s, 10), M(C.wood), 0, .15 * s, 0);
  add(g, tor(.02 * s, .003, 6, 12), M(C.pink), 0, .138 * s, 0, { rx: Math.PI / 2 });
  return g;
}
export function tin(p, x, y, z, color = C.mint2, s = 1, label = '') { // 茶缶
  const g = grp(p, x, y, z);
  add(g, pill(.065 * s, .15 * s, .012), M(color, { r: .4, m: .1 }), 0, .075 * s, 0);
  add(g, cyl(.068 * s, .068 * s, .03 * s, 20), M(C.cream2, { r: .5 }), 0, .155 * s, 0);
  add(g, cyl(.05 * s, .05 * s, .006, 20), M(C.milk), 0, .173 * s, 0);
  add(g, cyl(.0662 * s, .0662 * s, .06 * s, 20, 1), M(C.milk, { r: .6 }), 0, .07 * s, 0, { cast: false }).scale.set(1, 1, 1);
  return g;
}
export function pot(p, x, y, z, color = C.pink, s = 1) {
  const g = grp(p, x, y, z);
  add(g, lathe('pot', [[0, 0], [.07, 0], [.095, .02], [.115, .12], [.125, .135], [.115, .14], [.1, .13], [0, .1]], 20), M(color, { r: .6 }), 0, 0, 0, { s });
  add(g, cyl(.1 * s, .1 * s, .004, 18), M(0x8a5a3a, { r: 1 }), 0, .122 * s, 0);
  return g;
}

// ---------- 植物（葉は揺れる） ----------
export function leafPlant(p, x, y, z, s = 1, potColor = C.pink, n = 7, hue = 0) {
  const g = grp(p, x, y, z);
  pot(g, 0, 0, 0, potColor, s);
  const top = grp(g, 0, .13 * s, 0); top.userData.sway = { amp: .045, spd: .8 + Math.random() * .4, ph: Math.random() * 6 };
  anim.sway.push(top);
  const cols = [C.leaf, C.leaf2, C.leaf3];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + hue, lg = grp(top, 0, 0, 0, a);
    const l = add(lg, sph(.05 * s, 10, 8), M(cols[i % 3], { r: .6 }), 0, .1 * s + (i % 2) * .05 * s, .08 * s);
    l.scale.set(.8, 1.9 + (i % 3) * .3, .35); l.rotation.x = .55 + (i % 2) * .25; l.position.z = .06 * s + (i % 2) * .03 * s;
  }
  return g;
}
export function bushy(p, x, y, z, s = 1, potColor = C.lav, color = C.leaf2) { // もこもこ丸い観葉
  const g = grp(p, x, y, z);
  pot(g, 0, 0, 0, potColor, s);
  const top = grp(g, 0, .14 * s, 0); top.userData.sway = { amp: .03, spd: .7, ph: Math.random() * 6 }; anim.sway.push(top);
  [[0, .1, 0, .1], [.06, .14, .03, .08], [-.06, .13, -.02, .085], [.01, .19, -.02, .075], [-.02, .11, .07, .07]].forEach(([a, b, c, r], i) =>
    add(top, sph(r * s, 14, 10), M([color, C.leaf, C.leaf3][i % 3], { r: .75 }), a * s, b * s, c * s));
  return g;
}
export function flowers(p, x, y, z, s = 1, colors = [C.pink, C.butter, C.lav, C.white], n = 7) { // 花束/花器
  const g = grp(p, x, y, z);
  add(g, lathe('vase', [[0, 0], [.05, 0], [.075, .06], [.06, .13], [.04, .17], [.05, .19], [.04, .19], [.03, .17], [0, .1]], 20), M(C.milk, { r: .3 }), 0, 0, 0, { s });
  const top = grp(g, 0, .17 * s, 0); top.userData.sway = { amp: .035, spd: .9, ph: Math.random() * 6 }; anim.sway.push(top);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = i === 0 ? 0 : .09 * s, h = (.2 + (i % 3) * .06) * s;
    const fx = Math.cos(a) * r, fz = Math.sin(a) * r;
    add(top, cyl(.004, .004, h, 5), M(C.leaf2), fx * .5, h / 2, fz * .5, { rz: -fx * 2, rx: fz * 2 });
    const f = grp(top, fx, h, fz);
    const col = colors[i % colors.length];
    for (let k = 0; k < 5; k++) { const pa = k / 5 * Math.PI * 2; add(f, sph(.03 * s, 8, 6), M(col, { r: .6 }), Math.cos(pa) * .03 * s, 0, Math.sin(pa) * .03 * s).scale.set(1, .6, 1); }
    add(f, sph(.018 * s, 8, 6), M(C.butter, { r: .5 }), 0, .01, 0);
  }
  return g;
}
export function flowerBox(p, x, y, z, len = 1.2, ry = 0) { // 窓辺のプランター
  const g = grp(p, x, y, z, ry);
  add(g, rbox(len, .16, .22, .03), M(C.woodD, { r: .8 }), 0, .08, 0);
  add(g, box(len - .04, .01, .18), M(0x7a5238, { r: 1 }), 0, .16, 0);
  const n = Math.round(len / .14);
  for (let i = 0; i < n; i++) {
    const fx = -len / 2 + .1 + i * (len - .2) / (n - 1);
    const gg = grp(g, fx, .16, (i % 2 - .5) * .05); gg.userData.sway = { amp: .05, spd: 1 + (i % 3) * .2, ph: i }; anim.sway.push(gg);
    add(gg, sph(.07, 10, 8), M(i % 3 === 0 ? C.leaf2 : C.leaf, { r: .7 }), 0, .06, 0).scale.set(1, .8, 1);
    add(gg, sph(.034, 8, 6), M([C.pink, C.butter, C.lav, C.white][i % 4], { r: .55 }), 0, .15 + (i % 2) * .04, 0.01);
  }
  return g;
}
export function tree(p, x, y, z, s = 1, color = C.leaf2, pink = false) {
  const g = grp(p, x, y, z);
  if (HALLOWEEN) { // 紅葉(もみじ)=赤橙 / 銀杏=黄。足元に同色の落ち葉の絨毯
    const gingko = !pink && (color === C.leaf || color === C.leaf3);
    const cols = gingko ? [0xf8d848, 0xf2c22c, 0xffe670, 0xe9b52a] : [0xd9402c, 0xe85c2a, 0xc42f30, 0xf07a32];
    add(g, cyl(.11 * s, .17 * s, (gingko ? 1.7 : 1.2) * s, 10), M(C.woodDD), 0, (gingko ? .85 : .6) * s, 0);
    const top = grp(g, 0, (gingko ? 1.55 : 1.1) * s, 0); top.userData.sway = { amp: .012, spd: .45, ph: x }; anim.sway.push(top);
    const blobs = gingko
      ? [[0, .55, 0, .62], [.3, 1.0, .1, .5], [-.3, 1.1, -.1, .5], [0, 1.55, 0, .42], [.35, .35, .2, .45], [-.38, .4, -.15, .45], [.05, .2, -.4, .4]]
      : [[0, .5, 0, .85], [.62, .2, .2, .6], [-.62, .25, -.1, .62], [.1, .25, -.6, .55], [-.1, .95, .15, .55], [.2, .15, .6, .5], [.5, .75, -.35, .45]];
    blobs.forEach(([a, b, c, r], i) => add(top, sph(r * s, 18, 12), M(cols[i % 4], { r: .8 }), a * s, b * s, c * s));
    const carpet = [cols[0], cols[1], cols[3], cols[2]];
    for (let i = 0; i < 4; i++) add(g, cyl((1.5 - i * .28) * s, (1.5 - i * .28) * s, .004, 28), M(carpet[i], { r: 1 }), (i % 2) * .08 * s, .01 + i * .004, (i % 3 - 1) * .06 * s, { cast: false });
    blob(p, x, y, z, 1.3 * s, .2);
    return g;
  }
  add(g, cyl(.12 * s, .17 * s, 1.3 * s, 10), M(C.woodD), 0, .65 * s, 0);
  const top = grp(g, 0, 1.2 * s, 0); top.userData.sway = { amp: .012, spd: .45, ph: x }; anim.sway.push(top);
  [[0, .5, 0, .85], [.55, .2, .2, .6], [-.55, .25, -.1, .62], [.1, .25, -.55, .55], [-.1, .95, .15, .55], [.15, .15, .55, .5]].forEach(([a, b, c, r], i) =>
    add(top, sph(r * s, 18, 12), M(pink && i % 2 ? C.pink : [color, C.leaf, C.leaf3][i % 3], { r: .8 }), a * s, b * s, c * s));
  blob(p, x, y, z, 1.3 * s, .22);
  return g;
}
export function bush(p, x, y, z, s = 1, color = C.leaf2, flower = true) {
  const g = grp(p, x, y, z);
  [[0, .22, 0, .3], [.28, .16, .1, .22], [-.26, .17, 0, .24], [.05, .14, .26, .2]].forEach(([a, b, c, r], i) => add(g, sph(r * s, 14, 10), M([color, C.leaf, C.leaf3, color][i], { r: .8 }), a * s, b * s, c * s));
  if (flower) for (let i = 0; i < 6; i++) add(g, sph(.045 * s, 8, 6), M([C.pink, C.butter, C.white, C.lav][i % 4]), Math.cos(i * 1.2) * .3 * s, (.25 + (i % 3) * .06) * s, Math.sin(i * 1.2) * .3 * s + .06);
  blob(p, x, y, z, .55 * s, .2);
  return g;
}

// ---------- 本・箱・布 ----------
export function book(p, x, y, z, w, h, d, color, ry = 0, rz = 0) {
  const g = grp(p, x, y, z, ry); g.rotation.z = rz;
  add(g, rbox(w, h, d, .008), M(color, { r: .7 }), 0, h / 2, 0);
  add(g, box(w + .002, h * .06, d * .96), M(C.milk), 0, h * .8, 0);
  add(g, box(w + .002, h * .05, d * .96), M(C.milk), 0, h * .25, 0);
  return g;
}
export function bookRow(p, x, y, z, n, maxH = .26, d = .17, seed = 1, w0 = .035) {
  const cols = [C.pink, C.mint2, C.lav, C.butter, C.peach, C.blue, C.rose];
  let cx = x;
  for (let i = 0; i < n; i++) {
    const w = w0 + ((i * 7 + seed) % 5) * .009, h = maxH * (.72 + ((i * 3 + seed) % 5) * .07);
    book(p, cx + w / 2, y, z, w, h, d, cols[(i + seed) % cols.length]); cx += w + .003;
  }
  return cx - x;
}
export function bookStack(p, x, y, z, n = 3, ry = 0, s = 1) {
  const g = grp(p, x, y, z, ry); let yy = 0;
  const cols = [C.mint2, C.pink, C.lav, C.butter];
  for (let i = 0; i < n; i++) { const h = (.035 + (i % 2) * .012) * s; const b = add(g, rbox((.22 - i * .02) * s, h, (.16 - (i % 2) * .015) * s, .008), M(cols[i % 4], { r: .7 }), 0, yy + h / 2, 0, { ry: (i - 1) * .12 }); add(b, box((.22 - i * .02) * s * .98, h * .5, (.16 - (i % 2) * .015) * s * .98), M(C.milk), 0, 0, 0.003); yy += h; }
  return g;
}
export function picturebook(p, x, y, z, ry = .2, color = C.pink) { // 開いた絵本
  const g = grp(p, x, y, z, ry);
  add(g, rbox(.34, .015, .24, .005), M(color), 0, .0075, 0);
  [-1, 1].forEach(s => { const pg = add(g, rbox(.15, .014, .22, .004), M(C.milk, { r: .9 }), s * .08, .02, 0); pg.rotation.z = -s * .08; });
  add(g, cyl(.02, .02, .005, 8), M(C.mint2), -.07, .032, .02, { rx: 0 }).scale.set(1, 1, .8);
  add(g, sph(.02, 8, 6), M(C.rose), .08, .034, -.03).scale.set(1, .3, 1);
  return g;
}
export function giftBox(p, x, y, z, w, h, d, color = C.pink, ribbon = C.mint2, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, rbox(w, h, d, .012), M(color, { r: .6 }), 0, h / 2, 0);
  add(g, rbox(w + .012, h * .22, d + .012, .008), M(color, { r: .55 }), 0, h * .89, 0);
  add(g, box(w * .12, h * 1.002, d + .016), M(ribbon, { r: .55 }), 0, h / 2, 0);
  add(g, box(w + .016, h * 1.002, d * .12), M(ribbon, { r: .55 }), 0, h / 2, 0);
  const bow = grp(g, 0, h + .01, 0);
  [-1, 1].forEach(s => add(bow, sph(Math.min(w, d) * .13, 10, 8), M(ribbon, { r: .5 }), s * Math.min(w, d) * .11, 0, 0).scale.set(1.2, .55, .8));
  add(bow, sph(Math.min(w, d) * .06, 8, 6), M(ribbon, { r: .5 }), 0, 0, 0);
  return g;
}
export function roundBox(p, x, y, z, r, h, color = C.lav, ribbon = C.pink) { // 丸い包装箱
  const g = grp(p, x, y, z);
  add(g, pill(r, h, .015), M(color, { r: .6 }), 0, h / 2, 0);
  add(g, pill(r + .008, h * .25, .01), M(color, { r: .55 }), 0, h * .88, 0);
  add(g, cyl(r + .012, r + .012, .016, 24), M(ribbon, { r: .5 }), 0, h * .4, 0);
  add(g, sph(r * .22, 8, 6), M(ribbon, { r: .5 }), 0, h + .01, 0).scale.set(1.6, .6, 1);
  return g;
}
export function basket(p, x, y, z, r = .2, h = .15, content = 'bread') {
  const g = grp(p, x, y, z);
  add(g, lathe(`basket${r}${h}`, [[0, 0], [r * .8, 0], [r, h], [r * 1.02, h], [r * .96, h], [r * .76, .012], [0, .012]], 24), M(C.woodL, { r: .9 }), 0, 0, 0);
  add(g, tor(r * 1.0, .01, 6, 24), M(C.wood), 0, h, 0, { rx: Math.PI / 2 });
  add(g, tor(r * .98, .006, 6, 24), M(C.milk), 0, h * .5, 0, { rx: Math.PI / 2 }).scale.set(.88, .88, 1);
  if (content === 'bread') { bread(g, -r * .35, h * .75, 0, .9, .4); bread(g, r * .35, h * .72, r * .1, .85, -.5); bread(g, 0, h * .85, -r * .3, .8, 1.2); }
  if (content === 'cookie') { cookie(g, -r * .3, h * .75, 0, .8); cookie(g, r * .3, h * .8, r * .2, .8, C.butter); cookie(g, 0, h * .9, -r * .3, .8); }
  if (content === 'flower') { for (let i = 0; i < 6; i++) { const a = i * 1.05; add(g, sph(.045, 8, 6), M([C.pink, C.butter, C.lav, C.white, C.peach][i % 5]), Math.cos(a) * r * .5, h + .02 + (i % 2) * .03, Math.sin(a) * r * .5); } }
  if (content === 'yarn') { [C.pink, C.mint2, C.lav, C.butter].forEach((c, i) => add(g, sph(.06, 12, 10), M(c, { r: .95 }), Math.cos(i * 1.6) * r * .4, h + .02, Math.sin(i * 1.6) * r * .4)); }
  return g;
}
export function cloth(p, x, y, z, w, d, tex, ry = 0, tone = 0xffffff) { // テーブルクロス板
  const g = grp(p, x, y, z, ry);
  add(g, box(w, .008, d), M(tone, { r: 1, map: tex }), 0, .004, 0);
  return g;
}
export function cakeStand(p, x, y, z, s = 1, color = C.pink, items = true) {
  const g = grp(p, x, y, z);
  add(g, lathe('stand', [[0, 0], [.1, 0], [.11, .01], [.03, .04], [.018, .08], [.018, .2], [.03, .22], [0, .22]], 24), M(color, { r: .3 }), 0, 0, 0, { s });
  add(g, pill(.19 * s, .018 * s, .008), M(C.milk, { r: .3 }), 0, .22 * s, 0);
  add(g, tor(.18 * s, .005, 6, 40), M(color, { r: .4 }), 0, .232 * s, 0, { rx: Math.PI / 2 });
  if (items) { cupcake(g, -.07 * s, .229 * s, .02, C.pink, .9 * s); cupcake(g, .06 * s, .229 * s, -.05, C.mint2, .9 * s); macaron(g, .03 * s, .229 * s, .09 * s, C.lav, 1); donut(g, -.02, .229 * s, -.1 * s, C.mint2, .7 * s); }
  return g;
}
export function macaronTower(p, x, y, z, s = 1) {
  const g = grp(p, x, y, z);
  const cols = [C.pink, C.mint2, C.lav, C.butter, C.peach];
  [[4, .12], [3, .09], [2, .06]].forEach(([n, r], l) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; macaron(g, Math.cos(a) * r * s, .09 * l * s, Math.sin(a) * r * s, cols[(i + l) % 5], s); } });
  macaron(g, 0, .27 * s, 0, C.rose, s);
  return g;
}

// ---------- 蒸気 ----------
let steamTex;
export function steamAt(p, x, y, z, scale = 1) {
  steamTex ??= texBlob();
  const g = grp(p, x, y, z); g.userData.steam = true;
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xfffaf2, transparent: true, opacity: 0, depthWrite: false }));
    m.userData = { ph: i / 5, drift: (Math.random() - .5) * .08, scale };
    g.add(m);
  }
  anim.steam.push(g); return g;
}

// ---------- 灯り・看板・飾り ----------
export function lantern(p, x, y, z, color = C.butter, s = 1, hang = 0) { // 丸い吊りランタン
  const g = grp(p, x, y, z);
  if (hang) add(g, cyl(.004, .004, hang, 5), M(C.woodD), 0, hang / 2 + .1 * s, 0, { cast: false });
  add(g, sph(.1 * s, 18, 12), M(color, { r: .5, em: .55 }), 0, 0, 0, { cast: false }).scale.set(1, 1.05, 1);
  add(g, cyl(.04 * s, .05 * s, .03 * s, 12), M(C.woodD), 0, .105 * s, 0);
  add(g, tor(.045 * s, .006, 6, 12), M(C.woodD), 0, .13 * s, 0);
  if (hang) { g.userData.sway = { amp: .06, spd: .9, ph: x * 3 }; g.userData.pivotY = hang + .1 * s; }
  return g;
}
export function bunting(p, x1, y1, z1, x2, y2, z2, n = 9, sag = .22, colors = [C.pink, C.mint2, C.butter, C.lav, C.white]) {
  const g = grp(p, 0, 0, 0); g.userData.sway = { amp: .012, spd: .7, ph: x1 }; anim.sway.push(g);
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * sag, z1 + (z2 - z1) * t)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  add(g, new THREE.TubeGeometry(curve, 24, .006, 5), M(C.woodD, { r: 1 }), 0, 0, 0, { cast: false });
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-.08, 0, 0, .08, 0, 0, 0, -.17, 0, -.08, 0, 0, 0, -.17, 0, .08, 0, 0], 3));
  tri.computeVertexNormals();
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, pt = curve.getPoint(t), tg = curve.getTangent(t);
    const f = new THREE.Mesh(tri, M(colors[i % colors.length], { r: .9, side: THREE.DoubleSide }));
    f.position.copy(pt); f.rotation.y = Math.atan2(-tg.z, tg.x); f.castShadow = true; f.userData.noMerge = true; g.add(f);
  }
  return g;
}
export function signBoard(p, x, y, z, w, h, text, sub, ry = 0, bg = '#fffaf0', fg = '#c0627c') {
  const g = grp(p, x, y, z, ry);
  add(g, rbox(w + .1, h + .1, .06, .03), M(C.woodD, { r: .8 }), 0, 0, 0);
  const t = texLabel(text, bg, fg, 512, Math.round(512 * h / w), sub);
  add(g, plane(w, h), M(0xffffff, { r: .7, map: t }), 0, 0, .032, { cast: false });
  return g;
}
export function awning(p, x, y, z, w, d, tilt = .35, c1 = '#f8cdd8', c2 = '#fffaf0') { // 縞の庇（スカラップ付き）。tilt>0で手前が下がる
  const g = grp(p, x, y, z);
  const n = Math.round(w * 3), t = texStripe(c1, c2, n);
  const slope = grp(g, 0, 0, 0); slope.rotation.x = tilt;
  add(slope, box(w, .05, d), M(0xffffff, { r: .85, map: t }), 0, 0, d / 2);
  for (let i = 0; i < n; i++) add(slope, cyl(w / n / 2, w / n / 2, .05, 14), M(i % 2 ? 0xfffaf0 : 0xf8cdd8, { r: .85 }), -w / 2 + (i + .5) * w / n, 0, d, { rx: Math.PI / 2 });
  return g;
}
export function curtain(p, x, y, z, w, h, color = C.pink, ry = 0, flip = 1) { // ドレープ布（ゆるい波）
  const g = grp(p, x, y, z, ry);
  const geo = new THREE.PlaneGeometry(w, h, 14, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) / w * Math.PI * 4) * .035);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M(color, { r: .95, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; m.position.y = -h / 2; g.add(m);
  add(g, cyl(.012, .012, w + .2, 8), M(C.woodD), 0, 0, 0, { rz: Math.PI / 2 });
  add(g, sph(.025, 8, 6), M(C.woodD), -(w + .2) / 2, 0, 0); add(g, sph(.025, 8, 6), M(C.woodD), (w + .2) / 2, 0, 0);
  return g;
}
export function ribbonBow(p, x, y, z, color = C.pink, s = 1) {
  const g = grp(p, x, y, z);
  [-1, 1].forEach(sg => add(g, sph(.06 * s, 10, 8), M(color, { r: .5 }), sg * .055 * s, 0, 0).scale.set(1.2, .8, .5));
  add(g, sph(.03 * s, 8, 6), M(color, { r: .5 }), 0, 0, 0.01);
  [-1, 1].forEach(sg => add(g, box(.025 * s, .1 * s, .005), M(color, { r: .5 }), sg * .02 * s, -.07 * s, 0, { rz: sg * .2 }));
  return g;
}
export function stool(p, x, y, z, color = C.woodL, h = .5, r = .16) {
  const g = grp(p, x, y, z);
  add(g, pill(r, .05, .02), M(color, { r: .8 }), 0, h, 0);
  add(g, pill(r - .015, .02, .008), M(C.pink, { r: .9 }), 0, h + .035, 0);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5; add(g, cyl(.018, .024, h, 8), M(C.woodD), Math.cos(a) * (r - .05), h / 2, Math.sin(a) * (r - .05), { rz: Math.cos(a) * .12, rx: -Math.sin(a) * .12 }); }
  add(g, tor(r - .06, .008, 6, 20), M(C.woodD), 0, h * .35, 0, { rx: Math.PI / 2 });
  blob(p, x, y, z, r * 1.6, .2);
  return g;
}
export function barrel(p, x, y, z, r = .24, h = .5, color = C.woodD) {
  const g = grp(p, x, y, z);
  add(g, lathe(`barrel${r}${h}`, [[0, 0], [r * .85, 0], [r, h * .5], [r * .85, h], [0, h]], 20), M(color, { r: .85 }), 0, 0, 0);
  [.2, .8].forEach(t => add(g, tor(r * (1 - .15 * Math.pow(Math.abs(t - .5) * 2, 2)) + .004, .01, 6, 22), M(C.gold, { r: .5, m: .2 }), 0, h * t, 0, { rx: Math.PI / 2 }));
  blob(p, x, y, z, r * 1.7, .2);
  return g;
}
export function sack(p, x, y, z, s = 1, color = 0xf2dcb8, ry = 0) {
  const g = grp(p, x, y, z, ry);
  add(g, sph(.2 * s, 16, 12), M(color, { r: 1 }), 0, .16 * s, 0).scale.set(1, .9, .8);
  add(g, cone(.09 * s, .13 * s, 10), M(color, { r: 1 }), 0, .36 * s, 0);
  add(g, tor(.05 * s, .008, 6, 12), M(C.pink), 0, .31 * s, 0, { rx: Math.PI / 2 });
  blob(p, x, y, z, .3 * s, .2);
  return g;
}
export function lampPost(p, x, y, z, s = 1) {
  const g = grp(p, x, y, z);
  add(g, cyl(.05 * s, .08 * s, .12, 10), M(C.mint2, { r: .5 }), 0, .06, 0);
  add(g, cyl(.025 * s, .03 * s, 1.9 * s, 8), M(C.deepMint, { r: .5 }), 0, .95 * s, 0);
  add(g, sph(.15 * s, 14, 10), M(C.butter, { r: .5, em: .6 }), 0, 1.98 * s, 0, { cast: false });
  add(g, cone(.17 * s, .12 * s, 12), M(C.deepMint, { r: .5 }), 0, 2.15 * s, 0);
  blob(p, x, y, z, .3, .18);
  return g;
}
export function fence(p, x, y, z, len, ry = 0, h = .45) {
  const g = grp(p, x, y, z, ry);
  const n = Math.round(len / .16);
  for (let i = 0; i < n; i++) { const fx = -len / 2 + (i + .5) * len / n; add(g, rbox(.09, h + (i % 2) * .03, .03, .012), M(HALLOWEEN ? C.deepMint : C.milk, { r: .8 }), fx, h / 2, 0); add(g, cone(.045, .05, 4), M(HALLOWEEN ? C.deepMint : C.milk, { r: .8 }), fx, h + (i % 2) * .03 + .02, 0, { ry: Math.PI / 4 }); }
  add(g, box(len, .035, .025), M(C.milk), 0, h * .35, .026); add(g, box(len, .035, .025), M(C.milk), 0, h * .75, .026);
  return g;
}
export function steppingStone(p, x, z, r = .3, ry = 0) {
  const g = grp(p, x, 0, z, ry);
  add(g, pill(r, .07, .03, 20), M([0xe9dcc8, 0xf0e4d0, 0xe3d3bd][Math.floor(Math.abs(x * 7 + z * 3)) % 3], { r: .9 }), 0, .02, 0).scale.set(1, 1, .85);
  return g;
}
export function spark(p, x, y, z, color = C.butter, s = 1) { // きらめき
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: (steamTex ??= texBlob()), color, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.setScalar(.12 * s); m.userData = { ph: Math.random() * 6, s: .12 * s }; p.add(m); anim.twinkle.push(m); return m;
}
