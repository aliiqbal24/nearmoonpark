import * as T from "three";
import { EARTH_DIRECTION } from "./sky";
export const INTRO_SECONDS = 40;
export const INTRO_CUTS = [6, 14, 21, 29, 33, 35];
const ease = (n: number) => {
  const t = T.MathUtils.clamp(n, 0, 1);
  return t * t * (3 - 2 * t);
};
const path = (points: number[][], u: number) =>
  new T.CatmullRomCurve3(
    points.map((p) => new T.Vector3(...(p as [number, number, number]))),
  ).getPoint(ease(u));
export function cinematicPose(
  t: number,
  coaster?: {
    curve: T.CatmullRomCurve3;
    frame: T.Object3D;
    upAt?: (u: number) => T.Vector3;
  },
) {
  const up = new T.Vector3(0, 1, 0);
  let position: T.Vector3,
    target: T.Vector3,
    fov = 44;
  if (t < 6) {
    const u = t / 6;
    position = path(
      [
        [6, 7, 110],
        [4, 7, 94],
        [0, 8, 80],
      ],
      u,
    );
    target = position.clone().addScaledVector(EARTH_DIRECTION, 1000);
    fov = 30;
  } else if (t < 14) {
    const u = (t - 6) / 8;
    position = path(
      [
        [-12, 12, 37],
        [-3, 9, 35],
        [8, 5, 34],
      ],
      u,
    );
    target = new T.Vector3(0, 32 * (1 - ease(u)) + 4.1, 22);
    fov = 44;
  } else if (t < 21) {
    const u = (t - 14) / 7;
    position = path(
      [
        [0, 1.55, 20.6],
        [4, 3.8, 21],
        [12, 6.5, 21],
        [23, 13, 17],
      ],
      u,
    );
    target = new T.Vector3(
      -0.6 - ease(u) * 0.4,
      T.MathUtils.lerp(2, 1.5, ease(u)),
      T.MathUtils.lerp(8, -1, ease(u)),
    );
    fov = T.MathUtils.lerp(52, 48, ease(u));
  } else if (t < 29 && coaster) {
    const u = 0.055 + ease((t - 21) / 8) * 0.79;
    position = coaster.curve.getPointAt(u % 1);
    target = coaster.curve.getPointAt((u + 0.018) % 1);
    coaster.frame.updateWorldMatrix(true, true);
    coaster.frame.localToWorld(position);
    coaster.frame.localToWorld(target);
    if (coaster.upAt)
      up.copy(coaster.upAt(u)).transformDirection(coaster.frame.matrixWorld);
    position.addScaledVector(up, 0.72);
    target.addScaledVector(up, 0.65);
    fov = 56;
  } else if (t < 33) {
    const u = (t - 29) / 4;
    position = path(
      [
        [1.2, 1.7, 20.5],
        [1.1, 1.65, 19.8],
        [1, 1.6, 18.8],
      ],
      u,
    );
    target = new T.Vector3(2, 1.8, 15.7);
    fov = 40;
  } else if (t < 35) {
    position = new T.Vector3(-4.7, 1.8, 24);
    target = new T.Vector3(-2, 1.3, 20.3);
    fov = 48;
  } else {
    const u = (t - 35) / 5;
    position = path(
      [
        [14, 10, 24],
        [24, 18, 32],
        [32, 28, 44],
      ],
      u,
    );
    target = new T.Vector3(0, T.MathUtils.lerp(1, 0, ease(u)), 0);
    fov = T.MathUtils.lerp(45, 50, ease(u));
  }
  let fade = 1;
  for (const c of INTRO_CUTS)
    if (Math.abs(t - c) < 0.16)
      fade = Math.min(fade, ease(Math.abs(t - c) / 0.16));
  fade *= ease(t / 0.8);
  return { position, target, up, fov, fade };
}
