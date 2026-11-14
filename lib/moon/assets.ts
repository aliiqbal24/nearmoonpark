import * as T from "three";
import { PALETTES } from "./parks";
import {
  coasterDuration,
  blueprint,
  footprint,
  defaultDesign,
  type Building,
} from "./model";
import { foundation } from "./resort-props";
import { kitchen, drinks, maintenance, solar } from "./shops";
import {
  massDriver,
  earthrise,
  lunarBounce,
  roverRally,
  type RideRig,
} from "./rides";
import { SCALE, glow, batchStatic, sphere, cylinder } from "./art-kit";
import { serviceRover } from "./spacecraft";
export { rocket, serviceRover } from "./spacecraft";
export {
  SCALE,
  material,
  palette,
  glass,
  glow,
  ring,
  batch,
  box,
  sphere,
  cylinder,
  beam,
  label,
  disposeObject,
} from "./art-kit";
export { astronaut } from "./characters";
export type AnimatedModel = {
  train?: T.Group;
  root: T.Group;
  animate: (time: number, b: Building, offset: number) => void;
  curve?: T.CatmullRomCurve3;
  upAt?: (u: number) => T.Vector3;
};

export function createBuilding(
  source: Building,
  parkPalette = 0,
): AnimatedModel {
  const b = { ...source, design: source.design ?? defaultDesign() };
  const a = blueprint(b.kind),
    root = new T.Group(),
    model = new T.Group();
  root.add(model);
  model.rotation.y = (-b.rotation * Math.PI) / 2;
  const f = footprint({ ...b, rotation: 0 }),
    w = f.w * SCALE,
    h = f.h * SCALE;
  const chosen = b.design.palette === 255 ? parkPalette : b.design.palette;
  const selected = PALETTES[chosen] ?? PALETTES[0];
  const primary = {
    bounce: "#8d59ba",
    wheel: "#d19028",
    rover: "#d96435",
    coaster: "#088f83",
    food: "#cf6048",
    drink: "#179db8",
    depot: "#527b83",
    solar: "#449d9b",
  }[b.kind];
  const colors = {
    ...selected,
    primary: chosen === 0 ? primary : selected.primary,
  };
  foundation(model, w, h, colors, b.design.style);
  let rig: RideRig | undefined;
  switch (b.kind) {
    case "coaster":
      rig = massDriver(model, b, colors, w, h);
      break;
    case "wheel":
      rig = earthrise(model, b, colors, w, h);
      break;
    case "bounce":
      rig = lunarBounce(model, b, colors, w, h);
      break;
    case "rover":
      rig = roverRally(model, b, colors, w, h);
      break;
    case "food":
      kitchen(model, b, colors);
      break;
    case "drink":
      drinks(model, b, colors);
      break;
    case "solar":
      solar(model, b, colors, w, h);
      break;
    case "depot": {
      const animateRobot = maintenance(
        model,
        b,
        colors,
        w,
        h,
        serviceRover(colors.primary),
      );
      rig = { animate: (time) => animateRobot(time) };
      break;
    }
  }
  if (b.kind === "coaster") model.scale.y = [0.72, 1, 1.22][b.design.height];
  if (b.design.lights > 0) {
    const lampColor = b.design.lights === 1 ? "#ffd18b" : colors.primary;
    for (const x of [-1, 1])
      for (const z of [-1, 1]) {
        cylinder(
          model,
          colors.dark,
          x * (w / 2 - 0.2),
          0.59,
          z * (h / 2 - 0.2),
          0.052,
          0.55,
        );
        sphere(
          model,
          lampColor,
          x * (w / 2 - 0.2),
          0.91,
          z * (h / 2 - 0.2),
          0.075,
        ).material = glow(lampColor);
      }
  }
  batchStatic(model);
  const animate = (time: number, state: Building, offset: number) => {
    const duration =
      state.kind === "coaster" ? coasterDuration(state) : a.cycle;
    const progress =
      duration > 0
        ? state.cycle_left > 0
          ? (duration - state.cycle_left + offset) / duration
          : state.riders.length > 0
            ? (time / duration) % 1
            : 0
        : 0;
    rig?.animate(state.powered ? time : 0, state, progress);
  };
  animate(0, b, 0);
  return {
    root,
    animate,
    train: rig?.train,
    curve: rig?.curve,
    upAt: rig?.upAt,
  };
}
