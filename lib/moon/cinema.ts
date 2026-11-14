import * as T from "three";
import { EARTH_DIRECTION } from "./sky";
export const INTRO_SECONDS = 40;
export const INTRO_CUTS = [4, 9, 16, 21, 29, 33];
const ease = (n: number) => T.MathUtils.smoothstep(n, 0, 1);
const path = (points: number[][], u: number) =>
  new T.CatmullRomCurve3(
    points.map((p) => new T.Vector3(...(p as [number, number, number]))),
  ).getPoint(ease(u));
export const introCoasterProgress = (t: number) =>
  t < 4 ? 0.025 + 0.38 * (t / 4) ** 1.65 : 0.12 + ease((t - 21) / 8) * 0.76;
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
    fov = 46;
  if ((t < 4 || (t >= 21 && t < 29)) && coaster) {
    const u = introCoasterProgress(t);
    position = coaster.curve.getPointAt(u);
    target = coaster.curve.getPointAt((u + 0.022) % 1);
    coaster.frame.updateWorldMatrix(true, true);
    coaster.frame.localToWorld(position);
    coaster.frame.localToWorld(target);
    if (coaster.upAt)
      up.copy(coaster.upAt(u)).transformDirection(coaster.frame.matrixWorld);
    if (t < 4) {
      const tangent = target.clone().sub(position).normalize();
      const right = tangent.clone().cross(up).normalize();
      target.copy(position).addScaledVector(tangent, 0.5);
      position
        .addScaledVector(tangent, -3.5)
        .addScaledVector(right, 2.5)
        .addScaledVector(up, 1.1);
      target.addScaledVector(up, 0.5);
      up.set(0, 1, 0);
      fov = T.MathUtils.lerp(42, 58, ease(t / 4));
    } else {
      position.addScaledVector(up, 0.72);
      target.addScaledVector(up, 0.65);
      fov = 62;
    }
  } else if (t < 9) {
    const u = (t - 4) / 5;
    position = path(
      [
        [5, 7, 105],
        [3, 7.5, 92],
        [0, 8, 80],
      ],
      u,
    );
    target = position.clone().addScaledVector(EARTH_DIRECTION, 1000);
    fov = 29;
  } else if (t < 16) {
    const u = (t - 9) / 7;
    position = path(
      [
        [-12, 10, 39],
        [-8, 6, 36],
        [-4, 3.6, 32],
      ],
      u,
    );
    target = new T.Vector3(0, 30 * (1 - ease(u)) + 3.8, 22);
    fov = T.MathUtils.lerp(43, 49, ease(u));
  } else if (t < 21) {
    const u = (t - 16) / 5;
    position = path(
      [
        [0.1, 1.8, 19.6],
        [0.2, 2.0, 18.0],
        [0.0, 2.4, 15.9],
      ],
      u,
    );
    target = path(
      [
        [2.0, 1.9, 15.7],
        [1.2, 1.8, 14.8],
        [-8, 5.5, 0],
      ],
      u,
    );
    fov = T.MathUtils.lerp(46, 58, ease(u));
  } else if (t < 33) {
    const u = (t - 29) / 4;
    position = path(
      [
        [6.4, 2.7, 11.8],
        [5.7, 2.5, 11.4],
        [5.4, 2.45, 11.0],
      ],
      u,
    );
    target = new T.Vector3(3.95, 1.85, 8.8);
    fov = 43;
  } else {
    const u = (t - 33) / 7;
    position = path(
      [
        [-24, 10, 29],
        [7, 14, 39],
        [24, 24, 38],
      ],
      u,
    );
    target = new T.Vector3(-2 + ease(u) * 2, 1.2 * (1 - ease(u)), 4);
    fov = T.MathUtils.lerp(56, 50, ease(u));
  }
  // Editorial cuts stay clean. Only the first shot fades up from black.
  const fade = ease(t / 0.28);
  return { position, target, up, fov, fade };
}
