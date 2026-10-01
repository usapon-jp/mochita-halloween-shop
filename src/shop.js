// お店の建物・棚・カウンター・庭の配置。座標は m、+z が手前(カメラ側)、y が上。
// 店内: x∈[-4,4], z∈[-3,3]。カウンター上面 y=1.0。 もちた置き場は slot (0,1.0,-0.45)。
import * as THREE from 'three';
import { C, H, HALLOWEEN, M, rbox, box, cyl, sph, cone, tor, plane, lathe, pill, add, mesh, grp,
  texWoodFloor, texPlaster, texPlank, texRoof, texStripe, texGingham, texStones, texGrass, texLabel, texBlob } from './kit.js';
import * as P from './props.js';
import * as Q from './props2.js';
import { halloweenInterior, halloweenGarden } from './halloween.js';
import { blob, anim } from './props.js';

export const SLOT = new THREE.Vector3(0, 1.0, -0.45);
export const COUNTER_TOP = 1.0;

const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- 穴あき壁 ----------
function archHole(shape, u0, u1, y0, y1) {
  const h = new THREE.Path(), r = (u1 - u0) / 2, cx = (u0 + u1) / 2;
  h.moveTo(u0, y0); h.lineTo(u1, y0); h.lineTo(u1, y1 - r);
  h.absarc(cx, y1 - r, r, 0, Math.PI, false); h.lineTo(u0, y0);
  shape.holes.push(h);
}
function roundHole(shape, cx, cy, r) { const h = new THREE.Path(); h.absarc(cx, cy, r, 0, Math.PI * 2, true); shape.holes.push(h); }
function wallGeo(W, H, holes, t = .25) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, H); s.lineTo(0, H); s.closePath();
  holes.forEach(h => h.round ? roundHole(s, ...h.round) : archHole(s, ...h.arch));
  return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 });
}
function archFrame(g, u0, u1, y0, y1, z, color = C.milk, w = .1) { // アーチ窓/扉の枠
  const r = (u1 - u0) / 2, cx = (u0 + u1) / 2, m = M(color, { r: .6 });
  add(g, tor(r + w / 2, w / 2, 8, 24, Math.PI), m, cx, y1 - r, z, { cast: false });
  add(g, box(w, y1 - r - y0, .1), m, u0 - w / 2, (y1 - r + y0) / 2, z, { cast: false });
  add(g, box(w, y1 - r - y0, .1), m, u1 + w / 2, (y1 - r + y0) / 2, z, { cast: false });
}
function glassArch(g, u0, u1, y0, y1, z) {
  const r = (u1 - u0) / 2, cx = (u0 + u1) / 2, gm = M(0xdff3f4, { r: .1, op: .22 });
  add(g, box(u1 - u0, y1 - r - y0, .01), gm, cx, (y1 - r + y0) / 2, z, { cast: false });
  const c = add(g, cyl(r, r, .01, 24, 1), gm, cx, y1 - r, z, { rx: Math.PI / 2, cast: false });
  const mm = M(C.milk, { r: .6 });
  add(g, box(.035, y1 - y0 - r * .1, .04), mm, cx, (y0 + y1 - r * .1) / 2 - 0.0, z, { cast: false });
  add(g, box(u1 - u0, .035, .04), mm, cx, y0 + (y1 - r - y0) * .5, z, { cast: false });
  add(g, box(u1 - u0, .035, .04), mm, cx, y1 - r, z, { cast: false });
}

