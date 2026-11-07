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
  isTenant,
  merchantOwner,
  type Run,
  type Placement,
  type Detail,
} from "./model";

import { cinematicPose } from "./cinema";
type Options = {
  autoStart?: boolean;
  onPick: (d: Detail | null) => void;
  onHover: (d: Detail | null) => void;
  onPlace: (x: number, z: number) => void;
  onReady: () => void;
};
export class MoonWorld {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  private sky = new T.Scene();
  private skyCamera = new T.PerspectiveCamera(50, 1, 1, 4000);
  private earth: T.Mesh | null = null;
  private manual = false;
  private paused = false;
  private dust: T.Points | null = null;
  private gangway: T.Group;

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
  private rideNose = new T.Group();
  private founder: T.Group;
  private gagRobot = new T.Group();
  private popcorn: T.Object3D[] = [];
  private last = 0;
  private time = 0;
  private speed = 1;
  private cinematic: number | null = null;
  private cinematicAt = 0;
  private rideId: number | null = null;
  private savedPosition = new T.Vector3();
  private lastTick = -1;
  private updateTime = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  constructor(host: HTMLElement, opts: Options) {
    this.host = host;
    this.manual = opts.autoStart === false;
    this.opts = opts;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, host.clientWidth < 800 ? 1.25 : 1.5),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    host.appendChild(this.renderer.domElement);
    this.renderer.autoClear = false;
    this.renderer.setClearColor("#03060c");
    this.scene.background = null;
    this.scene.fog = new T.Fog("#131722", 220, 1400);
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 2200);
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
    box(this.rideNose, "#eac478", 0, -0.76, -1.18, 1.65, 0.36, 0.6);
    box(this.rideNose, "#263a4d", 0, -0.55, -1.34, 1.35, 0.08, 0.08);
    this.rideNose.visible = false;
    this.camera.add(this.rideNose);
    this.scene.add(
      new T.HemisphereLight("#bfd6ff", "#55516c", this.manual ? 1.15 : 2.2),
    );
    const sun = new T.DirectionalLight("#fff0d6", 3.8);
    sun.position.set(-20, this.manual ? 22 : 40, 15);
    sun.castShadow = true;
    const shadowSize = this.manual
      ? 4096
      : host.clientWidth < 800
        ? 1024
        : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
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
    this.gangway = new T.Group();
    box(this.gangway, "#c1cbd2", 0, 0.2, 18.6, 1.5, 0.15, 7);
    for (const x of [-0.7, 0.7])
      box(this.gangway, "#8eddd3", x, 0.5, 18.6, 0.06, 0.6, 7);
    this.scene.add(this.gangway);
    const dustGeometry = new T.BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(80 * 3), 3),
    );
    this.dust = new T.Points(
      dustGeometry,
      new T.PointsMaterial({
        color: "#b4b1bf",
        size: 0.5,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.dust.position.set(0, 0.2, 22);
    this.scene.add(this.dust);
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
    if (!this.manual) this.frame = requestAnimationFrame(this.animate);
    opts.onReady();
  }
  private environment() {
    const ground = new T.Mesh(
      new T.PlaneGeometry(1800, 1800, 100, 100),
      material("#8c8b9c"),
    );
    const terrain = ground.geometry.attributes.position;
    for (let i = 0; i < terrain.count; i++) {
      const x = terrain.getX(i),
        z = terrain.getY(i),
        distance = Math.hypot(x, z);
      const hills = Math.max(0, Math.min(1, (distance - 55) / 120));
      terrain.setZ(
        i,
        hills *
          (5 +
            Math.sin(x * 0.024) * Math.cos(z * 0.017) * 8 +
            Math.sin(x * 0.047 + z * 0.019) * 3),
      );
    }
    ground.geometry.computeVertexNormals();
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
    const stars = new Float32Array(650 * 3);
    for (let i = 0; i < 650; i++) {
      const direction = new T.Vector3(
        (rand() - 0.5) * 2,
        rand(),
        (rand() - 0.5) * 2,
      )
        .normalize()
        .multiplyScalar(1800);
      stars.set([direction.x, direction.y, direction.z], i * 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(stars, 3));
    this.sky.add(
      new T.Points(
        geo,
        new T.PointsMaterial({
          color: "#d9e8ff",
          size: 1.35,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );
    const earth = new T.Mesh(
      new T.SphereGeometry(24, 64, 48),
      new T.MeshPhongMaterial({
        color: "#ffffff",
        shininess: 8,
        specular: "#25394b",
      }),
    );
    earth.position.copy(
      new T.Vector3(-0.33, 0.16, -0.93).normalize().multiplyScalar(1400),
    );
    earth.rotation.y = -1.5;
    this.sky.add(earth);
    this.earth = earth;
    new T.TextureLoader().load("/textures/earth.jpg", (tex) => {
      tex.colorSpace = T.SRGBColorSpace;
      (earth.material as T.MeshPhongMaterial).map = tex;
      earth.material.needsUpdate = true;
    });
    const atmosphere = new T.Mesh(
      new T.SphereGeometry(24.55, 48, 32),
      new T.MeshBasicMaterial({
        color: "#8ed8ff",
        transparent: true,
        opacity: 0.13,
        side: T.BackSide,
        depthWrite: false,
      }),
    );
    atmosphere.position.copy(earth.position);
    this.sky.add(atmosphere);
    this.sky.add(new T.AmbientLight("#879dc0", 0.07));
    const earthSun = new T.DirectionalLight("#fff7e8", 3);
    earthSun.position.set(-600, 500, 700);
    this.sky.add(earthSun);
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
    this.cinematicAt = performance.now();
    this.rideId = rideId;
    this.controls.enabled = cinematic === null && rideId === null;
    if (returnToPark) {
      this.home();
      this.renderer.toneMappingExposure = 1.15;
    }
    if (this.run !== run) {
      this.run = run;
      if (this.lastTick !== run.tick) {
        this.updateTime = performance.now();
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
        if (isTenant(b.kind)) {
          const owner = astronaut(
            (
              { food: "#f2ad6b", drink: "#7ad7f1", depot: "#ea91ba" } as Record<
                string,
                string
              >
            )[b.kind] ?? "#a9e4d3",
            1.05,
          );
          owner.name = "merchant-owner";
          const entry = entrance(b);
          owner.position.set(
            (entry.x + 0.5 - b.x - w / 2) * SCALE + 0.6,
            0,
            (entry.z + 0.5 - b.z - h / 2) * SCALE,
          );
          const name = label(merchantOwner(b.kind), "#d5f1e8", 1.15);
          name.position.y = 1.35;
          owner.add(name);
          m.root.add(owner);
        }
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
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
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
    if (!this.manual) this.frame = requestAnimationFrame(this.animate);
    if (this.paused) return;
    const dt = Math.min(0.06, (now - this.last) / 1000 || 0);
    this.last = now;
    this.time += dt;
    const run = this.run;
    const cinematic =
      this.cinematic === null
        ? null
        : this.cinematic +
          (this.manual
            ? 0
            : Math.max(0, Math.min(0.25, (now - this.cinematicAt) / 1000)));
    this.cockpit.visible = cinematic !== null && cinematic < 9;
    this.gagRobot.visible =
      cinematic !== null && cinematic >= 33 && cinematic < 35;
    this.rideNose.visible =
      this.rideId !== null ||
      (cinematic !== null && cinematic >= 21 && cinematic < 29);
    this.founder.rotation.y = 0;
    (this.founder.userData.arms[1] as T.Object3D).rotation.z =
      -0.8 + Math.sin(this.time * 5) * 0.25;
    if (this.gagRobot.visible) {
      const t = cinematic! - 33;
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
      const visual =
        cinematic !== null
          ? 40 + cinematic
          : run.finished
            ? run.tick
            : run.tick +
              Math.min(1, ((now - this.updateTime) / 1000) * this.speed);
      for (const b of run.buildings) {
        const m = this.models.get(b.id);
        if (m && !b.sold)
          m.animate(
            visual,
            b,
            cinematic !== null
              ? cinematic % 1
              : run.finished
                ? Math.min(b.cycle_left, (now - this.updateTime) / 1000)
                : Math.min(1, ((now - this.updateTime) / 1000) * this.speed),
          );
      }
      this.animateGuests(run, dt, visual);
      this.animateDeliveries(run, visual);
      const shuttleTime =
        cinematic !== null
          ? Math.min(39.99, Math.max(0, (cinematic - 6) * 1.25))
          : visual;
      this.animateShuttle(shuttleTime);
      for (const building of run.buildings) {
        const owner = this.models
          .get(building.id)
          ?.root.getObjectByName("merchant-owner");
        if (owner) {
          owner.visible = building.ready_at <= run.tick;
          (owner.userData.arms[1] as T.Object3D).rotation.z = building.insolvent
            ? 0
            : -0.35 + Math.sin(this.time * 2 + building.id) * 0.18;
        }
      }
      if (cinematic !== null) this.introCamera(cinematic);
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
    if (cinematic === null && this.rideId === null) this.controls.update();
    if (this.earth) this.earth.rotation.y = -1.5 + this.time * 0.000073;
    this.skyCamera.quaternion.copy(this.camera.quaternion);
    if (
      this.skyCamera.aspect !== this.camera.aspect ||
      this.skyCamera.fov !== this.camera.fov
    ) {
      this.skyCamera.aspect = this.camera.aspect;
      this.skyCamera.fov = this.camera.fov;
      this.skyCamera.updateProjectionMatrix();
    }
    this.renderer.clear();
    this.renderer.render(this.sky, this.skyCamera);
    this.renderer.clearDepth();
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
        if (g.status === "arriving")
          p.position.set(
            ((g.id % 2) - 0.5) * 0.42,
            0.2,
            21.2 + Math.floor((g.id % 8) / 2) * 0.25,
          );
        else p.position.set(x, 0.2, z);
      }
      p.visible = true;
      let x = ((g.cell % WIDTH) + 0.5 - WIDTH / 2) * SCALE,
        z = (Math.floor(g.cell / WIDTH) + 0.5 - HEIGHT / 2) * SCALE;
      if (g.status === "arriving") {
        const delay = Math.floor((g.id % 8) / 2) * 0.24;
        const u = T.MathUtils.clamp(
          (time - g.arrival - delay) / (6 - delay),
          0,
          1,
        );
        x = T.MathUtils.lerp(((g.id % 2) - 0.5) * 0.42, x, u);
        z = T.MathUtils.lerp(21.2, z, u);
      } else if (g.status === "boarding") {
        const phase = g.timer % 40,
          start =
            phase >= 10 && phase <= 24
              ? g.timer
              : g.timer + ((50 - phase) % 40);
        const u = T.MathUtils.clamp((time - start) / 6, 0, 1);
        x = T.MathUtils.lerp(x, ((g.id % 4) - 1.5) * 0.23, u);
        z = T.MathUtils.lerp(z, 21.3, u);
        if (u >= 1) p.visible = false;
      } else if (g.status === "queueing") {
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
        (["walking", "arriving", "leaving", "boarding"].includes(g.status)
          ? Math.abs(Math.sin(time * 5 + g.id)) * 0.05
          : 0);
      for (let i = 0; i < 2; i++) {
        (p.userData.legs[i] as T.Object3D).rotation.x = [
          "walking",
          "arriving",
          "leaving",
          "boarding",
        ].includes(g.status)
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
    this.cockpit.visible = false;
    if (this.reducedMotion) {
      this.camera.position.set(32, 28, 44);
      this.camera.lookAt(0, 0, 0);
      return;
    }
    const b = this.run?.buildings.find((b) => b.kind === "coaster" && !b.sold);
    const m = b ? this.models.get(b.id) : null;
    const pose = cinematicPose(
      t,
      m?.curve ? { curve: m.curve, frame: m.root.children[0] } : undefined,
    );
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = 1.15 * pose.fade;
  }
  private animateShuttle(t: number) {
    const phase = t % 40,
      smooth = (v: number) => {
        const u = T.MathUtils.clamp(v, 0, 1);
        return u * u * (3 - 2 * u);
      };
    const y =
      phase < 10
        ? 32 * (1 - smooth(phase / 10))
        : phase < 30
          ? 0
          : 38 * smooth((phase - 30) / 8);
    this.lander.position.set(
      phase < 10
        ? (1 - smooth(phase / 10)) * 4
        : phase > 30
          ? smooth((phase - 30) / 8) * -5
          : 0,
      0.1 + y,
      22,
    );
    this.lander.visible = phase < 38;
    this.gangway.visible = phase >= 10 && phase < 30;
    const flame = this.lander.userData.flame as T.Mesh;
    flame.visible = phase < 10 || (phase >= 30 && phase < 38);
    flame.scale.y =
      1.1 + Math.sin(this.time * 32) * 0.13 + (phase >= 30 ? 0.7 : 0);
    if (this.dust) {
      const amount = flame.visible ? Math.max(0, 1 - y / 12) : 0;
      (this.dust.material as T.PointsMaterial).opacity = amount * 0.28;
      const p = this.dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = i * 2.3999,
          r = 2 + ((this.time * 4 + i * 0.19) % 5);
        p.setXYZ(
          i,
          Math.cos(a) * r,
          Math.abs(Math.sin(i * 1.7 + this.time * 2)) * 0.6,
          Math.sin(a) * r,
        );
      }
      p.needsUpdate = true;
    }
  }
  setPaused(value: boolean) {
    this.paused = value;
    if (!value) {
      this.last = performance.now();
      this.renderer.toneMappingExposure = 1.15;
    }
  }
  renderIntroAt(t: number) {
    this.manual = true;
    cancelAnimationFrame(this.frame);
    this.paused = false;
    this.last = (t - 1 / 30) * 1000;
    this.time = t - 1 / 30;
    this.cinematic = t;
    this.animate(t * 1000);
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
