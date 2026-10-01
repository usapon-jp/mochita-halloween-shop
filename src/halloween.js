// ハロウィン・秋の飾り付け（店内 / 庭）。THEME=halloween のときだけ shop.js から呼ばれる。
import * as THREE from 'three';
import { C, M, rbox, box, cyl, sph, cone, tor, plane, add, grp } from './kit.js';
import * as P from './props.js';
import * as Q from './props2.js';
import { anim } from './props.js';

export function halloweenInterior(world, cp, front, props) {
  // ---- カウンター上（もちた置き場 |x|<0.95 は空ける） ----
  Q.pumpkin(cp, -1.05, 0, -.12, .55, { face: true, ry: .3 });
  Q.candyCorn(cp, -1.3, 0, .05, 1.2, .4); Q.candyCorn(cp, -1.22, 0, .12, 1.1, 1.4); Q.candyCorn(cp, -1.36, 0, .13, 1.0, -.6);
  Q.cauldron(cp, 1.05, 0, -.02, .9);
  Q.blackCat(cp, 2.85, 0, -.62, 1.15, -.35);
  Q.spellBook(cp, 2.2, 0, .08, 1.1, -.4); Q.potionBottle(cp, 2.0, 0, -.22, 0x9ee06a, 1.2); Q.potionBottle(cp, 2.45, 0, -.35, C.lav2, 1.1);
  Q.candyBowl(cp, 1.75, 0, .12, 1.0); Q.lollipop(cp, 1.4, 0, .3, C.rose, 1, .25); Q.lollipop(cp, 1.46, 0, .3, C.mint2, 1, -.2);
  Q.pumpkin(cp, 2.82, 0, .12, .45, { face: false, color: 0xfff1dc, vine: true });
  Q.ghost(cp, -2.0, 0, .45, .8, { noBlob: false });
  // ---- 棚の上の飾り（中央の細い棚）----
  const ledge = grp(props, 0, 0, -2.78);
  Q.witchHat(ledge, -.95, 2.75, 0, .8); Q.pumpkin(ledge, .1, 2.75, 0, .55, { face: true }); Q.ghost(ledge, .95, 2.75, 0, .7, { noBlob: true });
  // ---- 吊るし飾り ----
  [[-1.3, 3.55, -2.3, .5, 1.0], [1.3, 3.55, -2.3, .55, .9], [-3.4, 3.4, -2.2, .45, .8], [3.5, 3.45, -2.2, .6, .9]].forEach(([x, y, z, l, s]) => Q.hangingGhost(props, x, y, z, l, s));
  Q.spider(props, -2.8, 3.55, .8, -2.9); Q.spider(props, 3.2, 3.5, .65, -2.9); Q.spider(props, 2.0, 3.35, .5, -2.9);
  Q.ghostBannerFlags(props, -3.9, 3.8, -2.0, 3.9, 3.8, -2.0, 11);
  // こうもり（壁にとまる）
  [[-2.3, 3.85], [-1.6, 3.95], [2.0, 3.9], [2.7, 3.8], [-3.3, 3.0], [3.5, 2.9]].forEach(([x, y], i) => Q.bat(props, x, y, -2.93, .9 + (i % 3) * .15, { flap: true }));
  // クモの巣（隅）
  Q.cobweb(world, -3.98, 4.12, -2.97, 1.0, 0, 1, -1); Q.cobweb(world, 3.98, 4.12, -2.97, 1.0, 0, -1, -1);
  Q.cobweb(world, -3.96, 4.1, -2.96, .8, Math.PI / 2, 1, -1);
  // ---- 床まわり ----
  const fl = grp(world, 0, .1, 0);
  Q.pumpkinPile(fl, -3.3, 0, 1.0, 1.0, true); Q.pumpkinPile(fl, 3.4, 0, -.9, .9, true);
  Q.hayBale(fl, 3.4, 0, -2.2, .9, .3); Q.cauldron(fl, -3.45, 0, -1.2, 1.4);
  Q.ghost(fl, -3.1, 1.2, 1.9, 1.5, { bob: .1, noBlob: true });
  Q.pumpkin(fl, 1.2, 0, 2.7, .9, { face: true, ry: -.4 }); Q.pumpkin(fl, 1.7, 0, 2.9, .55, { color: C.lav2 });
  Q.acorns(fl, 2.4, 0, 2.6, 1.6, 4); Q.leafPile(fl, -1.2, 0, 2.7, 1.0);
  Q.mum(fl, -.4, 0, 2.9, 1.1, C.butter); Q.mum(fl, 2.9, 0, 2.9, 1.0, C.rose, C.mint2);
  [[-.5, 2.2], [.8, 2.0], [-1.9, 1.5]].forEach(([x, z], i) => Q.mapleLeafOnGround(fl, x, z, [0xe8892e, 0xc8502a, 0xf0c050][i % 3], 1.4));
  // ---- 前の梁（全景のみ表示される枠）に吊る ----
  Q.ghostBannerFlags(front, -4.0, 3.3, 3.2, 4.0, 3.3, 3.2, 14);
  [-3.4, -1.0, 1.4, 3.4].forEach((x, i) => Q.hangingGhost(front, x, 3.5, 3.15, .35 + (i % 2) * .15, 1.0));
  // ---- 窓辺 ----
  const sill = grp(world, -3.85, 1.18, 0);
  Q.pumpkin(sill, .03, 0, -.52, .5, { face: true, ry: Math.PI / 2 }); Q.candyCorn(sill, .05, 0, -.7, 1.1, 0);
}