export function buildShop(scene) {
  const world = new THREE.Group(); scene.add(world);
  const arch = grp(world), props = grp(world); // arch=建築(静的) props=小物
  const R = rng(11);
  const plaster = M(0xffffff, { r: .95, map: texPlaster('#fffdf8', [1, 1]) });
  plaster.map.repeat.set(.5, .5);
  const mintWood = M(C.mint, { r: .8 }), rail = M(C.pink, { r: .7 }), beam = M(C.woodD, { r: .85, map: texPlank('#b57a4c', [1, 1]) });

  // ===== 島（箱庭ベース） =====
  const IX = 21.6, IZ = 15, ICZ = 1.4, ICX = 3.0;
  add(arch, rbox(IX, .6, IZ, .25), M(0x9b6a4a, { r: 1 }), ICX, -.35, ICZ, { cast: false });
  const grass = texGrass([IX / 2.2, IZ / 2.2]);
  add(arch, rbox(IX - .02, .12, IZ - .02, .05), M(0xffffff, { r: 1, map: grass }), ICX, -.07, ICZ, { cast: false });
  add(arch, rbox(IX + .1, .1, IZ + .1, .05), M(HALLOWEEN ? 0xe8d49c : 0xcfeedb, { r: 1 }), ICX, -.2, ICZ, { cast: false }); // 縁取り

  // ===== 基礎と床 =====
  add(arch, rbox(8.5, .2, 6.7, .06), M(0xf0e4d2, { r: .9 }), 0, -.02, -.1, { cast: false }); // 石の土台
  const floorTex = texWoodFloor([2.2, 1.8]);
  add(arch, box(8.2, .06, 6.4), M(0xffffff, { r: .7, map: floorTex }), 0, .05, -.1, { cast: false }).position.y = .07;
  // 入口の石段
  add(arch, rbox(2.4, .12, .5, .05), M(0xf0e4d2, { r: .9 }), 1.0, .06, 3.45);
  add(arch, rbox(2.0, .08, .4, .04), M(0xe8d9c3, { r: .9 }), 1.0, .02, 3.8);

  // ===== 背面壁 =====
  const bw = new THREE.Mesh(wallGeo(8.5, 4.2, []), plaster); bw.position.set(-4.25, 0, -3.25); bw.receiveShadow = true; arch.add(bw);
  add(arch, box(8.5, 1.12, .04), mintWood, 0, .62, -2.99, { cast: false });
  for (let i = -4; i <= 3; i++) add(arch, box(.03, 1.0, .02), M(HALLOWEEN ? 0xbfa8e6 : 0xaedcc4), i + .5, .62, -2.965, { cast: false });
  add(arch, rbox(8.5, .09, .08, .02), rail, 0, 1.2, -2.97, { cast: false });
  add(arch, box(8.5, .16, .06), M(C.woodD), 0, .16, -2.97, { cast: false });
  add(arch, box(8.5, .12, .06), M(C.woodD), 0, 4.1, -2.97, { cast: false });
  [-4.1, 4.1].forEach(x => add(arch, rbox(.22, 4.3, .22, .03), beam, x, 2.15, -2.9, { cast: false }));
  add(arch, box(8.2, .1, .1), beam, 0, 3.55, -2.92, { cast: false }); // 梁

  // ===== 左壁（アーチ窓＋扉） =====
  const L = grp(arch, -4.25, 0, 3); L.rotation.y = Math.PI / 2;
  const lw = new THREE.Mesh(wallGeo(6.25, 4.2, [{ arch: [3.15, 4.85, 1.1, 3.4] }, { arch: [.55, 1.65, 0, 2.55] }]), plaster); lw.receiveShadow = true; L.add(lw);
  archFrame(L, 3.15, 4.85, 1.1, 3.4, .27); glassArch(L, 3.15, 4.85, 1.1, 3.4, .12);
  archFrame(L, .55, 1.65, 0, 2.55, .27, C.pink);
  // 扉（少し開いた丸窓つき）
  const door = grp(L, .55, 0, .12); door.rotation.y = -.5;
  add(door, rbox(1.1, 2.0, .06, .02), M(C.mint2, { r: .6 }), .55, 1.0, 0);
  add(door, cyl(.55, .55, .06, 24), M(C.mint2, { r: .6 }), .55, 2.0, 0, { rx: Math.PI / 2 }).scale.set(1, 1, 1);
  add(door, cyl(.22, .22, .07, 20), M(0xfff1c4, { r: .3, em: .5 }), .55, 1.6, 0, { rx: Math.PI / 2, cast: false });
  add(door, tor(.22, .02, 8, 20), M(C.milk), .55, 1.6, .03);
  add(door, sph(.035, 8, 6), M(C.gold, { m: .3, r: .4 }), .95, 1.0, .05);
  add(L, box(6.25, 1.12, .04), mintWood, 3.125, .62, .27, { cast: false });
  add(L, rbox(6.25, .09, .08, .02), rail, 3.125, 1.2, .27, { cast: false });
  add(L, box(6.25, .16, .06), M(C.woodD), 3.125, .16, .27, { cast: false });
  // 窓辺: 出窓の台
  add(L, rbox(2.1, .08, .42, .03), M(C.woodL, { r: .7 }), 4.0, 1.1, .38);
  const lpr = new THREE.Group(); L.add(lpr);

  // ===== 右壁（丸窓） =====
  const Rw = grp(arch, 4.25, 0, -3.25); Rw.rotation.y = -Math.PI / 2;
  const rwall = new THREE.Mesh(wallGeo(3.7, 4.2, [{ round: [1.85, 2.45, .62] }]), plaster); rwall.receiveShadow = true; Rw.add(rwall);
  add(Rw, tor(.66, .06, 8, 28), M(C.milk, { r: .6 }), 1.85, 2.45, .27, { cast: false });
  add(Rw, tor(.66, .06, 8, 28), M(C.pink, { r: .6 }), 1.85, 2.45, -.02, { cast: false });
  add(Rw, cyl(.6, .6, .01, 24), M(0xdff3f4, { r: .1, op: .25 }), 1.85, 2.45, .12, { rx: Math.PI / 2, cast: false });
  add(Rw, box(.03, 1.2, .04), M(C.milk), 1.85, 2.45, .12, { cast: false }); add(Rw, box(1.2, .03, .04), M(C.milk), 1.85, 2.45, .12, { cast: false });
  [-1, 1].forEach(s => add(Rw, box(.03, 1.2, .04), M(C.woodD), 1.85 + s * .2, 2.45, -.0, { cast: false }));
  add(Rw, box(3.7, 1.12, .04), mintWood, 1.85, .62, .27, { cast: false });
  add(Rw, rbox(3.7, .09, .08, .02), rail, 1.85, 1.2, .27, { cast: false });
  add(Rw, box(3.7, .16, .06), M(C.woodD), 1.85, .16, .27, { cast: false });
  // 右壁の外側: 半木組み
  [.1, 1.8, 3.6].forEach(u => add(Rw, rbox(.14, 4.2, .08, .02), beam, u, 2.1, -.05, { cast: false }));
  add(Rw, box(3.7, .12, .08), beam, 1.85, 3.5, -.05, { cast: false }); add(Rw, box(3.7, .12, .08), beam, 1.85, 1.1, -.05, { cast: false });

  const front = grp(world); front.name = 'frontFrame'; front.userData.noMerge = true; // 俯瞰(全景)でだけ見せる手前の枠
  // ===== 手前の柱・梁・庇（俯瞰で箱庭の枠になる） =====
  [-4.1, 4.1].forEach(x => { add(front, rbox(.24, 3.7, .24, .03), beam, x, 1.85, 3.0); P.blob(front, x, 0, 3.0, .5, .2); });
  add(front, rbox(8.6, .2, .2, .03), beam, 0, 3.7, 3.0);
  add(front, rbox(.2, .2, 6.0, .03), beam, -3.9, 3.7, 0, { cast: false });
  // 手前の梁に縞のバランス
  const val = texStripe(H(C.pink), '#fffaf0', 22);
  add(front, box(8.4, .3, .03), M(0xffffff, { r: .9, map: val }), 0, 3.45, 3.12);
  for (let i = 0; i < 22; i++) add(front, cyl(8.4 / 22 / 2, 8.4 / 22 / 2, .03, 12), M(i % 2 ? 0xfffaf0 : C.pink, { r: .9 }), -4.2 + (i + .5) * 8.4 / 22, 3.3, 3.12, { rx: Math.PI / 2 });

  // ===== 屋根（奥半分の切妻） =====
  const rt = texRoof(null, HALLOWEEN ? '#d9a070' : '#e8b7c8', [6, 1.2]), roofM = M(0xffffff, { r: .8, map: rt });
  const ang = 0.78, len = Math.hypot(1.1, 1.0) * 1.12, underM = plaster;
  const slope = (z, rx, l) => { // 上=パステルうろこ、下=白い漆喰、先端=縁板
    const g = grp(arch, 0, 4.72, z); g.rotation.x = rx;
    const tp = add(g, plane(9.3, l), roofM, 0, .07, 0, { rx: -Math.PI / 2, cast: false });
    add(g, plane(9.3, l), underM, 0, -.07, 0, { rx: Math.PI / 2, cast: false });
    add(g, box(9.3, .14, .05), M(C.rose, { r: .6 }), 0, 0, l / 2, { cast: false }); add(g, box(9.3, .14, .05), M(C.rose, { r: .6 }), 0, 0, -l / 2, { cast: false });
  };
  slope(-1.85, ang, len); slope(-2.95, -ang, len + .1);
  add(arch, cyl(.1, .1, 9.4, 12), M(C.rose, { r: .6 }), 0, 5.22, -2.4, { rz: Math.PI / 2, cast: false });
  [-1, 1].forEach(s => { // 破風と切妻
    const tri = new THREE.Shape(); tri.moveTo(-1.15, 0); tri.lineTo(1.15, 0); tri.lineTo(0, 1.02); tri.closePath();
    const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: .1, bevelEnabled: false }), plaster); gm.rotation.y = Math.PI / 2;
    gm.position.set(s * 4.2 - (s > 0 ? 0 : .1) + (s > 0 ? .0 : 0), 4.2, -2.4); arch.add(gm);
    add(arch, box(.1, .1, 1.7), beam, s * 4.4, 4.65, -1.75, { rx: ang, cast: false }).rotation.x = ang;
  });
  // 看板（右壁ブラケット）
  const brk = grp(arch, 4.1, 3.1, .35);
  add(brk, box(.9, .05, .05), M(C.woodD), .45, 0, 0);
  add(brk, cyl(.004, .004, .4, 4), M(C.woodD), .2, -.2, 0); add(brk, cyl(.004, .004, .4, 4), M(C.woodD), .7, -.2, 0);
  const sb = P.signBoard(brk, .45, -.5, 0, .85, .5, 'おやつ', 'もちた', 0, '#fff6ea', HALLOWEEN ? '#d0641c' : '#d86f8c'); sb.userData.sway = { amp: .05, spd: .8, ph: 2 }; anim.sway.push(sb);
  // 背面壁の大看板（もちたの頭より上）
  P.signBoard(props, 0, 3.4, -2.9, 2.6, .8, 'もちたの小さなお店', HALLOWEEN ? 'Happy Halloween' : '雑貨とおやつ', 0, '#fff4e4', HALLOWEEN ? '#a85a1c' : '#b04a6a');
  P.ribbonBow(props, -1.5, 3.65, -2.84, C.pink, 1.1); P.ribbonBow(props, 1.5, 3.65, -2.84, C.mint2, 1.1);

  // ===== カウンター =====
  const cnt = grp(world, 0, 0, -.5);
  add(cnt, rbox(5.7, .12, 1.0, .03), M(C.woodD, { r: .7 }), 0, .1, 0); // 台座
  add(cnt, rbox(5.6, .84, 1.1, .05), M(C.woodL, { r: .72, map: texPlank('#e6bf8f', [4, 1]) }), 0, .52, 0);
  add(cnt, rbox(5.9, .08, 1.3, .04), M(C.woodL, { r: .45 }), 0, 1.0 - .04, 0); // 天板（少し出る）
  add(cnt, rbox(5.9, .035, 1.3, .015), M(0xf4d9b2, { r: .4 }), 0, 1.0 - .0, 0).position.y = .995;
  // 前面: ミントのパネル＋ピンクの縁
  for (let i = 0; i < 5; i++) {
    const px = -2.3 + i * 1.15;
    add(cnt, rbox(.98, .6, .03, .02), M(C.mint, { r: .6 }), px, .52, .56);
    add(cnt, rbox(.82, .44, .02, .015), M(C.mint2, { r: .6 }), px, .52, .575);
    add(cnt, sph(.04, 10, 8), M(C.pink), px, .52, .6);
  }
  add(cnt, rbox(5.7, .05, .06, .02), rail, 0, .85, .57);
  P.blob(world, 0, 0, .75, 3.2, .26, .25);
  // 前面に垂らす縞のクロス
  const drape = texStripe(H(C.pink), '#fffaf0', 10);
  add(cnt, box(1.5, .5, .015), M(0xffffff, { r: .95, map: drape }), -1.7, .66, .62).castShadow = false;
  for (let i = 0; i < 10; i++) add(cnt, cyl(1.5 / 10 / 2, 1.5 / 10 / 2, .015, 10), M(i % 2 ? 0xfffaf0 : C.pink, { r: .95 }), -2.45 + (i + .5) * .15, .41, .62, { rx: Math.PI / 2 });
  // 天板のランナー（ギンガム）
  add(cnt, box(5.0, .006, .9), M(0xffffff, { r: 1, map: texGingham(H(C.pink), [20, 3.6]) }), 0, 1.002 + .0, 0, { cast: false }).position.y = 1.0 - .0 + .0;
  // もちたの置き場（ピンクのフェルト座布団＋レース）
  const slot = grp(world, SLOT.x, SLOT.y, SLOT.z); slot.name = 'mochitaSlot';
  add(slot, pill(.58, .03, .012, 40), M(C.pink, { r: 1 }), 0, .015, 0);
  add(slot, tor(.56, .012, 6, 40), M(C.milk, { r: 1 }), 0, .03, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; add(slot, sph(.026, 6, 5), M(C.milk, { r: 1 }), Math.cos(a) * .63, .012, Math.sin(a) * .63).scale.set(1, .5, 1); }
  add(slot, pill(.38, .02, .008, 32), M(C.mint, { r: 1 }), 0, .035, 0);
  P.blob(slot, 0, 0, 0, .9, .16);

  // ---- カウンター上の小物（左の群れ） ----
  const T = COUNTER_TOP + .0, cz = -.5;
  const cp = grp(world, 0, T, cz);
  P.cakeStand(cp, -2.45, 0, -.05, 1.1, C.pink);
  P.flowers(cp, -2.85, 0, -.3, 1.3, [C.pink, C.butter, C.lav, C.white, C.peach], 9);
  P.plate(cp, -1.7, 0, .28, .23); P.cookie(cp, -1.76, .05, .27, 1); P.cookie(cp, -1.62, .05, .3, 1, C.butter); P.cookie(cp, -1.69, .09, .33, .9, C.orange);
  P.teapot(cp, -2.2, 0, .3, C.mint2, 1.1);
  P.cup(cp, -1.5, 0, -.12, C.pink, 1.15);
  P.jar(cp, -1.4, 0, -.45, C.pink, 1.2); P.jar(cp, -1.12, 0, -.5, C.mint2, 1.0); P.jar(cp, -2.1, 0, -.42, C.butter, 1.0);
  P.bookStack(cp, -2.0, 0, -.18 + .0, 3, .3, .8);
  P.mochi(cp, -1.15, 0, .28, C.pink, 1.1); P.mochi(cp, -1.0, 0, .35, C.mint2, 1.1);
  P.bottle(cp, -2.7, 0, .28, C.lav2, 1.2, true); P.bottle(cp, -2.57, 0, .35, C.rose, 1, true);
  // ---- 右の群れ ----
  P.macaronTower(cp, 1.7, 0, -.32, 1.15);
  P.plate(cp, 1.25, 0, .3, .21); P.donut(cp, 1.18, .05, .3, C.pink); P.donut(cp, 1.33, .05, .3, C.mint2, 1);
  P.cup(cp, 2.1, 0, .22, C.lav, 1.15);
  P.giftBox(cp, 2.65, 0, -.2, .3, .2, .26, C.pink, C.mint2, .2); P.giftBox(cp, 2.62, .2, -.2, .22, .14, .2, C.mint, C.pink, -.3);
  P.roundBox(cp, 2.25, 0, -.52, .13, .12, C.lav, C.pink);
  P.jar(cp, 1.2, 0, -.55, C.lav2, 1.3, 'plain'); P.bottle(cp, 1.0, 0, -.6, C.mint2, 1.3, true); P.bottle(cp, 1.0 + .14, 0, -.62, C.pink, 1.1);
  P.cupcake(cp, 1.45, 0, .1, C.mint2, 1.15); P.cupcake(cp, 1.6, 0, .24, C.pink, 1.15);
  P.leafPlant(cp, 2.85, 0, .28, 1.1, C.pink, 7);
  P.picturebook(cp, 2.3, 0, .3, -.2, C.mint2); P.tin(cp, 2.0, 0, -.1, C.rose, 1.1);
  P.cakeSlice(cp, 1.8, 0, .32, 1, .3);
  P.bread(cp, 2.45, 0, .02, .9, .5);
  // 小さな札（値札）
  [[-1.3, .38, H(C.pink)], [1.4, .36, H(C.mint)], [-2.4, .32, H(C.lav)]].forEach(([x, z, c], i) => {
    add(cp, plane(.1, .07), M(0xffffff, { r: .7, map: texLabel('¥', c, '#b8657c', 128, 90) }), x, .06, z, { rx: -.5 });
  });

  // ===== 棚（背面左右） =====
  shelfUnit(props, -2.92, 2.0, 5, 3, R); shelfUnit(props, 2.92, 2.0, 5, 8, R);
  // 中央の細い飾り棚（顔より上）
  const ledge = grp(props, 0, 0, -2.78);
  add(ledge, rbox(3.4, .06, .3, .02), M(C.woodL, { r: .6 }), 0, 2.72, 0);
  [-1.4, 1.4].forEach(x => add(ledge, rbox(.06, .22, .24, .02), M(C.woodD), x, 2.62, 0));
  P.leafPlant(ledge, -1.2, 2.75, 0, .7, C.mint, 6); P.bushy(ledge, 1.2, 2.75, 0, .7, C.pink); P.tin(ledge, -.55, 2.75, 0, C.pink, .8); P.jar(ledge, .55, 2.75, 0, C.butter, .8); P.bottle(ledge, .8, 2.75, 0, C.lav2, .9);
  // 灯り・ガーランド
  [[-1.55, 3.0], [1.55, 3.0], [-3.2, 3.2], [3.2, 3.2]].forEach(([x, y], i) => P.lantern(props, x, y, -2.35, [C.butter, C.pink, C.mint2, C.butter][i], 1.1, .45 + (i % 2) * .15));
  P.bunting(props, -4.0, 3.62, -2.3, 0, 3.55, -2.3, 8, .28); P.bunting(props, 0, 3.55, -2.3, 4.0, 3.62, -2.3, 8, .28, [C.mint2, C.pink, C.lav, C.butter, C.white]);
  P.bunting(front, -4.0, 3.62, 2.9, 4.0, 3.62, 2.9, 20, .4);

  // ===== 床の上（カウンターの後ろ） =====
  const bk = grp(world, 0, .1, 0);
  P.barrel(bk, -1.55, 0, -2.25, .25, .55); P.sack(bk, -.95, 0, -2.4, 1, 0xf5e2c2, .4); P.sack(bk, -.65, 0, -2.2, .8, HALLOWEEN ? 0xe3d3f5 : 0xf8d9de, 1);
  P.basket(bk, 1.1, 0, -2.3, .26, .22, 'bread'); P.basket(bk, 1.6, 0, -2.2, .22, .2, 'cookie');
  P.giftBox(bk, 0, 0, -2.5, .5, .32, .4, C.mint, C.pink, .1); P.giftBox(bk, .1, .32, -2.5, .36, .24, .3, C.lav, C.pink, -.2);
  P.stool(bk, -.7, 0, -1.7, C.woodL, .55); P.stool(bk, .7, 0, -1.7, C.woodL, .55);
  P.bushy(bk, -3.5, 0, -2.2, 1.6, C.pink); P.leafPlant(bk, 3.6, 0, -2.1, 1.8, C.mint, 9);
  P.cloth(bk, 0, 0, -1.7, 3.4, 1.0, texGingham(H(C.pink), [10, 3]), 0).children[0].castShadow = false;

  // ===== 客席側の床 =====
  const fl = grp(world, 0, .03, 0);
  add(fl, cyl(1.45, 1.45, .008, 48), M(C.pink, { r: 1 }), .3, .074, 1.55, { cast: false }).scale.set(1, 1, .72);
  add(fl, cyl(1.2, 1.2, .008, 48), M(C.mint, { r: 1 }), .3, .08, 1.55, { cast: false }).scale.set(1, 1, .72);
  add(fl, cyl(.9, .9, .008, 48), M(C.cream, { r: 1 }), .3, .086, 1.55, { cast: false }).scale.set(1, 1, .72);
  // 丸テーブルとお茶
  const tb = grp(fl, -2.5, .07, 1.7);
  add(tb, cyl(.05, .1, .72, 12), M(C.woodD), 0, .36, 0); add(tb, pill(.5, .05, .02), M(C.woodL, { r: .6 }), 0, .74, 0);
  add(tb, pill(.5, .01, .005), M(0xffffff, { r: 1, map: texGingham(H(C.mint2), [3, 3]) }), 0, .775, 0, { cast: false });
  P.teapot(tb, -.08, .78, -.05, C.pink, 1.0); P.cup(tb, .22, .78, .15, C.mint2, 1); P.cup(tb, -.2, .78, .25, C.lav, 1); P.plate(tb, .12, .78, -.2, .18); P.macaron(tb, .08, .83, -.2, C.pink); P.macaron(tb, .17, .83, -.18, C.mint2); P.macaron(tb, .12, .83, -.26, C.lav);
  P.blob(fl, -2.5, .07, 1.7, .8, .24);
  P.stool(fl, -3.1, .07, 2.2, C.woodL, .45); P.stool(fl, -1.8, .07, 2.3, C.woodL, .45);
  // 低い陳列台（バスケット）
  const dt = grp(fl, 2.1, .07, 1.9);
  add(dt, rbox(1.3, .06, .6, .02), M(C.woodL, { r: .7 }), 0, .5, 0);
  [[-.55, -.22], [.55, -.22], [-.55, .22], [.55, .22]].forEach(([x, z]) => add(dt, cyl(.03, .035, .5, 8), M(C.woodD), x, .25, z));
  add(dt, rbox(1.2, .03, .5, .02), M(C.woodD), 0, .2, 0);
  P.basket(dt, -.38, .53, 0, .2, .13, 'cookie'); P.basket(dt, .05, .53, .0, .18, .12, 'flower'); P.basket(dt, .42, .53, 0, .18, .12, 'yarn');
  P.bread(dt, -.3, .23, 0, .9, .3); P.bookStack(dt, .2, .23, 0, 3, .4, .7); P.roundBox(dt, .5, .23, 0, .1, .1, C.pink, C.mint2);
  P.blob(fl, 2.1, .07, 1.9, 1.0, .22, .6);
  // 花バケツ・看板・観葉
  P.basket(fl, 3.45, .07, 2.5, .24, .25, 'flower'); P.flowers(fl, 3.5, .07, 2.15, 2.2); P.flowers(fl, 3.15, .07, 2.55, 1.8, [C.lav, C.white, C.pink], 7);
  const ab = grp(fl, -3.5, .07, 0.8, .5);
  add(ab, box(.04, .8, .04), M(C.woodD), -.25, .4, -.14).rotation.z = 0; add(ab, box(.04, .8, .04), M(C.woodD), .25, .4, -.14);
  add(ab, rbox(.7, .8, .06, .03), M(C.woodD), 0, .45, .06, { rx: -.15 });
  add(ab, plane(.6, .68), M(0xffffff, { r: .9, map: texLabel(HALLOWEEN ? 'お菓子' : 'おやつ', '#fff2e4', HALLOWEEN ? '#c8641c' : '#cc6682', 256, 300, HALLOWEEN ? 'Trick or Treat' : '焼きたて') }), 0, .45, .095, { rx: -.15, cast: false });
  P.blob(fl, -3.5, .07, .85, .5, .22);
  P.leafPlant(fl, -3.6, .07, 2.7, 1.5, C.lav, 10); P.bushy(fl, 3.6, .07, 1.0, 1.3, C.pink);
  P.bookStack(fl, 1.2, .07, 2.8, 4, .5, 1.2); P.giftBox(fl, 0.4, .07, 2.7, .4, .3, .35, C.lav, C.pink, -.3);

  // ===== 窓辺（左壁） =====
  const wz = grp(world, -3.85, 1.18, 0);
  P.flowerBox(wz, 0, 0, -1.5, 1.4, Math.PI / 2);
  P.cup(wz, .02, 0, -.55, C.pink, 1); P.bushy(wz, .02, 0, -.2, .8, C.mint); P.bottle(wz, .05, 0, .12, C.lav2, 1.2, true);
  P.leafPlant(wz, 0, 0, -2.1, .8, C.pink, 6);
  P.curtain(world, -3.9, 3.5, -2.35, .55, 2.2, C.pink, Math.PI / 2).rotation.y = Math.PI / 2;
  P.curtain(world, -3.9, 3.5, 0.4, .55, 2.2, C.pink, Math.PI / 2);
  P.lantern(world, -3.5, 3.0, -1.15, C.butter, 1, .55);
  // 窓の下の小棚
  const wbk = grp(world, -3.78, .1, -1.2, Math.PI / 2);
  add(wbk, rbox(1.8, .08, .36, .02), M(C.woodL), 0, .62, 0);
  [-.8, .8].forEach(x => add(wbk, box(.06, .62, .3), M(C.woodD), x, .31, 0));
  P.bookRow(wbk, -.7, .66, 0, 9, .26, .24, 3); P.leafPlant(wbk, .55, .66, 0, .8, C.lav, 6);
  P.cup(wbk, .2, .66, 0, C.mint2, 1, true, true);
  P.basket(world, -3.45, .1, -2.5, .3, .3, 'yarn'); P.sack(world, -3.7, .1, -1.9, 1.1, 0xf5e2c2, .8);

  // ===== 外の庭 =====
  buildGarden(world, R, front);

  if (HALLOWEEN) halloweenInterior(world, cp, front, props);
  // 窓の光の筋
  lightShafts(world);

  return { world, arch, props, slot, front };
}

