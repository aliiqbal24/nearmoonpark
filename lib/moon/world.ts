import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SCALE,
  box,
  cylinder,
  sphere,
  label,
  material,
  astronaut,
  rocket,
  createBuilding,
  type AnimatedModel,
} from "./assets";
import {
  WIDTH,
  HEIGHT,
  footprint,
  entrance,
  walkingRoute,
  type Run,
  type Placement,
  type Detail,
} from "./model";

type Options = {
  onPick: (d: Detail | null) => void;
  onHover: (d: Detail | null) => void;
  onPlace: (x: number, z: number) => void;
  onReady: () => void;
};
export class MoonWorld {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera: T.PerspectiveCamera;
  controls: OrbitControls;
  private host: HTMLElement;
  private opts: Options;
  private frame = 0;
  private resize: ResizeObserver;
  private models = new Map<number, AnimatedModel>();
  private people = new Map<number, T.Group>();
  private deliveries = new Map<number, T.Group>();
  private run: Run | null = null;
  private placement: Placement | null = null;
  private ghost = new T.Group();
  private grid: T.GridHelper;
  private paths: T.InstancedMesh;
  private pathSignature = "";
  private ray = new T.Raycaster();
  private mouse = new T.Vector2();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private pointer = new T.Vector3();
  private down = { x: 0, y: 0 };
  private cell = { x: 0, z: 0 };
  private hovered: Detail | null = null;
  private selected: number | null = null;
  private selection: T.LineSegments;
  private lander: T.Group;
  private cockpit = new T.Group();
  private founder: T.Group;
  private gagRobot = new T.Group();
  private popcorn: T.Object3D[] = [];
  private last = 0;
  private time = 0;
  private speed = 1;
  private cinematic: number | null = null;
  private rideId: number | null = null;
  private savedPosition = new T.Vector3();
  private lastTick = -1;
  private updateTime = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(host: HTMLElement, opts: Options) {
    this.host = host;
    this.opts = opts;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new T.Color("#101b30");
    this.scene.fog = new T.FogExp2("#202a43", 0.006);
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 250);
    this.camera.position.set(32, 28, 44);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 85;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.mouseButtons = {
      LEFT: T.MOUSE.PAN,
      MIDDLE: T.MOUSE.DOLLY,
      RIGHT: T.MOUSE.ROTATE,
    };
    this.controls.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_PAN };
    this.controls.screenSpacePanning = false;
    this.scene.add(this.camera);
    for (const x of [-3.8, 3.8])
      box(this.cockpit, "#273c50", x, 0, -5, 0.22, 6, 0.2);
    box(this.cockpit, "#273c50", 0, -2.25, -4.2, 8, 0.6, 1);
    const flightSign = label("NEAR LUNAR TRANSIT", "#a9e4d3", 2.2);
    flightSign.position.set(0, -1.8, -4);
    this.cockpit.add(flightSign);
    this.cockpit.visible = false;
    this.camera.add(this.cockpit);
    this.scene.add(new T.HemisphereLight("#bfd6ff", "#55516c", 2.2));
    const sun = new T.DirectionalLight("#fff0d6", 3.8);
    sun.position.set(-20, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    const rim = new T.DirectionalLight("#6db8ed", 1);
    rim.position.set(20, 8, -25);
    this.scene.add(rim);
    this.environment();
    this.paths = new T.InstancedMesh(
      new T.BoxGeometry(1.2, 0.065, 1.2),
      material("#d8cbb2"),
      WIDTH * HEIGHT,
    );
    this.paths.count = 0;
    this.paths.receiveShadow = true;
    this.scene.add(this.paths);
    this.grid = new T.GridHelper(WIDTH * SCALE, WIDTH, "#c8e4e8", "#9aa4b6");
    this.grid.position.y = 0.18;
    this.grid.visible = false;
    (this.grid.material as T.Material).transparent = true;
    (this.grid.material as T.Material).opacity = 0.3;
    this.scene.add(this.grid);
    this.scene.add(this.ghost);
    this.selection = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(1, 0.12, 1)),
      new T.LineBasicMaterial({ color: "#ffdf8e" }),
    );
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.lander = rocket();
    this.lander.position.set(0, 0.1, 22);
    this.scene.add(this.lander);
    const pad = new T.Group();
    cylinder(pad, "#343e55", 0, 0, 0, 4.3, 0.18);
    const ring = new T.Mesh(
      new T.TorusGeometry(3.5, 0.08, 6, 48),
      new T.MeshBasicMaterial({ color: "#8eddd3" }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    pad.add(ring);
    pad.position.set(0, 0, 22);
    this.scene.add(pad);
    const gate = new T.Group();
    box(gate, "#c4cbd6", -1.8, 1.6, 0, 0.3, 3.2, 0.5);
    box(gate, "#c4cbd6", 1.8, 1.6, 0, 0.3, 3.2, 0.5);
    const sign = label("MOONPARK", "#f6d991", 5);
    sign.position.y = 3;
    gate.add(sign);
    gate.position.set(-0.6, 0, 15.1);
    this.scene.add(gate);
    this.founder = astronaut("#a9e4d3", 1.5);
    this.founder.position.set(2, 0.2, 15.7);
    this.scene.add(this.founder);
    box(this.gagRobot, "#e4b17d", 0, 0.35, 0, 0.7, 0.5, 0.7);
    sphere(this.gagRobot, "#334d64", 0, 0.8, 0, 0.3);
    box(this.gagRobot, "#d6dde4", 0, 0.7, 0.4, 1, 0.08, 0.6);
    for (let i = 0; i < 25; i++) {
      const piece = sphere(this.gagRobot, "#fff0c2", 0, 2, 0, 0.07);
      this.popcorn.push(piece);
    }
    this.gagRobot.position.set(3, 0.2, 13.5);
    this.gagRobot.visible = false;
    this.scene.add(this.gagRobot);
    for (let z = 15; z < 21; z++)
      box(this.scene, "#c9c6bd", 0, 0.03, z, 2.5, 0.07, 0.9);
    this.resize = new ResizeObserver(() => this.layout());
    this.resize.observe(host);
    this.layout();
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.pointerDown);
    el.addEventListener("pointermove", this.pointerMove);
    el.addEventListener("pointerup", this.pointerUp);
    el.addEventListener("pointerleave", this.pointerLeave);
    el.addEventListener("contextmenu", this.contextMenu);
    window.addEventListener("keydown", this.keyDown);
    this.frame = requestAnimationFrame(this.animate);
    opts.onReady();
  }
  private environment() {
    const ground = new T.Mesh(
      new T.PlaneGeometry(220, 220),
      material("#8c8b9c"),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    box(
      this.scene,
      "#555c73",
      0,
      -0.07,
      0,
      WIDTH * SCALE + 0.8,
      0.25,
      HEIGHT * SCALE + 0.8,
    );
    box(this.scene, "#9597a7", 0, 0.04, 0, WIDTH * SCALE, 0.08, HEIGHT * SCALE);
    let seed = 90210;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 110; i++) {
      const x = (rand() - 0.5) * 140,
        z = (rand() - 0.5) * 130;
      if (Math.abs(x) < 23 && z > -19 && z < 28) continue;
      const r = 0.3 + rand() * 1.8;
      const rock = new T.Mesh(
        new T.DodecahedronGeometry(r, 0),
        material(i % 2 ? "#77798b" : "#a4a1ad"),
      );
      rock.position.set(x, r * 0.2 - 0.2, z);
      rock.scale.y = 0.5 + rand() * 0.4;
      rock.rotation.set(rand(), rand(), rand());
      rock.castShadow = true;
      this.scene.add(rock);
    }
    for (let i = 0; i < 9; i++) {
      const crater = new T.Mesh(
        new T.TorusGeometry(3 + rand() * 5, 0.3 + rand() * 0.5, 6, 32),
        material("#72778c"),
      );
      crater.rotation.x = -Math.PI / 2;
      crater.scale.z = 0.5;
      crater.position.set((rand() - 0.5) * 120, -0.12, -24 - rand() * 50);
      this.scene.add(crater);
    }
    for (let x = -20; x <= 20; x += 4)
      for (const z of [-15.7, 15.7]) {
        cylinder(this.scene, "#d2cbd1", x, 0.5, z, 0.055, 1);
        sphere(this.scene, "#ffd591", x, 1, z, 0.1);
      }
    for (let z = -12; z < 14; z += 4)
      for (const x of [-20.7, 20.7]) {
        cylinder(this.scene, "#d2cbd1", x, 0.5, z, 0.055, 1);
        sphere(this.scene, "#8eddd3", x, 1, z, 0.1);
      }
    const stars = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      stars[i * 3] = (rand() - 0.5) * 220;
      stars[i * 3 + 1] = 20 + rand() * 100;
      stars[i * 3 + 2] = -35 - rand() * 90;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(stars, 3));
    this.scene.add(
      new T.Points(
        geo,
        new T.PointsMaterial({
          color: "#deeaff",
          size: 0.13,
          sizeAttenuation: true,
        }),
      ),
    );
    const earth = new T.Mesh(
      new T.SphereGeometry(7, 48, 32),
      new T.MeshBasicMaterial({ color: "#ffffff" }),
    );
    earth.position.set(0, 10, -42);
    earth.rotation.y = -1.5;
    this.scene.add(earth);
    new T.TextureLoader().load("/textures/earth.jpg", (tex) => {
      tex.colorSpace = T.SRGBColorSpace;
      (earth.material as T.MeshBasicMaterial).map = tex;
      earth.material.needsUpdate = true;
    });
    const atmosphere = new T.Mesh(
      new T.SphereGeometry(7.15, 32, 24),
      new T.MeshBasicMaterial({
        color: "#8ed8ff",
        transparent: true,
        opacity: 0.12,
        side: T.BackSide,
      }),
    );
    atmosphere.position.copy(earth.position);
    this.scene.add(atmosphere);
    const observatory = new T.Group();
    cylinder(observatory, "#d2d7dd", 0, 1, 0, 3, 2);
    const dome = sphere(observatory, "#8bb1cf", 0, 2, 0, 3);
    dome.scale.y = 0.6;
    const sign = label("A NEAR FUTURE", "#adf0df", 4);
    sign.position.set(0, 4, 0);
    observatory.add(sign);
    observatory.position.set(29, 0, -14);
    this.scene.add(observatory);
  }
  private layout() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  update(
    run: Run,
    speed: number,
    placement: Placement | null,
    selected: number | null,
    cinematic: number | null,
    rideId: number | null,
  ) {
    const returnToPark =
      (this.cinematic !== null && cinematic === null) ||
      (this.rideId !== null && rideId === null);
    this.speed = speed;
    this.cinematic = cinematic;
    this.rideId = rideId;
    this.controls.enabled = cinematic === null && rideId === null;
    if (returnToPark) this.home();
    if (this.run !== run) {
      this.run = run;
      this.updateTime = performance.now();
      if (this.lastTick !== run.tick) {
        this.lastTick = run.tick;
      }
      this.sync();
    }
    this.selected = selected;
    const b = run.buildings.find((b) => b.id === selected && !b.sold);
    this.selection.visible = !!b;
    if (b) {
      const { w, h } = footprint(b);
      this.selection.scale.set(w * SCALE, 1, h * SCALE);
      this.selection.position.set(
        (b.x + w / 2 - WIDTH / 2) * SCALE,
        0.23,
        (b.z + h / 2 - HEIGHT / 2) * SCALE,
      );
    }
    if (JSON.stringify(placement) !== JSON.stringify(this.placement)) {
      this.placement = placement;
      this.grid.visible = !!placement;
      while (this.ghost.children.length)
        this.ghost.remove(this.ghost.children[0]);
      if (placement) {
        const b = {
          ...placement,
          kind:
            placement.kind === "path" || placement.kind === "erase"
              ? "food"
              : placement.kind,
        };
        const size =
          placement.kind === "path" || placement.kind === "erase"
            ? { w: 1, h: 1 }
            : footprint(b);
        const m = new T.Mesh(
          new T.BoxGeometry(size.w * SCALE, 0.3, size.h * SCALE),
          new T.MeshBasicMaterial({
            color: "#a5f6dd",
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
          }),
        );
        this.ghost.add(m);
        if (placement.kind !== "path" && placement.kind !== "erase") {
          const e = entrance({
            ...placement,
            kind: placement.kind,
            x: 0,
            z: 0,
          });
          const entry = new T.Mesh(
            new T.BoxGeometry(0.9, 0.12, 0.9),
            new T.MeshBasicMaterial({
              color: "#f4cd80",
              transparent: true,
              opacity: 0.85,
            }),
          );
          entry.position.set(
            (e.x + 0.5 - size.w / 2) * SCALE,
            0.15,
            (e.z + 0.5 - size.h / 2) * SCALE,
          );
          this.ghost.add(entry);
        }
        this.moveGhost();
      }
    }
  }
  private sync() {
    if (!this.run) return;
    const run = this.run;
    const signature = run.paths.join(",");
    if (signature !== this.pathSignature) {
      this.pathSignature = signature;
      const mat = new T.Matrix4();
      run.paths.forEach((c, i) => {
        mat.makeTranslation(
          ((c % WIDTH) + 0.5 - WIDTH / 2) * SCALE,
          0.15,
          (Math.floor(c / WIDTH) + 0.5 - HEIGHT / 2) * SCALE,
        );
        this.paths.setMatrixAt(i, mat);
      });
      this.paths.count = run.paths.length;
      this.paths.instanceMatrix.needsUpdate = true;
    }
    const ids = new Set(run.buildings.filter((b) => !b.sold).map((b) => b.id));
    for (const [id, m] of this.models)
      if (!ids.has(id)) {
        this.scene.remove(m.root);
        this.models.delete(id);
      }
    for (const b of run.buildings) {
      if (b.sold) continue;
      let m = this.models.get(b.id);
      const signature = `${b.kind}:${b.rotation}:${b.variant}:${b.x}:${b.z}`;
      if (m && m.root.userData.signature !== signature) {
        this.scene.remove(m.root);
        this.models.delete(b.id);
        m = undefined;
      }
      if (!m) {
        m = createBuilding(b);
        m.root.userData.signature = signature;
        const { w, h } = footprint(b);
        m.root.position.set(
          (b.x + w / 2 - WIDTH / 2) * SCALE,
          0.18,
          (b.z + h / 2 - HEIGHT / 2) * SCALE,
        );
        m.root.traverse((o) => (o.userData.building = b.id));
        this.scene.add(m.root);
        this.models.set(b.id, m);
      }
      const progress = Math.min(
        1,
        Math.max(0.12, 1 - (b.ready_at - run.tick) / 15),
      );
      m.root.scale.y = progress;
    }
  }
  private moveGhost() {
    if (!this.placement) return;
    const size =
      this.placement.kind === "path" || this.placement.kind === "erase"
        ? { w: 1, h: 1 }
        : footprint({ ...this.placement, kind: this.placement.kind });
    this.ghost.position.set(
      (this.cell.x + size.w / 2 - WIDTH / 2) * SCALE,
      0.25,
      (this.cell.z + size.h / 2 - HEIGHT / 2) * SCALE,
    );
    this.ghost.visible =
      this.cell.x >= 0 &&
      this.cell.z >= 0 &&
      this.cell.x + size.w <= WIDTH &&
      this.cell.z + size.h <= HEIGHT;
    const occupied = (x: number, z: number) =>
      this.run?.buildings.some((b) => {
        const f = footprint(b);
        return (
          !b.sold && x >= b.x && x < b.x + f.w && z >= b.z && z < b.z + f.h
        );
      });
    let valid = this.ghost.visible;
    for (let z = this.cell.z; z < this.cell.z + size.h; z++)
      for (let x = this.cell.x; x < this.cell.x + size.w; x++)
        if (
          occupied(x, z) ||
          (this.placement.kind !== "path" &&
            this.placement.kind !== "erase" &&
            this.run?.paths.includes(z * WIDTH + x))
        )
          valid = false;
    if (
      this.placement.kind !== "path" &&
      this.placement.kind !== "erase" &&
      (this.cell.x < 1 ||
        this.cell.z < 1 ||
        this.cell.x + size.w >= WIDTH ||
        this.cell.z + size.h >= HEIGHT)
    )
      valid = false;
    const mesh = this.ghost.children[0] as
      T.Mesh<T.BoxGeometry, T.MeshBasicMaterial> | undefined;
    mesh?.material.color.set(valid ? "#a5f6dd" : "#ed9b91");
  }
  private pointerDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
  };
  private pointerMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.mouse, this.camera);
    if (this.ray.ray.intersectPlane(this.plane, this.pointer)) {
      this.cell = {
        x: Math.floor(this.pointer.x / SCALE + WIDTH / 2),
        z: Math.floor(this.pointer.z / SCALE + HEIGHT / 2),
      };
      this.moveGhost();
    }
    if (this.placement) {
      this.opts.onHover(null);
      return;
    }
    const candidates = [...this.models.values()]
      .map((m) => m.root)
      .concat([...this.people.values()].filter((p) => p.visible));
    const hit = this.ray.intersectObjects(candidates, true)[0];
    let detail: Detail | null = null;
    if (hit) {
      const data = hit.object.userData;
      if (data.building)
        detail = {
          kind: "building",
          id: data.building,
          x: e.clientX,
          y: e.clientY,
        };
      else if (data.guest !== undefined)
        detail = { kind: "guest", id: data.guest, x: e.clientX, y: e.clientY };
    }
    this.hovered = detail;
    this.opts.onHover(detail);
    this.renderer.domElement.style.cursor = detail ? "pointer" : "grab";
  };
  private pointerUp = (e: PointerEvent) => {
    if (
      Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 7 ||
      e.button !== 0
    )
      return;
    this.pointerMove(e);
    if (this.placement) this.opts.onPlace(this.cell.x, this.cell.z);
    else this.opts.onPick(this.hovered);
  };
  private pointerLeave = () => {
    this.opts.onHover(null);
    this.ghost.visible = false;
  };
  private contextMenu = (e: Event) => e.preventDefault();
  private keyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.matches("input,textarea,select")) return;
    const step = 1.5;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
        dz = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      this.camera.position.x += dx;
      this.camera.position.z += dz;
      this.controls.target.x += dx;
      this.controls.target.z += dz;
    }
    if (e.key === "Home") this.home();
  };
  home() {
    this.camera.position.set(32, 28, 44);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
  zoom(factor: number) {
    const d = this.camera.position
      .clone()
      .sub(this.controls.target)
      .multiplyScalar(factor);
    this.camera.position.copy(this.controls.target).add(d);
    this.controls.update();
  }
  project(x: number, z: number) {
    const p = new T.Vector3(
      (x + 0.5 - WIDTH / 2) * SCALE,
      0.2,
      (z + 0.5 - HEIGHT / 2) * SCALE,
    ).project(this.camera);
    const r = this.host.getBoundingClientRect();
    return { x: ((p.x + 1) / 2) * r.width, y: ((1 - p.y) / 2) * r.height };
  }
  private animate = (now: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const dt = Math.min(0.06, (now - this.last) / 1000 || 0);
    this.last = now;
    this.time += dt;
    const run = this.run;
    this.cockpit.visible = this.cinematic !== null && this.cinematic < 9;
    this.gagRobot.visible =
      this.cinematic !== null && this.cinematic >= 30 && this.cinematic < 35;
    this.founder.rotation.y = 0;
    (this.founder.userData.arms[1] as T.Object3D).rotation.z =
      -0.8 + Math.sin(this.time * 5) * 0.25;
    if (this.gagRobot.visible) {
      const t = this.cinematic! - 30;
      this.gagRobot.rotation.z = Math.sin(t * 9) * 0.07;
      this.popcorn.forEach((p, i) => {
        const start = i * 0.07,
          fall = Math.max(0, t - start);
        p.position.set(
          Math.sin(i * 4.1) * (0.1 + Math.min(1, fall)),
          Math.max(0.1, 2.7 - fall * fall * 2) +
            (fall > 1.1 ? Math.abs(Math.sin(fall * 9 + i)) * 0.12 : 0),
          0.35 + Math.cos(i * 3.2) * Math.min(0.8, fall * 0.4),
        );
      });
    }
    if (run) {
      const visual = run.tick + ((now - this.updateTime) / 1000) * this.speed;
      for (const b of run.buildings) {
        const m = this.models.get(b.id);
        if (m && !b.sold)
          m.animate(
            visual,
            b,
            run.finished
              ? Math.min(b.cycle_left, (now - this.updateTime) / 1000)
              : Math.min(1, ((now - this.updateTime) / 1000) * this.speed),
          );
      }
      this.animateGuests(run, dt, visual);
      this.animateDeliveries(run, visual);
      const phase = visual % 90;
      this.lander.position.y =
        phase > 80 ? Math.pow((phase - 80) / 10, 2) * 22 : 0.1;
      const flame = this.lander.userData.flame as T.Mesh;
      flame.visible = phase > 78;
      flame.scale.y = 1 + Math.sin(this.time * 25) * 0.2;
      if (this.cinematic !== null) this.introCamera(this.cinematic);
      else if (this.rideId !== null) {
        const b = run.buildings.find((b) => b.id === this.rideId);
        const m = this.models.get(this.rideId);
        if (b && m?.curve) {
          const u = (this.time / 20) % 1;
          const p = m.curve.getPointAt(u),
            ahead = m.curve.getPointAt((u + 0.015) % 1);
          m.root.children[0].localToWorld(p);
          m.root.children[0].localToWorld(ahead);
          this.camera.position.copy(p).add(new T.Vector3(0, 0.7, 0));
          this.camera.lookAt(ahead.add(new T.Vector3(0, 0.65, 0)));
        }
      }
    }
    if (this.cinematic === null && this.rideId === null) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  private animateGuests(run: Run, dt: number, time: number) {
    for (const g of run.guests) {
      const visible = !["upcoming", "gone", "riding"].includes(g.status);
      let p = this.people.get(g.id);
      if (!visible) {
        if (p) p.visible = false;
        continue;
      }
      if (!p) {
        p = astronaut(
          ["#f3be82", "#8eddd3", "#bc9fe9"][g.group],
          g.group === 0 ? 0.8 : 1,
        );
        p.traverse((o) => (o.userData.guest = g.id));
        this.scene.add(p);
        this.people.set(g.id, p);
        const x = ((g.cell % WIDTH) + 0.5 - WIDTH / 2) * SCALE,
          z = (Math.floor(g.cell / WIDTH) + 0.5 - HEIGHT / 2) * SCALE;
        p.position.set(x, 0.2, z);
      }
      p.visible = true;
      let x = ((g.cell % WIDTH) + 0.5 - WIDTH / 2) * SCALE,
        z = (Math.floor(g.cell / WIDTH) + 0.5 - HEIGHT / 2) * SCALE;
      if (g.status === "queueing") {
        const b = run.buildings.find((b) => b.id === g.target);
        const index = b?.queue.indexOf(g.id) ?? 0;
        x += ((index % 3) - 1) * 0.25;
        z += Math.floor(Math.max(0, index) / 3) * 0.3;
      } else {
        x += Math.sin(g.id * 12.3) * 0.15;
        z += Math.cos(g.id * 7.1) * 0.15;
      }
      const target = new T.Vector3(x, 0.22, z),
        d = target.clone().sub(p.position);
      if (d.length() > 0.04) p.rotation.y = Math.atan2(d.x, d.z);
      p.position.lerp(target, Math.min(1, dt * Math.max(5, this.speed * 5)));
      p.position.y =
        0.22 +
        (g.status === "walking"
          ? Math.abs(Math.sin(time * 5 + g.id)) * 0.05
          : 0);
      for (let i = 0; i < 2; i++) {
        (p.userData.legs[i] as T.Object3D).rotation.x =
          g.status === "walking"
            ? Math.sin(time * 6 + g.id + i * Math.PI) * 0.35
            : 0;
      }
    }
  }
  private animateDeliveries(run: Run, time: number) {
    for (const b of run.buildings) {
      let d = this.deliveries.get(b.id);
      if (b.sold || b.delivery_qty === 0) {
        if (d) d.visible = false;
        continue;
      }
      if (!d) {
        d = new T.Group();
        box(d, "#c9d0d9", 0, 0.3, 0, 0.7, 0.35, 1);
        box(d, "#8eddd3", 0, 0.65, -0.1, 0.65, 0.4, 0.5);
        const n = label("NEAR", "#9ce8d6", 0.7);
        n.position.set(0, 1, 0);
        d.add(n);
        this.scene.add(d);
        this.deliveries.set(b.id, d);
      }
      d.visible = true;
      const u = Math.min(1, Math.max(0, 1 - (b.delivery_at - time) / 15));
      if (d.userData.paths !== this.pathSignature) {
        const entry = entrance(b);
        d.userData.route = walkingRoute(
          run,
          23 * WIDTH + 15,
          entry.z * WIDTH + entry.x,
        );
        d.userData.paths = this.pathSignature;
      }
      const route = d.userData.route as number[];
      if (!route.length) {
        d.visible = false;
        continue;
      }
      const index = u * (route.length - 1),
        from = route[Math.floor(index)],
        to = route[Math.min(route.length - 1, Math.floor(index) + 1)],
        fraction = index - Math.floor(index);
      d.position.set(
        (T.MathUtils.lerp(from % WIDTH, to % WIDTH, fraction) +
          0.5 -
          WIDTH / 2) *
          SCALE,
        0.25,
        (T.MathUtils.lerp(
          Math.floor(from / WIDTH),
          Math.floor(to / WIDTH),
          fraction,
        ) +
          0.5 -
          HEIGHT / 2) *
          SCALE,
      );
      if (from !== to)
        d.rotation.y = Math.atan2(
          (to % WIDTH) - (from % WIDTH),
          Math.floor(to / WIDTH) - Math.floor(from / WIDTH),
        );
    }
  }
  private introCamera(t: number) {
    if (this.reducedMotion) {
      this.camera.position.set(32, 28, 44);
      this.camera.lookAt(0, 0, 0);
      this.cockpit.visible = false;
      return;
    }
    const coaster = [...this.models.values()].find((m) => !!m.curve);
    if (t < 9) {
      this.camera.position.set(
        T.MathUtils.lerp(2, 4, t / 9),
        4,
        T.MathUtils.lerp(45, 28, t / 9),
      );
      this.camera.lookAt(-8, 9, -30);
    } else if (t < 12) {
      this.camera.position.set(3, 2.6, 19.8);
      this.camera.lookAt(2, 1.1, 15.7);
    } else if (t < 17) {
      const u = (t - 12) / 5;
      this.camera.position.set(
        T.MathUtils.lerp(26, 20, u),
        T.MathUtils.lerp(22, 15, u),
        T.MathUtils.lerp(29, 12, u),
      );
      this.camera.lookAt(0, 1, 0);
    } else if (t < 30 && coaster?.curve) {
      const u = (((t - 17) / 13) * 0.9 + 0.07) % 1;
      const p = coaster.curve.getPointAt(u),
        a = coaster.curve.getPointAt((u + 0.015) % 1);
      coaster.root.children[0].localToWorld(p);
      coaster.root.children[0].localToWorld(a);
      this.camera.position.copy(p).add(new T.Vector3(0, 0.65, 0));
      this.camera.lookAt(a.add(new T.Vector3(0, 0.6, 0)));
    } else if (t < 35) {
      this.camera.position.set(5, 2.4, 17.5);
      this.camera.lookAt(3, 0.85, 13.5);
    } else {
      const u = Math.min(1, (t - 35) / 5);
      this.camera.position.set(25 + u * 7, 12 + u * 16, 25 + u * 19);
      this.camera.lookAt(0, 1, 0);
    }
  }
  dispose() {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.controls.dispose();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.pointerDown);
    el.removeEventListener("pointermove", this.pointerMove);
    el.removeEventListener("pointerup", this.pointerUp);
    el.removeEventListener("pointerleave", this.pointerLeave);
    el.removeEventListener("contextmenu", this.contextMenu);
    window.removeEventListener("keydown", this.keyDown);
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry?.dispose();
    });
    this.renderer.dispose();
    el.remove();
  }
}
