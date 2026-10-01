// もちたの「ふっくら・なめらか」形状を、なめらかに溶け合う楕円体で定義する（符号付き距離関数）。
// 寸法は元のGLB（高さ約2.0、体幅1.85、奥行き1.5、頭幅1.73、耳先2.02）から実測して合わせてある。
const sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
export const smin = (a, b, k) => { const h = max(k - abs(a - b), 0) / k; return min(a, b) - h * h * k * .25; };
export const smax = (a, b, k) => -smin(-a, -b, k);
// 楕円体（IQの近似SDF）。tz: z軸まわりの傾き
export function ell(x, y, z, cx, cy, cz, rx, ry, rz, tz = 0) {
  let dx = x - cx, dy = y - cy; const dz = z - cz;
  if (tz) { const c = Math.cos(-tz), s = Math.sin(-tz), nx = dx * c - dy * s; dy = dx * s + dy * c; dx = nx; }
  const k0 = sqrt((dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2) || 1e-9;
  const k1 = sqrt((dx / (rx * rx)) ** 2 + (dy / (ry * ry)) ** 2 + (dz / (rz * rz)) ** 2) || 1e-9;
  return k0 * (k0 - 1) / k1;
}
// 丸みのある円錐（耳）
export function roundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az, y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
export const P = { // 調整用パラメータ
  body: [0, .47, .40, 1.06, .56, .76], bodyCap: .93, bodyCapK: .22, head: [0, 1.18, .50, .86, .68, .55], blend: .30,
  cheek: [.60, 1.07, .56, .27, .23, .27], cheekK: .16,
  earBase: [.40, 1.58, .45], earTip: [.55, 1.97, .40], earR1: .21, earR2: .06, earK: .13,
  hand: [.36, .72, 1.0, .17, .24, .13, .45], handK: .035,
  floorY: .02, floorK: .08,
};
export function sdf(x, y, z) {
  const ax = abs(x), s = x < 0 ? -1 : 1; // 左右対称
  const bd = smax(ell(ax, y, z, ...P.body), ax - P.bodyCap, P.bodyCapK); // 体は少し四角く丸い
  let d = smin(bd, ell(ax, y, z, ...P.head), P.blend);
  d = smin(d, ell(ax, y, z, ...P.cheek), P.cheekK);
  d = smin(d, roundCone(ax, y, z, ...P.earBase, ...P.earTip, P.earR1, P.earR2), P.earK);
  const h = P.hand; d = smin(d, ell(ax, y, z, h[0], h[1], h[2], h[3], h[4], h[5], h[6]), P.handK);
  return smax(d, P.floorY - y, P.floorK);
}