export function halloweenGarden(gd, gdFront) {
  // 秋の木・ススキ・コスモス・ヒガンバナ・菊
  Q.kakiTree(gd, -7.4, 0, .6, 1.2); Q.kakiTree(gd, 13.0, 0, 7.2, 1.15); Q.pine(gd, 3.4, 0, -5.6, 1.2); Q.pine(gd, -5.2, 0, -4.7, 1.1);
  [[5.0, -1.0], [5.3, 1.8], [12.8, 3.8], [-7.4, -3.2], [9, -6], [6.3, 8.2], [-2.7, 8.0], [-6.8, 5.2], [13.2, -4.2], [0.2, -5.8], [11.5, -5.0]].forEach(([x, z], i) => Q.susuki(gd, x, 0, z, .9 + (i % 3) * .2));
  [[7.8, 7.2], [8.6, 7.5], [4.6, 5.3], [-2.6, 7.6], [-5.0, 7.3], [2.4, 8.0], [-4.2, 3.6], [13.0, 1.4], [12.6, 5.0]].forEach(([x, z], i) => Q.cosmos(gd, x, 0, z, 1 + (i % 2) * .2, 7));
  [[7.0, 5.7], [11.5, 5.2], [9.6, 6.7], [7.2, 3.0], [11.4, 3.6], [6.0, 5.0]].forEach(([x, z]) => Q.higanbana(gd, x, 0, z, 1.1));
  [[-1.4, 3.8], [2.8, 3.9]].forEach(([x, z]) => Q.mum(gd, x, 0, z, 1.2, C.butter, C.deepMint));
  [[-3.0, 5.0], [6.9, -1.0], [-4.0, -4.5], [10, 7.5], [4.2, 7.2]].forEach(([x, z]) => Q.leafPile(gd, x, 0, z, 1.3));
  // 入口まわりのかぼちゃ
  Q.pumpkinPile(gd, -.2, 0, 4.2, 1.1, true); Q.pumpkinPile(gd, 2.4, 0, 4.1, 1.0, true);
  Q.jackLanternRow(gd, [[.4, 5.0], [1.9, 5.5], [-.4, 6.0], [1.4, 6.5], [-.8, 7.0], [.6, 7.4]], .8);
  // 畑のかぼちゃ畑・かかし・藁・とうもろこし
  Q.scarecrow(gd, 11.8, 0, .3, 1.15, -.5); Q.hayBale(gd, 12.2, 0, 1.9, 1, -.3); Q.hayBale(gd, 11.6, 0, -1.6, .9, .4);
  [[12.7, -.6], [12.9, -.1], [12.5, .0], [12.8, -1.2]].forEach(([x, z]) => Q.cornStalk(gd, x, 0, z, 1.1));
  Q.pumpkinPile(gd, 10.4, 0, -2.9, 1.1, true);
  // 墓地コーナー（かわいい版）とおばけ
  [[-6.2, 1.6, .3, 'RIP'], [-5.5, 1.0, -.2, 'BOO'], [-6.5, 2.7, .5, 'RIP'], [-5.7, 2.3, -.4, '♡']].forEach(([x, z, ry, t]) => Q.gravestone(gd, x, 0, z, 1.0, ry, t));
  Q.ghost(gd, -6.0, .5, .5, 1.6, { bob: .12 }); Q.ghost(gd, -5.0, .9, 2.0, 1.2, { bob: .1 }); Q.ghost(gd, 7.8, .6, 6.2, 1.3, { bob: .1 });
  Q.pumpkin(gd, -5.9, 0, 1.9, .5, { face: true }); Q.leafPile(gd, -5.8, 0, 1.8, 1.0);
  // 釜と魔女の帽子
  Q.cauldron(gd, 3.3, 0, 6.8, 1.9); Q.cauldron(gd, 5.9, 0, 7.4, 1.4); Q.witchHat(gd, 7.0, 0, 5.2, 1.4, C.ink, C.rose, .4);
  // パラソルテーブルのお菓子
  Q.candyBowl(gd, 7.4, .77, 2.2, 1.1); Q.skullMug(gd, 7.7, .77, 2.4, 1.1);
  // フェンスのかぼちゃ
  [[-4.5, 7.1], [-1.5, 7.1], [1.0, 7.1], [4.5, 7.1], [7.0, 8.2], [11.0, 8.2]].forEach(([x, z], i) => Q.pumpkin(gd, x, .45, z, .4, { face: i % 2 === 0, color: i % 3 === 0 ? 0xfff1dc : C.orange }));
  // こうもりの群れ（空を周回）と落ち葉
  [[3.0, 8.6, 0, 3.2, .7, 0], [3.0, 9.6, -1, 5.5, -.55, 2], [6.5, 7.4, 3, 4.5, .6, 4], [-2, 7.8, 2, 3.8, -.65, 1], [8.0, 9.2, 0, 6.5, .45, 3], [0, 8.0, 0, 7.5, -.4, 5]].forEach(([cx, cy, cz, r, spd, ph], i) =>
    Q.bat(gd, cx, cy, cz, 1.7, { fly: { cx, cy, cz, r, spd, ph } }));
  Q.fallingLeaves(gd, 54);
}
