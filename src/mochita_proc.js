// プログラムで作る、ふっくらなめらかなもちた（比較案）。形は mochita_sdf.js、色は参考画像から実測した正本色。
import * as THREE from 'three';
import { sdf } from './mochita_sdf.js';

const col = hex => new THREE.Color(hex);
// 正本（参考画像から実測した「見え方」）: 毛 #f5e3c9 / 模様 #cdae96 / 目鼻 #2e1b11 / 足裏 #e29a96
// ここは照明で明るくなる分を見込んだアルベド（描画結果が正本に近づくよう、実描画の画素値で較正）
export const CANON_HEX = { fur: '#f7e7cf', stripe: '#a18876', ink: '#2e1b11', sole: '#e29a96', feet: '#f6e6cd' };

function grad(x, y, z, e = .004) {
  const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l];
}
// サーフェスネット: 符号付き距離場から、均一で滑らかな面を作る
function surfaceNets(bounds, step) {
  const [x0, y0, z0, x1, y1, z1] = bounds, nx = Math.floor((x1 - x0) / step) + 1, ny = Math.floor((y1 - y0) / step) + 1, nz = Math.floor((z1 - z0) / step) + 1;
  const V = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[id(i, j, k)] = sdf(x0 + i * step, y0 + j * step, z0 + k * step);
  const cellIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [], edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0; for (let c = 0; c < 8; c++) { const v = V[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]); sx += (a & 1) + t * ((b & 1) - (a & 1)); sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1)); sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1)); n++; }
    cellIdx[cid(i, j, k)] = pos.length / 3; pos.push(x0 + (i + sx / n) * step, y0 + (j + sy / n) * step, z0 + (k + sz / n) * step);
  }
  // 頂点を表面へ押し戻して、さらに滑らかに
  for (let v = 0; v < pos.length; v += 3) for (let it = 0; it < 2; it++) { const d = sdf(pos[v], pos[v + 1], pos[v + 2]), g = grad(pos[v], pos[v + 1], pos[v + 2]); pos[v] -= g[0] * d; pos[v + 1] -= g[1] * d; pos[v + 2] -= g[2] * d; }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = V[id(i, j, k)] < 0, b = V[id(i + 1, j, k)] < 0; if (a !== b) quad(cellIdx[cid(i, j - 1, k - 1)], cellIdx[cid(i, j, k - 1)], cellIdx[cid(i, j, k)], cellIdx[cid(i, j - 1, k)], a); }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const a = V[id(i, j, k)] < 0, b = V[id(i, j + 1, k)] < 0; if (a !== b) quad(cellIdx[cid(i - 1, j, k - 1)], cellIdx[cid(i - 1, j, k)], cellIdx[cid(i, j, k)], cellIdx[cid(i, j, k - 1)], a); }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const a = V[id(i, j, k)] < 0, b = V[id(i, j, k + 1)] < 0; if (a !== b) quad(cellIdx[cid(i - 1, j - 1, k)], cellIdx[cid(i, j - 1, k)], cellIdx[cid(i, j, k)], cellIdx[cid(i - 1, j, k)], a); }
  // 向きをSDF勾配に合わせて揃える
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]], e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const g = grad((pos[a] + pos[b] + pos[c]) / 3, (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3);
    if (nrm[0] * g[0] + nrm[1] * g[1] + nrm[2] * g[2] < 0) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; }
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// おでこの模様（上が太く、下へ細くなる）。ふち(約1.2cm)はやわらかくにじませる
function stripeMask(x, y, z) {
  if (z < .35 || y < 1.58) return 0;
  const v = Math.min(1, Math.max(0, (y - 1.62) / .30)), hw = .012 + .085 * v, xc = .02 * (1 - v), dx = Math.abs(x - xc) - hw;
  return (1 - sm(-.004, .014, dx)) * sm(1.58, 1.64, y);
}
function surfaceZ(x, y) { let lo = -.4, hi = 1.6; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (sdf(x, y, m) < 0) lo = m; else hi = m; } return (lo + hi) / 2; }

