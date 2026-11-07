import { PALETTES } from "./parks";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  lunarTerrain,
  spaceport,
  observatory,
  walkwayMaterial,
} from "./scenery";
import {
  SCALE,
  box,
  sphere,
  label,
  astronaut,
  rocket,
  serviceRover,
  createBuilding,
  disposeObject,
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
  private attractMode = false;
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
  private visualTick = 0;
  private updateTime = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private slowFrames = 0;
  private sun: T.DirectionalLight;
  private post: EffectComposer;
  private ambientOcclusion: GTAOPass;
  private bloom: UnrealBloomPass;
  private postEnabled = true;
  constructor(host: HTMLElement, opts: Options) {
    this.host = host;
    this.manual = opts.autoStart === false;
    this.opts = opts;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const graphics = gl.getExtension("WEBGL_debug_renderer_info");
    const floatColor = !!gl.getExtension("EXT_color_buffer_float");
    this.postEnabled =
      floatColor &&
      (this.manual ||
        !graphics ||
        !/swiftshader|llvmpipe|software/i.test(
          gl.getParameter(graphics.UNMASKED_RENDERER_WEBGL),
        ));
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, host.clientWidth < 800 ? 1.25 : 1.5),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
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
    this.controls.maxDistance = 72;
    this.controls.minPolarAngle = Math.PI * 0.12;
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
    this.scene.add(new T.HemisphereLight("#bfd6ff", "#55516c", 0.85));
    const sun = new T.DirectionalLight("#ffe4ba", 2.8);
    this.sun = sun;
    sun.position.set(-24, 30, 20);
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
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.00015;
    sun.shadow.radius = 1.25;
    this.scene.add(sun);
    const rim = new T.DirectionalLight("#6db8ed", 1);
    rim.position.set(20, 8, -25);
    this.scene.add(rim);
    if (floatColor) {
      const pmrem = new T.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.scene.environment = pmrem.fromScene(room, 0.04).texture;
      this.scene.environmentIntensity = 0.48;
      room.dispose();
      pmrem.dispose();
    }
    this.environment();
    this.paths = new T.InstancedMesh(
      new T.BoxGeometry(1.2, 0.065, 1.2),
      walkwayMaterial(),
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
    const dustCanvas = document.createElement("canvas");
    dustCanvas.width = dustCanvas.height = 64;
    const dustPaint = dustCanvas.getContext("2d")!;
    const puff = dustPaint.createRadialGradient(32, 32, 0, 32, 32, 31);
    puff.addColorStop(0, "rgba(255,255,255,0.7)");
    puff.addColorStop(0.4, "rgba(255,255,255,0.32)");
    puff.addColorStop(1, "rgba(255,255,255,0)");
    dustPaint.fillStyle = puff;
    dustPaint.fillRect(0, 0, 64, 64);
    this.dust = new T.Points(
      dustGeometry,
      new T.PointsMaterial({
        color: "#b4b1bf",
        size: 0.5,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        map: new T.CanvasTexture(dustCanvas),
      }),
    );
    this.dust.position.set(0, 0.2, 22);
    this.scene.add(this.dust);
    spaceport(this.scene);
    this.founder = astronaut("#a9e4d3", 1.5);
    this.founder.position.set(2, 0.1, 15.7);
    this.scene.add(this.founder);
    this.gagRobot.add(serviceRover("#e4b17d"));
    box(this.gagRobot, "#f7edd5", 0, 0.78, 0.44, 0.38, 0.38, 0.32);
    for (const x of [-0.13, 0, 0.13])
      box(this.gagRobot, "#d87f67", x, 0.78, 0.61, 0.055, 0.34, 0.02);
    for (let i = 0; i < 25; i++) {
      const piece = sphere(this.gagRobot, "#fff0c2", 0, 2, 0, 0.07);
      this.popcorn.push(piece);
    }
    this.gagRobot.position.set(3, 0.08, 13.5);
    this.gagRobot.visible = false;
    this.scene.add(this.gagRobot);
    const floatSamples = (
      floatColor
        ? gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES)
        : null
    ) as Int32Array | null;
    this.post = new EffectComposer(
      this.renderer,
      new T.WebGLRenderTarget(1, 1, {
        type: T.HalfFloatType,
        samples: Math.min(4, floatSamples?.[0] ?? 0),
      }),
    );
    this.post.addPass(new RenderPass(this.sky, this.skyCamera));
    const parkPass = new RenderPass(this.scene, this.camera);
    parkPass.clear = false;
    parkPass.clearDepth = true;
    this.post.addPass(parkPass);
    this.ambientOcclusion = new GTAOPass(this.scene, this.camera, 1, 1);
    this.ambientOcclusion.blendIntensity = 0.65;
    this.ambientOcclusion.updateGtaoMaterial({
      radius: 0.75,
      distanceExponent: 2,
      thickness: 1,
    });
    this.post.addPass(this.ambientOcclusion);
    this.bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.1, 0.22, 4.5);
    this.post.addPass(this.bloom);
    this.post.addPass(new OutputPass());
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
    lunarTerrain(this.scene);
    let seed = 4242;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
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
      new T.Vector3(-0.33, 0.12, -0.93).normalize().multiplyScalar(1400),
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
    observatory(this.scene);
  }

  private layout() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.post.setPixelRatio(this.renderer.getPixelRatio());
    this.post.setSize(width, height);
    const aoScale = this.manual ? 0.75 : 0.5;
    this.ambientOcclusion.setSize(
      Math.max(1, Math.round(width * this.renderer.getPixelRatio() * aoScale)),
      Math.max(1, Math.round(height * this.renderer.getPixelRatio() * aoScale)),
    );
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
      this.renderer.toneMappingExposure = 1.05;
    }
    if (this.run !== run) {
      this.run = run;
      if (this.lastTick !== run.tick) {
        if (run.tick < this.lastTick) this.visualTick = run.tick;
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
  setParkIdentity(name: string, emblem: number, paletteIndex: number) {
    const old = this.scene.getObjectByName("park-gate-sign");
    if (!old?.parent) return;
    const signature = `${name}:${emblem}:${paletteIndex}`;
    if (old.userData.identity === signature) return;
    const sign = label(
      `${["☾", "✦", "◎"][emblem] ?? "☾"}  ${name}`,
      PALETTES[paletteIndex]?.accent ?? "#fce3ab",
      4.1,
    );
    sign.name = "park-gate-sign";
    sign.userData.identity = signature;
    sign.position.copy(old.position);
    sign.scale.copy(old.scale);
    old.parent.add(sign);
    old.removeFromParent();
    disposeObject(old);
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
        disposeObject(m.root);
        this.models.delete(id);
      }
    for (const b of run.buildings) {
      if (b.sold) continue;
      let m = this.models.get(b.id);
      const signature = `${b.kind}:${b.rotation}:${b.variant}:${b.x}:${b.z}:${run.palette ?? 0}:${JSON.stringify(b.design)}`;
      if (m && m.root.userData.signature !== signature) {
        this.scene.remove(m.root);
        disposeObject(m.root);
        this.models.delete(b.id);
        m = undefined;
      }
      if (!m) {
        m = createBuilding(b, run.palette ?? 0);
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
          const name = label(merchantOwner(b.kind), "#d5f1e8", 1.05, true);
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
      | T.Mesh<T.BoxGeometry, T.MeshBasicMaterial>
      | undefined;
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
      this.clampPan();
    }
    if (e.key === "Home") this.home();
  };
  private clampPan() {
    if (this.manual) return;
    const target = this.controls.target;
    const distance = this.camera.position.distanceTo(target);
    const reach = T.MathUtils.clamp(
      (this.controls.maxDistance - distance) * 0.55,
      7,
      18,
    );
    const x = T.MathUtils.clamp(target.x, -reach, reach);
    const z = T.MathUtils.clamp(
      target.z,
      -Math.min((HEIGHT * SCALE) / 2 - 2, reach),
      Math.min((HEIGHT * SCALE) / 2 + 8, reach + 5),
    );
    this.camera.position.x += x - target.x;
    this.camera.position.y -= target.y;
    this.camera.position.z += z - target.z;
    target.set(x, 0, z);
  }
  home() {
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    if (this.host.clientWidth < 720) {
      this.camera.position.set(26, 30, 50);
      this.controls.target.set(0, 0, 8);
    } else {
      this.camera.position.set(32, 28, 44);
      this.controls.target.set(0, 0, 0);
    }
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
    const elapsed = now - this.last;
    if (!this.manual && elapsed > 0 && elapsed < 1000) {
      this.slowFrames =
        elapsed > 34 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames >= 12 && this.renderer.getPixelRatio() > 0.75) {
        this.renderer.setPixelRatio(
          Math.max(0.75, this.renderer.getPixelRatio() * 0.75),
        );
        this.sun.shadow.mapSize.set(512, 512);
        this.sun.shadow.map?.dispose();
        this.sun.shadow.map = null;
        this.ambientOcclusion.enabled = false;
        this.bloom.enabled = false;
        this.postEnabled = false;
        this.slowFrames = 0;
        this.layout();
      }
    }
    const dt = Math.max(0, Math.min(0.06, (now - this.last) / 1000 || 0));
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
      2.2 + Math.sin(this.time * 5) * 0.25;
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
      this.visualTick = T.MathUtils.clamp(
        Math.max(run.tick, this.visualTick) + dt * this.speed,
        run.tick,
        run.tick + 1,
      );
      const visual =
        cinematic !== null
          ? 40 + cinematic
          : this.attractMode
            ? 40 + (this.reducedMotion ? 1 : this.time * 0.8)
            : run.finished
              ? run.tick
              : this.visualTick;
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
                : Math.min(1, visual - run.tick),
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
            : 0.5 + Math.sin(this.time * 2 + building.id) * 0.18;
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
    if (cinematic === null && this.rideId === null) {
      this.controls.update();
      this.clampPan();
    }
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
    if (this.postEnabled) this.post.render(dt);
    else {
      this.renderer.clear();
      this.renderer.render(this.sky, this.skyCamera);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
    }
  };
  private animateGuests(run: Run, dt: number, time: number) {
    for (const g of run.guests) {
      const visible = !["upcoming", "gone", "riding", "cancelled"].includes(
        g.status,
      );
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
      let cell = g.cell;
      let nextCell = cell;
      let progress = 0;
      if (
        this.attractMode &&
        !this.reducedMotion &&
        g.status === "walking" &&
        g.route.length > 1
      ) {
        const n = g.route.length;
        const travel = g.id * 3 + time * 0.8;
        const cycle = n * 2 - 2;
        const index = Math.floor(travel) % cycle;
        const next = (index + 1) % cycle;
        cell = g.route[index < n ? index : cycle - index];
        nextCell = g.route[next < n ? next : cycle - next];
        progress = travel % 1;
      } else if (["walking", "leaving"].includes(g.status) && g.route.length) {
        nextCell = g.route[0];
        progress = T.MathUtils.clamp(time - run.tick, 0, 1);
      }
      let x =
        (T.MathUtils.lerp(cell % WIDTH, nextCell % WIDTH, progress) +
          0.5 -
          WIDTH / 2) *
        SCALE;
      let z =
        (T.MathUtils.lerp(
          Math.floor(cell / WIDTH),
          Math.floor(nextCell / WIDTH),
          progress,
        ) +
          0.5 -
          HEIGHT / 2) *
        SCALE;
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
      d.y = 0;
      const walking =
        ["walking", "arriving", "leaving", "boarding"].includes(g.status) &&
        d.lengthSq() > 0.000001;
      if (d.lengthSq() > 0.000001) {
        const heading = Math.atan2(d.x, d.z);
        const turn =
          T.MathUtils.euclideanModulo(
            heading - p.rotation.y + Math.PI,
            Math.PI * 2,
          ) - Math.PI;
        p.rotation.y += turn * (1 - Math.exp(-14 * dt));
      }
      p.userData.walkDistance = (p.userData.walkDistance ?? 0) + d.length();
      const stride = p.userData.walkDistance * 5.4 + g.id;
      p.position.copy(target);
      p.position.y = 0.22 + (walking ? Math.abs(Math.sin(stride)) * 0.045 : 0);
      for (let i = 0; i < 2; i++) {
        (p.userData.legs[i] as T.Object3D).rotation.x = walking
          ? Math.sin(stride + i * Math.PI) * 0.35
          : 0;
        (p.userData.arms[i] as T.Object3D).rotation.x = walking
          ? -Math.sin(stride + i * Math.PI) * 0.25
          : Math.sin(time * 1.7 + g.id + i) * 0.045;
        (p.userData.arms[i] as T.Object3D).rotation.z =
          g.status === "leaving" && g.satisfaction > 70
            ? (i ? 2.1 : -0.15) + Math.sin(time * 4 + g.id) * 0.12
            : (i ? -1 : 1) * 0.08;
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
        d = serviceRover();
        box(d, "#d4c09b", 0, 0.7, -0.24, 0.52, 0.25, 0.35);
        box(d, "#8eddd3", 0, 0.72, -0.25, 0.06, 0.28, 0.38);
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
        0.19,
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
    this.renderer.toneMappingExposure = 1.05 * pose.fade;
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
    const flame = this.lander.userData.flame as T.Group;
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
    if (this.paused === value) return;
    this.paused = value;
    if (!value) {
      this.last = performance.now();
      this.renderer.toneMappingExposure = 1.05;
    }
  }
  setAttractMode(value: boolean) {
    if (this.attractMode === value) return;
    this.attractMode = value;
    if (value) {
      this.camera.position.set(23, 12, 32);
      this.controls.target.set(-6, 1, -2);
      this.controls.update();
    } else this.home();
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
    disposeObject(this.scene);
    disposeObject(this.sky);
    this.scene.environment?.dispose();
    for (const pass of this.post.passes) pass.dispose();
    this.post.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