// ---------- 棚ユニット ----------
function shelfUnit(parent, cx, w, tiers, seed, R) {
  const g = grp(parent, cx, 0, -3.0 + .24);
  const h = .62, y0 = .55, D = .46;
  const topY = y0 + (tiers - 1) * h + .12;
  add(g, box(w, topY + .08, .04), M(C.woodD, { r: .85, map: texPlank('#b57a4c', [2, 2]) }), 0, (topY + .08) / 2, -D / 2 + .02, { cast: false });
  [-1, 1].forEach(s => add(g, rbox(.08, topY + .1, D, .02), M(C.woodD, { r: .8 }), s * (w / 2 - .04), (topY + .1) / 2, 0));
  add(g, rbox(w + .08, .08, D + .06, .03), M(C.woodL, { r: .65 }), 0, topY + .1, 0.0);
  add(g, rbox(w - .1, .1, .04, .02), M(C.pink, { r: .6 }), 0, topY + .24, .03).scale.set(1, 1, 1); // 冠のスカラップ代わり
  const r = (() => { let s = seed * 97 + 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let t = 0; t < tiers; t++) {
    const y = y0 + t * h;
    add(g, rbox(w - .1, .045, D, .015), M(C.woodL, { r: .6 }), 0, y - .0, 0);
    if (t === 0) { shelfBottom(g, w, y, r); continue; }
    let x = -w / 2 + .14;
    const yy = y + .0225;
    while (x < w / 2 - .22) {
      const k = Math.floor(r() * (HALLOWEEN ? 18 : 12));
      x += place(g, k, x, yy, r, w / 2 - .14 - x) ;
    }
  }
}
function shelfBottom(g, w, y, r) { // 最下段は大物（籠・箱・植木）
  P.basket(g, -w / 2 + .3, y + .02, .0, .22, .18, 'bread'); P.giftBox(g, -.1, y + .02, 0, .36, .26, .3, C.mint, C.pink, .1); P.roundBox(g, .3, y + .02, 0, .14, .2, C.lav, C.pink);
  P.leafPlant(g, w / 2 - .3, y + .02, 0, .9, C.pink, 8);
}
// 返り値=消費した幅。残り幅 rem を超える物は小さな物に切替
function place(g, k, x, y, r, rem) {
  const X = (dx) => x + dx, z = 0;
  const cols = [C.pink, C.mint2, C.lav, C.butter, C.peach, C.rose];
  const c = cols[Math.floor(r() * cols.length)];
  switch (k) {
    case 0: P.jar(g, X(.1), y, z, c, 1.1); P.jar(g, X(.28), y, z + .02, cols[(cols.indexOf(c) + 1) % 6], .95); return .4;
    case 1: P.tin(g, X(.1), y, z, c, 1.0); P.tin(g, X(.26), y, z - .02, cols[(cols.indexOf(c) + 2) % 6], .85); return .38;
    case 2: return P.bookRow(g, X(0), y, z, 4 + Math.floor(r() * 3), .26, .2, Math.floor(r() * 9)) + .08;
    case 3: P.bottle(g, X(.06), y, z, c, 1.2, true); P.bottle(g, X(.18), y, z + .03, cols[(cols.indexOf(c) + 3) % 6], 1.0); P.bottle(g, X(.29), y, z - .02, C.lav2, 1.1, true); return .38;
    case 4: P.leafPlant(g, X(.17), y, z, .8, c, 6); return .36;
    case 5: P.bushy(g, X(.16), y, z, .85, c); return .34;
    case 6: P.giftBox(g, X(.16), y, z, .26, .2, .22, c, cols[(cols.indexOf(c) + 2) % 6], r() - .5); return .36;
    case 7: P.cup(g, X(.1), y, z, c, 1, false, false); P.cup(g, X(.28), y, z + .02, cols[(cols.indexOf(c) + 1) % 6], 1, false, false); return .38;
    case 8: P.roundBox(g, X(.14), y, z, .11, .16, c, cols[(cols.indexOf(c) + 2) % 6]); return .3;
    case 9: P.bookStack(g, X(.15), y, z, 3, r(), .85); P.mochi(g, X(.15), y + .12, z, c, .9); return .34;
    case 10: P.jar(g, X(.1), y, z, c, 1.3, 'plain'); P.cookie(g, X(.3), y, z + .05, .9); return .4;
    case 12: Q.pumpkin(g, X(.12), y, z, .5, { face: r() > .4 }); Q.candyCorn(g, X(.28), y, z + .04, 1.1, r()); return .34;
    case 13: Q.ghost(g, X(.12), y, z, .9, { noBlob: true }); Q.pumpkin(g, X(.3), y, z, .38, { face: true }); return .4;
    case 14: Q.witchHat(g, X(.18), y, z, .75, C.ink, c, r() - .5); return .38;
    case 15: P.jar(g, X(.1), y, z, 0xffb04a, 1.2, 'plain'); Q.candyCorn(g, X(.1), y + .2, z, 1.1, 0); P.jar(g, X(.3), y, z, C.lav2, 1.0); return .4;
    case 16: Q.blackCat(g, X(.14), y, z, .9, r() - .5); return .3;
    case 17: Q.potionBottle(g, X(.06), y, z, 0x9ee06a, 1.2); Q.potionBottle(g, X(.18), y, z + .02, C.lav2, 1.0); Q.skullMug(g, X(.32), y, z, .9); return .4;
    default: P.flowers(g, X(.14), y, z, .8); return .3;
  }
}

// ---------- 庭 ----------
function buildGarden(world, R, front) {
  const gd = grp(world, 0, -.01, 0);
  const stoneTex = null;
  // 小道（前方から入口へ）
  const path = [[1.0, 4.4], [.9, 5.0], [.6, 5.7], [.2, 6.4], [-.2, 7.1], [-.4, 7.7], [-.2, 8.3]];
  path.forEach(([x, z], i) => P.steppingStone(gd, x, z, .34 + (i % 2) * .05, i));
  // 玄関前の敷石帯
  add(gd, rbox(3.2, .05, 1.0, .02), M(0xeadcc6, { r: .9 }), 1.0, .02, 4.3);
  // 左ドアから庭へ
  [[-5.0, 2.4], [-5.5, 2.9], [-6.1, 3.3], [-6.6, 3.9], [-6.9, 4.7]].forEach(([x, z], i) => P.steppingStone(gd, x, z, .3 + (i % 2) * .05, i + 1));
  // 前の花壇
  [-5.2, 5.2].forEach(sx => {
    add(gd, rbox(3.4, .18, .7, .08), M(C.woodL, { r: .8 }), sx, .09, 5.4);
    add(gd, box(3.2, .02, .5), M(0x7c5738, { r: 1 }), sx, .19, 5.4);
    for (let i = 0; i < 14; i++) { const fx = sx - 1.5 + i * .23, fz = 5.4 + (i % 2 - .5) * .22; P.bush(gd, fx, .19, fz, .22 + (i % 3) * .04, [C.leaf, C.leaf2, C.leaf3][i % 3], true); }
  });
  // 奥の木と低木・小さな柵
  P.tree(gd, -6.4, 0, -3.8, 1.5, C.leaf2, true); P.tree(gd, 6.2, 0, -3.6, 1.7, C.leaf, false); P.tree(gd, -3.2, 0, -5.0, 1.3, C.leaf3);
  P.tree(gd, 1.0, 0, -5.0, 1.5, C.leaf2, true); P.tree(gd, 4.8, 0, -4.9, 1.3, C.leaf);
  P.bush(gd, -4.9, 0, -2.6, 1.6, C.leaf2); P.bush(gd, 5.2, 0, -2.4, 1.5, C.leaf); P.bush(gd, -5.4, 0, 0.2, 1.4, C.leaf3); P.bush(gd, -6.6, 0, -1.6, 1.8, C.leaf2);
  P.bush(gd, 4.9, 0, .9, 1.1, C.leaf2); P.bush(gd, 5.3, 0, 3.0, 1.3, C.leaf3);
  // 右壁沿いの花
  for (let i = 0; i < 6; i++) P.bush(gd, 4.7 + (i % 2) * .15, 0, -2.6 + i * .75, .9 + (i % 3) * .1, [C.leaf, C.leaf2][i % 2], true);
  // 柵と街灯
  P.fence(gd, -3.0, 0, 7.1, 4.0, .0); P.fence(gd, 3.5, 0, 7.1, 6.0, .0);
  P.lampPost(gd, -1.9, 0, 6.6, 1.2); P.lampPost(gd, 2.6, 0, 6.6, 1.2);
  // ===== 広いお庭（右側） =====
  const pn = grp(gd, 9.2, 0, 4.2);
  add(pn, pill(1.9, .08, .03, 40), M(C.milk, { r: .9 }), 0, .04, 0).scale.set(1, 1, .72);
  add(pn, pill(1.76, .02, .01, 40), M(HALLOWEEN ? 0x9fc8d8 : 0xa8dce0, { r: .12 }), 0, .09, 0, { cast: false }).scale.set(1, 1, .72);
  [[-.6, .1], [.4, -.3], [.8, .3], [-.1, .45]].forEach(([x, z], i) => { add(pn, cyl(.2, .2, .01, 14), M(C.leaf, { r: .6 }), x, .105, z, { cast: false }); add(pn, sph(.05, 8, 6), M(i % 2 ? C.pink : C.white), x + .03, .13, z).scale.set(1, .6, 1); });
  [[-1.9, .3], [-1.5, -.9], [1.8, .6], [1.4, -.9], [0, 1.3]].forEach(([x, z], i) => add(pn, sph(.2 + (i % 2) * .08, 10, 8), M(0xe9ddc9, { r: .95 }), x, .12, z).scale.set(1, .6, 1));
  // 右庭の曲がる小道
  [[4.6, 3.6], [5.4, 3.4], [6.2, 3.7], [7.0, 4.4], [7.6, 5.2], [8.2, 6.0], [9.0, 6.5], [9.9, 6.5], [10.7, 6.0]].forEach(([x, z], i) => P.steppingStone(gd, x, z, .3 + (i % 2) * .05, i * 1.3));
  // 花壇（色ごとの畝）
  [[6.2, 0.6], [7.6, 0.2], [9.0, -.2], [10.4, -.6]].forEach(([x, z], k) => {
    add(gd, rbox(1.2, .16, 3.2, .07), M(C.woodL, { r: .8 }), x, .08, z, { ry: -.05 });
    add(gd, box(1.0, .02, 3.0), M(0x7c5738, { r: 1 }), x, .17, z, { ry: -.05 });
    if (HALLOWEEN) { for (let i = 0; i < 5; i++) Q.pumpkin(gd, x + (i % 2 - .5) * .3, .17, z - 1.2 + i * .6, .75 + (i % 3) * .12, { vine: true, face: (i + k) % 4 === 0, color: [C.orange, C.rose, 0xf7b560, 0xfff1dc][(i + k) % 4] }); }
    else for (let i = 0; i < 9; i++) P.bush(gd, x + (i % 2 - .5) * .34, .17, z - 1.3 + i * .32, .2 + (i % 3) * .035, [C.leaf, C.leaf2, C.leaf3][(i + k) % 3], true);
  });
  // 大きな木・低木・ガーデンテーブル
  P.tree(gd, 12.2, 0, -2.6, 1.7, C.leaf2, true); P.tree(gd, 8.8, 0, -4.4, 1.7, C.leaf); P.tree(gd, 11.6, 0, 3.0, 1.4, C.leaf3); P.tree(gd, 6.4, 0, -4.8, 1.3, C.leaf2, true);
  [[12.4, 5.5, 1.5], [12.0, 7.0, 1.2], [7.8, 7.2, 1.2], [5.8, 6.6, 1.0], [11.2, 0.4, 1.0], [12.6, -0.6, 1.3]].forEach(([x, z, s], i) => P.bush(gd, x, 0, z, s, [C.leaf2, C.leaf, C.leaf3][i % 3], true));
  const gt = grp(gd, 7.4, 0, 2.2);
  add(gt, cyl(.05, .1, .72, 12), M(C.woodD), 0, .36, 0); add(gt, pill(.52, .05, .02), M(C.milk, { r: .6 }), 0, .74, 0);
  add(gt, cyl(.02, .02, 1.7, 8), M(C.woodD), 0, 1.5, 0); add(gt, cone(1.15, .38, 16), M(0xffffff, { r: .85, map: texStripe(H(C.pink), '#fffaf0', 8) }), 0, 2.4, 0);
  P.teapot(gt, -.1, .77, 0, C.lav, 1); P.cup(gt, .25, .77, .15, C.pink, 1); P.plate(gt, .05, .77, .3, .17); P.macaron(gt, .05, .82, .3, C.mint2);
  P.stool(gd, 6.5, 0, 2.5, C.woodL, .45); P.stool(gd, 8.3, 0, 2.0, C.woodL, .45); P.stool(gd, 7.6, 0, 3.2, C.woodL, .45);
  P.blob(gd, 7.4, 0, 2.2, .9, .2);
  P.fence(gd, 11.0, 0, 8.2, 6.4); P.fence(gd, 8.8, 0, -5.8, 4.0, 0);
  P.lampPost(gd, 6.0, 0, 5.8, 1.2); P.lampPost(gd, 10.5, 0, 1.8, 1.2);
  for (let i = 0; i < 18; i++) P.bush(gd, 5.0 + (i % 9) * 1.0 + (i % 2) * .3, 0, 8.0 - Math.floor(i / 9) * .5, .55 + (i % 3) * .1, [C.leaf, C.leaf2, C.leaf3][i % 3], true);
  P.bookStack(gd, 6.9, 0, 4.1, 3, .4, 1.0);
  // 芝生に散らす小花・石・きのこ
  const rr = rng(77), fc = [C.pink, C.butter, C.white, C.lav, C.peach, C.rose], bed = (x, z) => (x > 5.4 && x < 11.2 && z > -2.4 && z < 2.6) || (x > 3.6 && x < 7.2 && z > 4.6 && z < 6.2) || (x > -7.2 && x < -3.2 && z > 4.6 && z < 6.2);
  for (let i = 0; i < 360; i++) {
    const x = -7.6 + rr() * 21, z = -6 + rr() * 14.2;
    if ((Math.abs(x) < 4.7 && z > -3.6 && z < 3.7) || bed(x, z) || (x > 6.6 && x < 11.8 && z > 2.4 && z < 6)) continue;
    const c = fc[Math.floor(rr() * 6)], s = .7 + rr() * .6;
    add(gd, sph(.035 * s, 6, 4), M(c, { r: .6 }), x, .06, z, { cast: false });
    add(gd, sph(.035 * s, 6, 4), M(c, { r: .6 }), x + .07, .05, z + .03, { cast: false });
    add(gd, sph(.03 * s, 6, 4), M(C.leaf2, { r: .8 }), x + .03, .03, z - .03, { cast: false }).scale.set(1.6, .5, 1.2);
  }
  for (let i = 0; i < 16; i++) {
    const x = -7.2 + rr() * 20.4, z = -5.6 + rr() * 13.6;
    if ((Math.abs(x) < 4.8 && z > -3.6 && z < 3.8) || bed(x, z)) continue;
    if (i % 3 === 0) { const m = grp(gd, x, 0, z); add(m, cyl(.04, .05, .12, 8), M(C.milk), 0, .06, 0); add(m, sph(.1, 10, 6), M(C.red, { r: .6 }), 0, .13, 0).scale.set(1, .6, 1); add(m, sph(.015, 5, 4), M(C.milk), .04, .17, .03); }
    else add(gd, sph(.16 + rr() * .12, 8, 6), M(0xe9ddc9, { r: .95 }), x, .05, z).scale.set(1, .6, 1);
  }
  // 左の庭にも小さな木立と花壇
  P.tree(gd, -7.0, 0, 3.4, 1.35, C.leaf2, true); P.tree(gd, -6.0, 0, 6.2, 1.3, C.leaf); P.bush(gd, -7.2, 0, 1.0, 1.4, C.leaf2); P.bush(gd, -6.6, 0, 7.4, 1.0, C.leaf3);
  P.flowers(gd, -5.4, 0, 3.6, 2.2, [C.lav, C.pink, C.white], 8); P.basket(gd, -5.6, 0, 4.3, .26, .22, 'flower');
  P.bush(gd, -4.7, 0, 4.0, 1.2, C.leaf, true); P.bush(gd, -5.0, 0, -1.8, 1.0, C.leaf3, true);
  if (HALLOWEEN) halloweenGarden(gd, front);
  // 雲（島の外の空に）
  // 電飾（柱→街灯→柱）
  fairy(front, [[-4.1, 3.7, 3.0], [-3.0, 2.9, 5.0], [-1.9, 2.4, 6.6]], 14);
  fairy(front, [[4.1, 3.7, 3.0], [3.4, 3.0, 5.0], [2.6, 2.4, 6.6]], 14);
  fairy(gd, [[2.6, 2.4, 6.6], [4.5, 2.5, 6.0], [6.0, 2.4, 5.8], [8.2, 3.0, 4.2], [10.5, 2.4, 1.8]], 24);
  fairy(gd, [[-1.9, 2.4, 6.6], [0, 2.1, 6.9], [2.6, 2.4, 6.6]], 16);
  fairy(front, [[-4.1, 3.5, 3.1], [0, 3.1, 3.2], [4.1, 3.5, 3.1]], 24);
  // バケツ・じょうろ・ベンチ
  const bn = grp(gd, 3.5, 0, 4.2, -.4);
  add(bn, rbox(1.3, .06, .4, .02), M(C.woodL), 0, .42, 0);
  [-.55, .55].forEach(x => add(bn, box(.05, .42, .3), M(C.woodD), x, .21, 0));
  add(bn, rbox(1.3, .35, .05, .02), M(C.woodL), 0, .62, -.17);
  P.blob(gd, 3.5, 0, 4.2, .8, .2, .4);
  P.leafPlant(bn, -.4, .45, 0, .8, C.pink, 6); P.cup(bn, .3, .45, 0, C.mint2, 1, true, true);
}
function fairy(parent, pts, n) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  add(parent, new THREE.TubeGeometry(curve, 24, .008, 5), M(C.woodD, { r: 1 }), 0, 0, 0, { cast: false });
  const cols = HALLOWEEN ? [0xffb04a, 0xc59bff, 0xffe08a, 0xff8a3c] : [0xffe6a8, 0xfbc4d4, 0xc4ecd6, 0xe0d4fa];
  for (let i = 1; i < n; i++) {
    const pt = curve.getPoint(i / n);
    add(parent, sph(.035, 8, 6), M(cols[i % 4], { r: .4, em: .9 }), pt.x, pt.y - .04, pt.z, { cast: false });
    if (i % 4 === 1) P.spark(parent, pt.x, pt.y - .04, pt.z, cols[i % 4], 1.1);
  }
}
let shaftTex;
function lightShafts(world) {
  shaftTex ??= (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,240,200,.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-in'; const ge = g.createLinearGradient(0, 0, 64, 0); ge.addColorStop(0, 'rgba(0,0,0,0)'); ge.addColorStop(.5, 'rgba(0,0,0,1)'); ge.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ge; g.fillRect(0, 0, 64, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .45, side: THREE.DoubleSide });
  [[-1.2, .55], [-.5, .4], [-1.9, .35]].forEach(([z, o], i) => {
    const m = new THREE.Mesh(plane(.5, 3.4), mat);
    m.position.set(-3.0 + i * .1, 1.9, z + .25); m.rotation.set(0, Math.PI / 2, -.62); m.userData.shaft = true; m.renderOrder = 3; world.add(m);
  });
}
