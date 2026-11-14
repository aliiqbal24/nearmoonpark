import * as T from "three";
import type { Guest, Run } from "./model";

export function guestEmotion(guest: Guest, run: Run): string | null {
  const thought = guest.thought.toLowerCase();
  if (/too expensive/.test(thought)) return "Too expensive";
  if (/gentler launch|too high|too intense/.test(thought)) return "Too high!";
  if (/little tame|bigger launch/.test(thought)) return "More thrills!";
  if (/worth the trip|best day/.test(thought)) return "Amazing!";
  if (/queue is eating/.test(thought)) return "Long queue…";
  if (/affordable/.test(thought)) {
    const rides = run.buildings.filter(
      (b) =>
        !b.sold &&
        b.connected &&
        ["coaster", "wheel", "bounce", "rover"].includes(b.kind),
    );
    return rides.length && rides.every((b) => b.price > guest.cash)
      ? "Too expensive"
      : "Shorter queue?";
  }
  if (guest.hunger >= 60 || /need a snack/.test(thought)) return "Hungry…";
  if (guest.thirst >= 60 || /need a drink/.test(thought)) return "Thirsty…";
  if (guest.satisfaction >= 85 && guest.visits > 0) return "So happy!";
  const target = run.buildings.find((b) => b.id === guest.target);
  if (target && ["coaster", "bounce", "wheel", "rover"].includes(target.kind))
    return "Can’t wait!";
  if (/just what i needed/.test(thought)) return "Much better!";
  return null;
}

type Bubble = { sprite: T.Sprite; guest: number; began: number; text: string };
export class GuestThoughts {
  private root = new T.Group();
  private textures = new Map<string, T.CanvasTexture>();
  private bubbles: Bubble[] = [];
  private lastShown = new Map<number, number>();
  private nextAt = 4;
  private cursor = 0;
  constructor(scene: T.Scene) {
    this.root.name = "visitor-thought-bubbles";
    for (let i = 0; i < 3; i++) {
      const sprite = new T.Sprite(
        new T.SpriteMaterial({
          transparent: true,
          depthWrite: false,
          sizeAttenuation: false,
          toneMapped: false,
        }),
      );
      sprite.center.set(0.5, 0);
      sprite.visible = false;
      sprite.renderOrder = 10;
      this.root.add(sprite);
      this.bubbles.push({ sprite, guest: -1, began: -10, text: "" });
    }
    scene.add(this.root);
  }
  private texture(text: string) {
    let texture = this.textures.get(text);
    if (texture) return texture;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 176;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff4dc";
    ctx.strokeStyle = "#467c75";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 136, 34);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(238, 139);
    ctx.lineTo(256, 169);
    ctx.lineTo(274, 139);
    ctx.fill();
    ctx.fillStyle = "#233b44";
    ctx.font = "600 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 77, 460);
    texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    this.textures.set(text, texture);
    return texture;
  }
  update(
    run: Run,
    people: Map<number, T.Group>,
    camera: T.PerspectiveCamera,
    height: number,
    time: number,
    active: boolean,
  ) {
    this.root.visible = active;
    if (!active) return;
    const available = this.bubbles.find((b) => time - b.began >= 3.4);
    if (available && time >= this.nextAt) {
      const guests = run.guests.filter(
        (g) =>
          people.get(g.id)?.visible &&
          ["walking", "queueing", "leaving"].includes(g.status),
      );
      for (let n = 0; n < guests.length; n++) {
        const guest = guests[(this.cursor + n) % guests.length];
        const text = guestEmotion(guest, run);
        if (
          !text ||
          time - (this.lastShown.get(guest.id) ?? -30) < 22 ||
          this.bubbles.some((b) => b.guest === guest.id && time - b.began < 3.4)
        )
          continue;
        const projected = people
          .get(guest.id)!
          .position.clone()
          .project(camera);
        if (
          Math.abs(projected.x) > 0.84 ||
          Math.abs(projected.y) > 0.7 ||
          projected.z > 1
        )
          continue;
        available.guest = guest.id;
        available.began = time;
        available.text = text;
        available.sprite.material.map = this.texture(text);
        available.sprite.material.needsUpdate = true;
        this.lastShown.set(guest.id, time);
        this.cursor = (this.cursor + n + 1) % Math.max(1, guests.length);
        this.nextAt = time + 1.8;
        break;
      }
    }
    const unitsPerPixel =
      (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) /
      Math.max(1, height);
    for (const bubble of this.bubbles) {
      const person = people.get(bubble.guest);
      const age = time - bubble.began;
      bubble.sprite.visible = !!person?.visible && age < 3.4;
      if (!bubble.sprite.visible || !person) continue;
      bubble.sprite.position
        .copy(person.position)
        .add(new T.Vector3(0, 1.72, 0));
      bubble.sprite.scale.set(unitsPerPixel * 91, unitsPerPixel * 31, 1);
      bubble.sprite.material.opacity = Math.min(
        1,
        age / 0.2,
        (3.4 - age) / 0.4,
      );
    }
  }
  dispose() {
    this.root.removeFromParent();
    this.bubbles.forEach((b) => b.sprite.material.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
