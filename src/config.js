// もちたモデルの設定（README参照）。GLBは glTF Y-up、+Zが正面、床 Y=0。
export const MOCHITA = {
  standing: 'assets/mochita_standing_web.glb',   // カウンター用（静止）
  walk: 'assets/mochita_walk_web.glb',           // 歩行（タップで歩く）
  rawHeight: 2.0173492,                          // 元サイズの高さ(maxY)。表示倍率 = height / rawHeight
  height: 0.95,                                  // 箱庭での表示の高さ[m]
  walkClip: 'Mochita_Approved_v4_TinyFoot_Walk_3s',
  walkLoopSec: 3.0,
  walkRawSpeedZ: 0.10,
  playRate: 5,                                   // タップで歩くときの再生速度（トテトテ。前進速度は walkSpeed() で連動）                           // 元サイズで滑らない前進速度 (+Z 単位/秒)
};
// 表示サイズと再生速度に連動した、足が滑らない前進速度 [m/s]（h=0.95, rate=1 → 約0.04709）
export const walkSpeed = (h = MOCHITA.height, rate = 1) => MOCHITA.walkRawSpeedZ * (h / MOCHITA.rawHeight) * rate;