export function buildProceduralMochita({ step = .03 } = {}) {
  const { pos, idx } = surfaceNets([-1.15, -.02, -.55, 1.15, 2.15, 1.35], step);
  const nrm = new Float32Array(pos.length);
  for (let v = 0; v < pos.length; v += 3) {
    const g = grad(pos[v], pos[v + 1], pos[v + 2]); nrm[v] = g[0]; nrm[v + 1] = g[1]; nrm[v + 2] = g[2];
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const root = new THREE.Group(); root.name = 'MochitaProcedural'; root.userData.styled = true;
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: col(CANON_HEX.fur), roughness: .5, metalness: 0, clearcoat: .35, clearcoatRoughness: .38, sheen: .25, sheenColor: new THREE.Color(0xfff0d8), sheenRoughness: .7 });
  // おでこの模様は画素ごとに描く（メッシュが粗くてもふちがくっきり）。上が太く下へ細い丸みのある台形。
  const stripeLin = col(CANON_HEX.stripe);
  bodyMat.onBeforeCompile = (sh) => {
    sh.uniforms.uStripe = { value: stripeLin };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMochPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMochPos = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMochPos;\nuniform vec3 uStripe;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      { float v = clamp((vMochPos.y - 1.60) / .30, 0., 1.); float hw = .018 + .092 * pow(v, .85); float xc = .016 * (1. - v);
        float dx = abs(vMochPos.x - xc) - hw; float m = (1. - smoothstep(-.003, .006, dx)) * smoothstep(1.595, 1.625, vMochPos.y) * smoothstep(.30, .40, vMochPos.z);
        diffuseColor.rgb = mix(diffuseColor.rgb, uStripe, m); }`);
  };
  const body = new THREE.Mesh(geo, bodyMat); body.name = 'Body'; root.add(body);
  const inkMat = new THREE.MeshPhysicalMaterial({ color: col(CANON_HEX.ink), roughness: .4, metalness: 0, clearcoat: .45, clearcoatRoughness: .3 });
  // 目: 表面にぴったり沿う小さな楕円体
  for (const sx of [-1, 1]) { const x = sx * .353, y = 1.34, z = surfaceZ(x, y), n = grad(x, y, z), e = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), inkMat); e.scale.set(.082, .096, .042); e.position.set(x - n[0] * .012, y - n[1] * .012, z - n[2] * .012); e.lookAt(e.position.x + n[0], e.position.y + n[1], e.position.z + n[2]); e.name = 'Eye'; root.add(e); }
  // 鼻: Y字（表面に沿った細いチューブ）
  const yPts = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, surfaceZ(x, y) + .006)));
  [[[-.082, 1.298], [-.04, 1.255], [0, 1.215]], [[.082, 1.298], [.04, 1.255], [0, 1.215]], [[0, 1.215], [0, 1.18], [0, 1.155]], [[-.04, 1.128], [-.018, 1.142], [0, 1.155]], [[.04, 1.128], [.018, 1.142], [0, 1.155]]].forEach(p => { const t = new THREE.Mesh(new THREE.TubeGeometry(yPts(p), 12, .016, 8), inkMat); t.name = 'Nose'; root.add(t); });
  [[-.082, 1.298], [.082, 1.298], [-.04, 1.128], [.04, 1.128]].forEach(([x, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.0165, 10, 8), inkMat); s.position.set(x, y, surfaceZ(x, y) + .006); root.add(s); });
  // 足（極短足）: 体の下にちょこんと。足裏のピンクは立ち姿では見えない
  const footMat = new THREE.MeshPhysicalMaterial({ color: col(CANON_HEX.feet), roughness: .55, clearcoat: .2, clearcoatRoughness: .5 }), soleMat = new THREE.MeshStandardMaterial({ color: col(CANON_HEX.sole), roughness: .5 });
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), footMat); f.scale.set(.15, .075, .21); f.position.set(sx * .6, .08, .55); f.name = 'Foot'; root.add(f);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .01, 20), soleMat); s.scale.set(.12, 1, .17); s.position.set(sx * .6, .027, .55); root.add(s);
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  root.userData.stats = { vertices: pos.length / 3, triangles: idx.length / 3 };
  return root;
}
