import { resortDistrict } from "./resort-district";
import { GuestThoughts } from "./guest-thoughts";
import {
  stationBounds,
  stationPoints,
  type MapTrackDraft,
  type TrackGesture,
} from "./map-track";
import { configureArt } from "./art-kit";
import { createSky, lunarEnvironment, SUN_DIRECTION } from "./sky";
import { PALETTES } from "./parks";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import {
  lunarTerrain,
  spaceport,
  observatory,
  walkwayMaterial,
  pathAmenities,
} from "./scenery";
import {
  SCALE,
  box,
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
  parkWidth,
  parkHeight,
  parkOriginZ,
  parkGate,
  parkClosed,
  previewBuilding,
  coasterDuration,
  type Design,
  footprint,
  entrance,
  walkingRoute,
  tileLine,
  buildingCells,
  isTenant,
  type Run,
  type Placement,
  type Detail,
} from "./model";

import { cinematicPose, introCoasterProgress } from "./cinema";
type Options = {
  autoStart?: boolean;
  preview?: boolean;
  onPick: (d: Detail | null) => void;
  onHover: (d: Detail | null) => void;
  onPlace: (x: number, z: number) => void;
  onPathStroke?: (cells: number[], erase: boolean) => void;
  onPathPreview?: (
    preview: { cells: number; cost: number; valid: boolean } | null,
  ) => void;
  onReady: () => void;
};
export class MoonWorld {
  private width = WIDTH;
  private height = HEIGHT;
  private originZ = 36;
  private parkPeak = 0;
  private previewPeak = 0;
  private designPreview: { id: number; design: Design } | null = null;
  setDesignPreview(preview: { id: number; design: Design } | null) {
    this.designPreview = preview;
    this.sync();
  }
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
  private orthographicCamera = new T.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0.1,
    2200,
  );
  private isometric = false;
  private previewTime = 0;
  controls: OrbitControls;
  private host: HTMLElement;
  private opts: Options;
  private frame = 0;
  private resize: ResizeObserver;
  private models = new Map<number, AnimatedModel>();
  private people = new Map<number, T.Group>();
  private thoughts: GuestThoughts;
  private deliveries = new Map<number, T.Group>();
  private run: Run | null = null;
  private placement: Placement | null = null;
  private ghost = new T.Group();
  private grid: T.GridHelper;
  private paths: T.InstancedMesh;
  private pathSignature = "";
  private amenities = new T.Group();
  private amenitySignature = "";
  private flightStatus = "";
  private ray = new T.Raycaster();
  private mouse = new T.Vector2();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private pointer = new T.Vector3();
  private down = { x: 0, y: 0 };
  private painting = false;
  private spacePan = false;
  private strokeCells: number[] = [];
  private strokeLast = { x: 0, z: 0 };
  private strokePreview: T.InstancedMesh;
  private trackDraft: MapTrackDraft | null = null;
  private trackGesture: ((event: TrackGesture) => void) | null = null;
  private trackDragging: {
    mode: MapTrackDraft["mode"];
    node: number | null;
  } | null = null;
  private trackOverlay = new T.Group();
  private touchPointers = new Set<number>();
  private multiTouch = false;
  private trackLines = new T.Group();
  private trackHandles = new T.InstancedMesh(
    new T.SphereGeometry(0.36, 12, 8),
    new T.MeshBasicMaterial({
      color: "#ffffff",
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    }),
    256,
  );
  private stationOutline = new T.LineSegments(
    new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)),
    new T.LineBasicMaterial({ color: "#f6db9a" }),
  );
  private beforeDrawing: {
    position: T.Vector3;
    target: T.Vector3;
    maxDistance: number;
  } | null = null;
  private cell = { x: 0, z: 0 };
  private hovered: Detail | null = null;
  private selected: number | null = null;
  private selection: T.LineSegments;
  private lander: T.Group;
  private exhaustLight: T.PointLight;
  private cockpit = new T.Group();
  private rideNose = new T.Group();
  private founder: T.Group;
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
  private parkPass: RenderPass;
  private ambientOcclusion: GTAOPass;
  private bloom: UnrealBloomPass;
  private depthOfField: BokehPass;
  private environmentTarget: T.WebGLRenderTarget | null = null;
  private postEnabled = true;
  readonly sceneryReady: Promise<void>;
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
    const softwareRenderer =
      !!graphics &&
      /swiftshader|llvmpipe|software/i.test(
        gl.getParameter(graphics.UNMASKED_RENDERER_WEBGL),
      );
    configureArt(!this.manual && softwareRenderer ? "compact" : "full");
    this.postEnabled = floatColor && (this.manual || !softwareRenderer);
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        softwareRenderer && !this.manual
          ? 0.6
          : host.clientWidth < 800
            ? 1.5
            : 2,
      ),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.42;
    host.appendChild(this.renderer.domElement);
    this.renderer.autoClear = false;
    this.renderer.setClearColor("#03060c");
    this.scene.background = null;
    this.scene.fog = new T.Fog("#080d16", 300, 1600);
    this.camera = new T.PerspectiveCamera(50, 1, 0.1, 2200);
    this.camera.position.set(24, 24, 38);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 4);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 95;
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
    for (const side of [-1, 1]) {
      box(
        this.rideNose,
        "#153e48",
        side * 0.73,
        -0.82,
        -1.18,
        0.24,
        0.38,
        0.55,
      );
      box(this.rideNose, "#d8a34c", side * 0.73, -0.64, -1.18, 0.2, 0.04, 0.45);
    }
    this.rideNose.visible = false;
    this.camera.add(this.rideNose);
    this.scene.add(new T.HemisphereLight("#a7c6ed", "#6b7483", 0.85));
    const sun = new T.DirectionalLight("#ffe4c4", 4.2);
    this.sun = sun;
    sun.position.copy(SUN_DIRECTION).multiplyScalar(60);
    sun.castShadow = true;
    const shadowSize = this.manual
      ? 4096
      : softwareRenderer
        ? 512
        : host.clientWidth < 800
          ? 1024
          : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.target.position.set(0, 0, -12);
    sun.position.add(sun.target.position);
    this.scene.add(sun.target);
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 48;
    sun.shadow.camera.bottom = -48;
    sun.shadow.normalBias = 0.018;
    sun.shadow.bias = -0.00008;
    sun.shadow.radius = 2;
    this.scene.add(sun);
    const rim = new T.DirectionalLight("#83b9ed", 1.2);
    rim.position.set(20, 8, -25);
    this.scene.add(rim);
    if (floatColor && (this.manual || !softwareRenderer)) {
      this.environmentTarget = lunarEnvironment(this.renderer);
      this.scene.environment = this.environmentTarget.texture;
      this.scene.environmentIntensity = 1.15;
    }
    this.sceneryReady = this.environment(!this.manual && softwareRenderer);
    void this.sceneryReady.catch((error: unknown) =>
      console.error("Lunar scenery could not finish loading", error),
    );
    this.paths = new T.InstancedMesh(
      new T.BoxGeometry(1.245, 0.1, 1.245),
      walkwayMaterial(),
      this.width * this.height,
    );
    this.paths.count = 0;
    this.paths.receiveShadow = true;
    this.scene.add(this.paths, this.amenities);
    this.strokePreview = new T.InstancedMesh(
      new T.BoxGeometry(1.19, 0.11, 1.19),
      new T.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
      WIDTH * HEIGHT,
    );
    this.strokePreview.count = 0;
    this.scene.add(this.strokePreview);
    this.trackOverlay.add(
      this.trackLines,
      this.trackHandles,
      this.stationOutline,
    );
    this.trackOverlay.visible = false;
    this.trackHandles.renderOrder = 20;
    this.scene.add(this.trackOverlay);
    this.grid = new T.GridHelper(
      this.width * SCALE,
      this.width,
      "#c8e4e8",
      "#9aa4b6",
    );
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
    this.exhaustLight = new T.PointLight("#ffd2a2", 0, 17, 2);
    this.exhaustLight.position.set(0, 0.9, 22);
    this.scene.add(this.exhaustLight);
    this.gangway = new T.Group();
    box(this.gangway, "#e5d6b9", 0, 0.2, 18.6, 1.5, 0.15, 7);
    for (const x of [-0.7, 0.7])
      box(this.gangway, "#d8a34c", x, 0.48, 18.6, 0.04, 0.5, 7);
    this.scene.add(this.gangway);
    const dustGeometry = new T.BufferGeometry();
    dustGeometry.setAttribute(
      "position",
      new T.BufferAttribute(new Float32Array(220 * 3), 3),
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
    this.founder = astronaut("#a9e4d3", 1.5, 4);
    this.founder.position.set(2, 0.19, 15.7);
    this.scene.add(this.founder);
    this.thoughts = new GuestThoughts(this.scene);
    // Single-sample targets avoid ANGLE's resolve failure during bloom composition.
    // SMAA smooths geometry edges after tone mapping.
    this.post = new EffectComposer(
      this.renderer,
      new T.WebGLRenderTarget(1, 1, {
        type: T.HalfFloatType,
        samples: 0,
      }),
    );
    this.post.addPass(new RenderPass(this.sky, this.skyCamera));
    this.parkPass = new RenderPass(this.scene, this.camera);
    this.parkPass.clear = false;
    this.parkPass.clearDepth = true;
    this.post.addPass(this.parkPass);
    this.ambientOcclusion = new GTAOPass(this.scene, this.camera, 1, 1);
    this.ambientOcclusion.blendIntensity = 0.85;
    this.ambientOcclusion.updateGtaoMaterial({
      radius: 1.1,
      distanceExponent: 2,
      thickness: 1,
    });
    this.post.addPass(this.ambientOcclusion);
    this.depthOfField = new BokehPass(this.scene, this.camera, {
      focus: 35,
      aperture: 0.00006,
      maxblur: 0.006,
    });
    // The sky has no park depth. Keep distant Earth and stars optically sharp.
    this.depthOfField.materialBokeh.fragmentShader =
      this.depthOfField.materialBokeh.fragmentShader.replace(
        "float viewZ = getViewZ( getDepth( vUv ) );",
        `float depth = getDepth(vUv);
        if (depth > 0.99999) { gl_FragColor = texture2D(tColor, vUv); return; }
        float viewZ = getViewZ(depth);`,
      );
    this.depthOfField.enabled = false;
    this.post.addPass(this.depthOfField);
    this.bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.22, 0.34, 2.2);
    this.post.addPass(this.bloom);
    this.post.addPass(new OutputPass());
    this.post.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: `varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float vignette = 1.0 - smoothstep(0.18, 0.88, length(vUv - 0.5)) * 0.22;
          color.rgb = pow(max(color.rgb, vec3(0.0)), vec3(1.04)) * vignette;
          gl_FragColor = color;
        }`,
      }),
    );
    this.post.addPass(new SMAAPass());
    this.resize = new ResizeObserver(() => this.layout());
    this.resize.observe(host);
    this.layout();
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.pointerDown);
    el.addEventListener("pointermove", this.pointerMove);
    el.addEventListener("pointerup", this.pointerUp);
    el.addEventListener("pointerleave", this.pointerLeave);
    el.addEventListener("pointercancel", this.cancelPointer);
    window.addEventListener("blur", this.cancelPointer);
    el.addEventListener("contextmenu", this.contextMenu);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    if (!this.manual) this.frame = requestAnimationFrame(this.animate);
    opts.onReady();
  }
  private async environment(compact: boolean) {
    const terrainReady = lunarTerrain(this.scene, compact);
    const sky = createSky(this.sky, this.renderer);
    this.earth = sky.earth;
    observatory(this.scene);
    resortDistrict(this.scene);
    await Promise.all([terrainReady, sky.ready]);
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
    this.width = parkWidth(run);
    this.height = parkHeight(run);
    this.originZ = parkOriginZ(run);
    this.grid.position.z = (this.height / 2 - this.originZ) * SCALE;
    const returnToPark =
      (this.cinematic !== null && cinematic === null) ||
      (this.rideId !== null && rideId === null);
    this.speed = speed;
    this.cinematic = cinematic;
    this.cinematicAt = performance.now();
    this.rideId = rideId;
    this.controls.enabled =
      cinematic === null && rideId === null && !this.attractMode;
    if (returnToPark) {
      this.home();
      this.renderer.toneMappingExposure = 1.42;
    }
    if (this.run !== run) {
      const firstBuildings =
        !this.run ||
        (this.run.buildings.every((b) => b.sold) &&
          run.buildings.some((b) => !b.sold));
      this.run = run;
      this.parkPeak = Math.max(
        0,
        ...run.buildings
          .filter(
            (b) =>
              !b.sold &&
              ((b.kind === "coaster" && b.design?.track_w) ||
                (b.kind === "bounce" && !!b.design?.bounce_height)),
          )
          .flatMap((b) =>
            b.kind === "bounce"
              ? [b.design!.bounce_height!]
              : (b.design?.track?.map((p) => p.y / 10) ?? []),
          ),
      );
      if (this.lastTick !== run.tick) {
        if (run.tick < this.lastTick) this.visualTick = run.tick;
        this.updateTime = performance.now();
        this.lastTick = run.tick;
      }
      this.sync();
      if (firstBuildings && cinematic === null && !this.attractMode)
        this.home();
    }
    this.selected = selected;
    const b = run.buildings.find((b) => b.id === selected && !b.sold);
    this.selection.visible = !!b;
    if (b) {
      const { w, h } = b.design?.map_track ? { w: 8, h: 3 } : footprint(b);
      const station = b.design?.map_track
        ? stationBounds(b.design.track ?? [])
        : null;
      const offsetX = station ? (station.left + station.right) / 20 : w / 2;
      const offsetZ = station ? (station.top + station.bottom) / 20 : h / 2;
      if (station)
        this.selection.scale.set(
          ((station.right - station.left) / 10) * SCALE,
          1,
          ((station.bottom - station.top) / 10) * SCALE,
        );
      else this.selection.scale.set(w * SCALE, 1, h * SCALE);
      this.selection.position.set(
        (b.x + offsetX - this.width / 2) * SCALE,
        0.23,
        (b.z + offsetZ - this.originZ) * SCALE,
      );
    }
    if (JSON.stringify(placement) !== JSON.stringify(this.placement)) {
      this.cancelStroke();
      this.placement = placement;
      this.configureDrawingControls();
      this.previewPeak =
        placement?.kind === "bounce"
          ? (placement.design?.bounce_height ?? 0)
          : placement?.design?.track_w
            ? Math.max(
                0,
                ...(placement.design.track ?? []).map((p) => p.y / 10),
              )
            : 0;
      this.grid.visible = !!placement || !!this.trackDraft;
      for (const child of [...this.ghost.children]) {
        child.removeFromParent();
        disposeObject(child);
      }
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
        m.visible = !placement.design?.map_track;
        if (placement.kind !== "path" && placement.kind !== "erase") {
          const preview = createBuilding(
            {
              ...previewBuilding(placement.kind, placement.design),
              rotation: placement.rotation,
              variant: placement.variant,
            },
            run.palette ?? 0,
          );
          preview.root.position.y = 0.05;
          this.ghost.add(preview.root);
        }
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
        if (
          (placement.kind === "coaster" && placement.design?.track_w) ||
          (placement.kind === "bounce" &&
            (placement.design?.bounce_height ?? 0) > 18)
        )
          this.home();
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
          ((c % this.width) + 0.5 - this.width / 2) * SCALE,
          0.15,
          (Math.floor(c / this.width) + 0.5 - this.originZ) * SCALE,
        );
        this.paths.setMatrixAt(i, mat);
      });
      this.paths.count = run.paths.length;
      this.paths.instanceMatrix.needsUpdate = true;
    }
    const amenitySignature = `${signature}|${run.buildings
      .filter((b) => !b.sold)
      .map((b) => `${b.id},${b.x},${b.z},${b.rotation}`)
      .join(";")}`;
    if (amenitySignature !== this.amenitySignature) {
      this.amenitySignature = amenitySignature;
      this.scene.remove(this.amenities);
      disposeObject(this.amenities);
      this.amenities = pathAmenities(run);
      this.scene.add(this.amenities);
    }
    const ids = new Set(run.buildings.filter((b) => !b.sold).map((b) => b.id));
    for (const [id, m] of this.models)
      if (!ids.has(id)) {
        this.scene.remove(m.root);
        disposeObject(m.root);
        this.models.delete(id);
      }
    for (const original of run.buildings) {
      const b =
        original.id === this.designPreview?.id
          ? { ...original, design: this.designPreview.design }
          : original;
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
          (b.x + w / 2 - this.width / 2) * SCALE,
          0.18,
          (b.z + h / 2 - this.originZ) * SCALE,
        );
        if (isTenant(b.kind) || b.kind === "depot") {
          const owner = astronaut(
            (
              { food: "#f2ad6b", drink: "#7ad7f1", depot: "#ea91ba" } as Record<
                string,
                string
              >
            )[b.kind] ?? "#a9e4d3",
            1.05,
            b.kind === "food" ? 4 : b.kind === "drink" ? 3 : 2,
            b.kind === "food"
              ? "illia"
              : b.kind === "drink"
                ? "mert"
                : "haseeb",
          );
          owner.name = "merchant-owner";
          owner.position.set(
            b.kind === "depot" ? -0.7 : 0.3,
            0.37,
            b.kind === "depot" ? 0.5 : 0.02,
          );
          m.root.children[0].add(owner);
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
      (this.cell.x + size.w / 2 - this.width / 2) * SCALE,
      0.25,
      (this.cell.z + size.h / 2 - this.originZ) * SCALE,
    );
    this.ghost.visible =
      this.cell.x >= 0 &&
      this.cell.z >= 0 &&
      this.cell.x + size.w <= this.width &&
      this.cell.z + size.h <= this.height;
    const cells = new Set(
      this.run?.buildings
        .filter((b) => !b.sold)
        .flatMap((b) =>
          buildingCells(
            b,
            this.width,
            this.placement?.kind === "path" || this.placement?.kind === "erase",
          ),
        ),
    );
    const occupied = (x: number, z: number) => cells.has(z * this.width + x);
    let valid = this.ghost.visible;
    if (this.placement.kind === "coaster" && this.placement.design?.map_track) {
      const candidate = {
        ...previewBuilding("coaster", this.placement.design),
        ...this.cell,
      };
      if (
        buildingCells(candidate, this.width).some((cell) => cells.has(cell)) ||
        buildingCells(candidate, this.width, true).some((cell) =>
          this.run?.paths.includes(cell),
        )
      )
        valid = false;
      const entry = entrance(candidate);
      if (
        entry.x < 0 ||
        entry.z < 0 ||
        entry.x >= this.width ||
        entry.z >= this.height
      )
        valid = false;
    } else
      for (let z = this.cell.z; z < this.cell.z + size.h; z++)
        for (let x = this.cell.x; x < this.cell.x + size.w; x++)
          if (
            occupied(x, z) ||
            (this.placement.kind !== "path" &&
              this.placement.kind !== "erase" &&
              this.run?.paths.includes(z * this.width + x))
          )
            valid = false;
    if (
      this.placement.kind !== "path" &&
      this.placement.kind !== "erase" &&
      !this.placement.design?.map_track &&
      (this.cell.x < 1 ||
        this.cell.z < 1 ||
        this.cell.x + size.w >= this.width ||
        this.cell.z + size.h >= this.height)
    )
      valid = false;
    const mesh = this.ghost.children[0] as
      | T.Mesh<T.BoxGeometry, T.MeshBasicMaterial>
      | undefined;
    mesh?.material.color.set(valid ? "#a5f6dd" : "#ed9b91");
  }
  private configureDrawingControls() {
    const drawing =
      this.placement?.kind === "path" || this.placement?.kind === "erase";
    const drawingMap = drawing || !!this.trackDraft;
    this.controls.mouseButtons.LEFT =
      drawingMap && !this.spacePan ? undefined : T.MOUSE.PAN;
    this.controls.mouseButtons.MIDDLE = drawingMap
      ? T.MOUSE.PAN
      : T.MOUSE.DOLLY;
    this.controls.touches.ONE = drawingMap ? undefined : T.TOUCH.PAN;
  }
  setTrackDesigner(
    draft: MapTrackDraft,
    handler: (event: TrackGesture) => void,
  ) {
    if (!this.trackDraft) {
      this.beforeDrawing = {
        position: this.camera.position.clone(),
        target: this.controls.target.clone(),
        maxDistance: this.controls.maxDistance,
      };
      this.camera.position.set(28, 72, 58);
      this.controls.target.set(0, 0, -15);
      this.controls.maxDistance =
        this.camera.position.distanceTo(this.controls.target) * 1.1;
      this.controls.update();
      this.cell = { x: 10, z: 38 };
    }
    this.trackDraft = draft;
    this.trackGesture = handler;
    this.grid.visible = true;
    this.trackOverlay.visible = true;
    const previousPeak = this.previewPeak;
    this.previewPeak = Math.max(0, ...draft.points.map((p) => p.y / 10));
    this.controls.maxDistance = Math.min(
      320,
      Math.max(
        115,
        this.previewPeak * 2.97 * Math.max(1, 0.9 / this.camera.aspect),
      ),
    );
    if (this.previewPeak > 18 && this.previewPeak > previousPeak)
      this.home();
    this.configureDrawingControls();
    this.drawTrackDraft();
  }
  endTrackDesigner(committed = false) {
    if (committed) this.parkPeak = Math.max(this.parkPeak, this.previewPeak);
    this.trackDraft = null;
    this.trackGesture = null;
    this.trackDragging = null;
    this.trackOverlay.visible = false;
    this.previewPeak = 0;
    this.grid.visible = !!this.placement;
    this.configureDrawingControls();
    if (committed) this.home();
    else if (this.beforeDrawing) {
      this.camera.position.copy(this.beforeDrawing.position);
      this.controls.target.copy(this.beforeDrawing.target);
      this.controls.maxDistance = this.beforeDrawing.maxDistance;
      this.controls.update();
    }
    this.beforeDrawing = null;
  }
  private drawTrackDraft() {
    const draft = this.trackDraft;
    if (!draft) return;
    for (const child of [...this.trackLines.children]) {
      child.removeFromParent();
      disposeObject(child);
    }
    const points =
      draft.mode === "station"
        ? stationPoints(this.cell, draft.rotation)
        : draft.points;
    const station = stationBounds(points);
    this.stationOutline.visible = !!station;
    if (station) {
      this.stationOutline.position.set(
        ((station.left + station.right) / 20 - this.width / 2) * SCALE,
        0.3,
        ((station.top + station.bottom) / 20 - this.originZ) * SCALE,
      );
      this.stationOutline.scale.set(
        (station.right - station.left) * 0.125,
        0.16,
        (station.bottom - station.top) * 0.125,
      );
    }
    const position = (p: { x: number; y: number; z: number }) =>
      new T.Vector3(
        (p.x / 10 - this.width / 2) * SCALE,
        p.y / 10 + 0.2,
        (p.z / 10 - this.originZ) * SCALE,
      );
    if (points.length >= 2) {
      const curve = new T.CatmullRomCurve3(
        points.map(position),
        draft.closed,
        "catmullrom",
        0.25,
      );
      const segments = Math.max(32, points.length * 8);
      const route = curve.getPoints(segments).map((p, i) => {
        if (i / segments < 1 / points.length)
          p.lerpVectors(
            position(points[0]),
            position(points[1]),
            (i / segments) * points.length,
          );
        return p;
      });
      for (const elevated of [false, true]) {
        const geometry = new T.BufferGeometry().setFromPoints(
          route.map((p) => (elevated ? p : new T.Vector3(p.x, 0.27, p.z))),
        );
        this.trackLines.add(
          new T.Line(
            geometry,
            new T.LineBasicMaterial({
              color: draft.invalid
                ? "#f38b78"
                : elevated
                  ? "#fff0b2"
                  : "#79e3ca",
              transparent: true,
              opacity: elevated ? 0.95 : 0.8,
              depthWrite: false,
            }),
          ),
        );
      }
      const elevated = new T.Mesh(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(route, draft.closed),
          segments,
          0.075,
          5,
          draft.closed,
        ),
        new T.MeshBasicMaterial({
          color: draft.invalid ? "#f38b78" : "#fff0b2",
          transparent: true,
          opacity: 0.9,
        }),
      );
      this.trackLines.add(elevated);
    }
    const matrix = new T.Matrix4();
    points.forEach((p, i) => {
      matrix.makeTranslation(
        (p.x / 10 - this.width / 2) * SCALE,
        0.34,
        (p.z / 10 - this.originZ) * SCALE,
      );
      const scale = i === draft.selected || i === 0 ? 1.7 : 1;
      matrix.scale(new T.Vector3(scale, scale, scale));
      this.trackHandles.setMatrixAt(i, matrix);
      this.trackHandles.setColorAt(
        i,
        new T.Color(
          i < 2 ? "#f5cd78" : i === draft.selected ? "#ffffff" : "#71d8c0",
        ),
      );
    });
    this.trackHandles.count = points.length;
    this.trackHandles.instanceMatrix.needsUpdate = true;
    if (this.trackHandles.instanceColor)
      this.trackHandles.instanceColor.needsUpdate = true;
    this.trackHandles.computeBoundingSphere();
  }
  private trackNodeAt(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    let nearest: number | null = null,
      distance = 15;
    this.trackDraft?.points.forEach((p, i) => {
      const point = new T.Vector3(
        (p.x / 10 - this.width / 2) * SCALE,
        0.34,
        (p.z / 10 - this.originZ) * SCALE,
      ).project(this.camera);
      const d = Math.hypot(
        rect.left + ((point.x + 1) * rect.width) / 2 - e.clientX,
        rect.top + ((1 - point.y) * rect.height) / 2 - e.clientY,
      );
      if (d < distance) {
        distance = d;
        nearest = i;
      }
    });
    return nearest;
  }
  private cancelStroke = () => {
    this.painting = false;
    this.trackDragging = null;
    this.strokeCells = [];
    if (this.strokePreview) this.strokePreview.count = 0;
    this.opts.onPathPreview?.(null);
  };
  private cancelPointer = () => {
    this.cancelStroke();
    this.touchPointers.clear();
    this.multiTouch = false;
    this.spacePan = false;
    this.configureDrawingControls();
  };
  private extendStroke() {
    if (
      this.cell.x < 0 ||
      this.cell.z < 0 ||
      this.cell.x >= this.width ||
      this.cell.z >= this.height
    )
      return;
    for (const cell of tileLine(this.strokeLast, this.cell)) {
      const id = cell.z * this.width + cell.x;
      if (!this.strokeCells.includes(id)) this.strokeCells.push(id);
    }
    this.strokeLast = { ...this.cell };
    const occupied = new Set(
      this.run?.buildings
        .filter((b) => !b.sold)
        .flatMap((b) => buildingCells(b, this.width, true)),
    );
    const existing = new Set(this.run?.paths);
    const erase = this.placement?.kind === "erase";
    const valid = this.strokeCells.every((c) =>
      erase ? c !== parkGate(this.run!) : !occupied.has(c),
    );
    const cost = erase
      ? 0
      : this.strokeCells.filter((c) => !existing.has(c)).length * 200;
    const affordable = cost <= (this.run?.cash ?? 0);
    const matrix = new T.Matrix4();
    this.strokeCells.forEach((cell, i) => {
      matrix.makeTranslation(
        ((cell % this.width) + 0.5 - this.width / 2) * SCALE,
        0.29,
        (Math.floor(cell / this.width) + 0.5 - this.originZ) * SCALE,
      );
      this.strokePreview.setMatrixAt(i, matrix);
      this.strokePreview.setColorAt(
        i,
        new T.Color(
          valid && affordable ? (erase ? "#e2b27c" : "#84e1ca") : "#e58a83",
        ),
      );
    });
    this.strokePreview.count = this.strokeCells.length;
    this.strokePreview.instanceMatrix.needsUpdate = true;
    if (this.strokePreview.instanceColor)
      this.strokePreview.instanceColor.needsUpdate = true;
    this.strokePreview.computeBoundingSphere();
    this.opts.onPathPreview?.({
      cells: this.strokeCells.length,
      cost,
      valid: valid && affordable,
    });
  }
  private pointerDown = (e: PointerEvent) => {
    if (e.pointerType === "touch") {
      this.touchPointers.add(e.pointerId);
      if (this.touchPointers.size > 1) {
        this.multiTouch = true;
        this.cancelStroke();
        return;
      }
    }
    this.down = { x: e.clientX, y: e.clientY };
    if (this.trackDraft && !this.spacePan && e.button === 0) {
      this.pointerMove(e);
      this.trackDragging = {
        mode: this.trackDraft.mode,
        node: this.trackNodeAt(e),
      };
      this.trackGesture?.({
        phase: "start",
        cell: { ...this.cell },
        node: this.trackDragging.node,
      });
      this.renderer.domElement.setPointerCapture(e.pointerId);
      return;
    }
    if (
      e.button !== 0 ||
      this.spacePan ||
      !["path", "erase"].includes(this.placement?.kind ?? "")
    )
      return;
    this.pointerMove(e);
    this.painting = true;
    this.strokeLast = { ...this.cell };
    this.strokeCells = [];
    this.extendStroke();
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent) => {
    if (this.multiTouch) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.mouse, this.renderCamera());
    if (this.ray.ray.intersectPlane(this.plane, this.pointer)) {
      this.cell = {
        x: Math.floor(this.pointer.x / SCALE + this.width / 2),
        z: Math.floor(this.pointer.z / SCALE + this.originZ),
      };
      this.moveGhost();
      if (this.painting) this.extendStroke();
      if (this.trackDraft) {
        if (this.trackDragging && this.trackDragging.mode !== "station")
          this.trackGesture?.({
            phase: "move",
            cell: { ...this.cell },
            node: this.trackDragging.node,
          });
        else if (this.trackDraft.mode === "station") this.drawTrackDraft();
      }
    }
    if (this.placement || this.trackDraft) {
      this.opts.onHover(null);
      this.renderer.domElement.style.cursor = "crosshair";
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
    if (e.pointerType === "touch") {
      this.touchPointers.delete(e.pointerId);
      if (this.multiTouch) {
        if (!this.touchPointers.size) this.multiTouch = false;
        return;
      }
    }
    if (this.trackDragging && e.button === 0) {
      this.pointerMove(e);
      const node = this.trackDragging.node;
      this.trackDragging = null;
      this.trackGesture?.({ phase: "end", cell: { ...this.cell }, node });
      return;
    }
    if (this.painting && e.button === 0) {
      this.pointerMove(e);
      const cells = [...this.strokeCells];
      const erase = this.placement?.kind === "erase";
      this.cancelStroke();
      if (cells.length) this.opts.onPathStroke?.(cells, erase);
      return;
    }
    if (this.trackDraft) return;
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
    if (this.painting || this.trackDragging) return;
    this.opts.onHover(null);
    this.ghost.visible = false;
  };
  private contextMenu = (e: Event) => e.preventDefault();
  private keyDown = (e: KeyboardEvent) => {
    if (
      e.defaultPrevented ||
      document.querySelector('[role="dialog"]') ||
      (e.target as HTMLElement)?.matches("input,textarea,select")
    )
      return;
    if (
      e.code === "Space" &&
      (this.trackDraft ||
        (this.placement && ["path", "erase"].includes(this.placement.kind)))
    ) {
      e.preventDefault();
      this.spacePan = true;
      this.configureDrawingControls();
    }
    if (
      this.trackDraft &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
    )
      return;
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
  private keyUp = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    this.spacePan = false;
    this.configureDrawingControls();
  };
  private clampPan() {
    if (this.manual || this.attractMode) return;
    const target = this.controls.target;
    const distance = this.camera.position.distanceTo(target);
    const reach = T.MathUtils.clamp(
      (this.controls.maxDistance - distance) * 0.55,
      7,
      this.width === 48 ? 30 : 18,
    );
    const x = T.MathUtils.clamp(target.x, -reach, reach);
    const z = T.MathUtils.clamp(
      target.z,
      this.height === 48
        ? -43
        : -Math.min((this.height * SCALE) / 2 - 2, reach),
      Math.min((this.height * SCALE) / 2 + 8, reach + 5),
    );
    this.camera.position.x += x - target.x;
    const y = T.MathUtils.clamp(
      target.y,
      0,
      Math.max(this.parkPeak, this.previewPeak) * 0.65,
    );
    this.camera.position.y += y - target.y;
    this.camera.position.z += z - target.z;
    target.set(x, y, z);
  }
  home() {
    this.camera.up.set(0, 1, 0);
    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    if (this.isometric) {
      this.camera.position.set(35, 35, 37);
      this.controls.target.set(0, 0, 2);
    } else if (Math.max(this.parkPeak, this.previewPeak) > 18) {
      const height = Math.max(this.parkPeak, this.previewPeak);
      const distance =
        Math.max(105, height * 2.7) *
        Math.max(1, 0.9 / (this.host.clientWidth / this.host.clientHeight));
      this.controls.target.set(0, height * 0.25, -2);
      this.camera.position
        .copy(this.controls.target)
        .add(
          new T.Vector3(0.45, 0.55, 0.9).normalize().multiplyScalar(distance),
        );
    } else if (this.host.clientWidth < 720) {
      this.camera.position.set(26, 30, 50);
      this.controls.target.set(0, 0, 8);
    } else {
      this.camera.position.set(31, 38, 57);
      this.controls.target.set(0, 0, -5);
    }
    this.controls.maxDistance = Math.min(
      320,
      Math.max(75, this.camera.position.distanceTo(this.controls.target) * 1.1),
    );
    this.controls.update();
  }
  setIsometric(enabled: boolean) {
    this.isometric = enabled;
    this.controls.enableRotate = !enabled;
    this.controls.minPolarAngle = enabled
      ? Math.acos(1 / Math.sqrt(3))
      : Math.PI * 0.12;
    this.controls.maxPolarAngle = enabled
      ? Math.acos(1 / Math.sqrt(3))
      : Math.PI * 0.46;
    this.home();
  }
  private renderCamera() {
    if (!this.isometric || this.cinematic !== null || this.rideId !== null)
      return this.camera;
    const height =
      this.camera.position.distanceTo(this.controls.target) *
      Math.tan(T.MathUtils.degToRad(this.camera.fov / 2)) *
      Math.max(1, 0.95 / this.camera.aspect);
    this.orthographicCamera.left = -height * this.camera.aspect;
    this.orthographicCamera.right = height * this.camera.aspect;
    this.orthographicCamera.top = height;
    this.orthographicCamera.bottom = -height;
    this.orthographicCamera.position.copy(this.camera.position);
    this.orthographicCamera.quaternion.copy(this.camera.quaternion);
    this.orthographicCamera.updateProjectionMatrix();
    this.orthographicCamera.updateMatrixWorld();
    return this.orthographicCamera;
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
      (x + 0.5 - this.width / 2) * SCALE,
      0.2,
      (z + 0.5 - this.originZ) * SCALE,
    ).project(this.renderCamera());
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
    if (this.opts.preview) this.previewTime += dt * this.speed;
    const run = this.run;
    const cinematic =
      this.cinematic === null
        ? null
        : this.cinematic +
          (this.manual
            ? 0
            : Math.max(0, Math.min(0.25, (now - this.cinematicAt) / 1000)));
    this.cockpit.visible =
      cinematic !== null && cinematic >= 4 && cinematic < 9;
    this.rideNose.visible =
      this.rideId !== null ||
      (cinematic !== null && cinematic >= 21 && cinematic < 29);
    this.founder.rotation.y = 0;
    (this.founder.userData.arms[1] as T.Object3D).rotation.z =
      2.2 + Math.sin(this.time * 5) * 0.25;
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
            : this.opts.preview
              ? 40 + (this.reducedMotion ? 1 : this.previewTime)
              : parkClosed(run)
                ? run.tick
                : this.visualTick;
      const heroCoaster = run.buildings.find(
        (b) => b.kind === "coaster" && !b.sold,
      )?.id;
      for (const b of run.buildings) {
        const m = this.models.get(b.id);
        if (m?.train)
          m.train.visible =
            this.rideId !== b.id &&
            !(
              cinematic !== null &&
              cinematic >= 21 &&
              cinematic < 29 &&
              b.id === heroCoaster
            );
        if (
          m &&
          !b.sold &&
          cinematic !== null &&
          b.kind === "coaster" &&
          (cinematic < 4 || (cinematic >= 21 && cinematic < 29))
        ) {
          m.animate(
            visual,
            {
              ...b,
              riders: [0, 1, 2, 3],
              cycle_left:
                coasterDuration(b) * (1 - introCoasterProgress(cinematic)),
            },
            0,
          );
        } else if (m && !b.sold)
          m.animate(
            visual,
            b,
            cinematic !== null
              ? cinematic % 1
              : parkClosed(run)
                ? Math.min(b.cycle_left, (now - this.updateTime) / 1000)
                : Math.min(1, visual - run.tick),
          );
      }
      this.animateGuests(run, dt, visual);
      this.thoughts.update(
        run,
        this.people,
        this.camera,
        this.host.clientHeight,
        this.time,
        this.speed > 0 &&
          !this.trackDraft &&
          this.cinematic === null &&
          this.rideId === null &&
          !this.placement &&
          !this.isometric,
      );
      this.animateDeliveries(run, visual);
      const shuttleTime =
        cinematic !== null
          ? cinematic < 9
            ? 39
            : Math.min(39.99, Math.max(0, (cinematic - 9) * 1.43))
          : visual;
      this.animateShuttle(shuttleTime);
      for (const building of run.buildings) {
        const owner = this.models
          .get(building.id)
          ?.root.getObjectByName("merchant-owner");
        if (owner) {
          owner.visible = building.ready_at <= run.tick;
          if (building.kind === "food")
            owner.position.z =
              cinematic !== null && cinematic >= 29 && cinematic < 33
                ? 1.15
                : 0.02;
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
          const frame = m.root.children[0];
          const up =
            m.upAt?.(u).transformDirection(frame.matrixWorld) ??
            new T.Vector3(0, 1, 0);
          frame.localToWorld(p);
          frame.localToWorld(ahead);
          this.camera.up.copy(up);
          this.camera.position.copy(p).addScaledVector(up, 0.7);
          this.camera.lookAt(ahead.addScaledVector(up, 0.65));
        }
      }
    }
    if (cinematic === null && this.rideId === null) {
      this.controls.update();
      this.clampPan();
    }
    if (this.earth) {
      this.earth.rotation.y = -1.5 + this.time * 0.000073;
      const clouds = this.earth.getObjectByName("earth-clouds");
      if (clouds) clouds.rotation.y = this.time * 0.00004;
    }
    this.skyCamera.quaternion.copy(this.camera.quaternion);
    if (
      this.skyCamera.aspect !== this.camera.aspect ||
      this.skyCamera.fov !== this.camera.fov
    ) {
      this.skyCamera.aspect = this.camera.aspect;
      this.skyCamera.fov = this.camera.fov;
      this.skyCamera.updateProjectionMatrix();
    }
    const renderCamera = this.renderCamera();
    if (this.parkPass.camera !== renderCamera) {
      this.parkPass.camera = renderCamera;
      this.ambientOcclusion.camera = renderCamera;
      this.ambientOcclusion.gtaoMaterial.defines.PERSPECTIVE_CAMERA =
        renderCamera instanceof T.PerspectiveCamera ? 1 : 0;
      this.ambientOcclusion.gtaoMaterial.needsUpdate = true;
      this.ambientOcclusion.depthRenderMaterial.defines.PERSPECTIVE_CAMERA =
        renderCamera instanceof T.PerspectiveCamera ? 1 : 0;
      this.ambientOcclusion.depthRenderMaterial.needsUpdate = true;
    }
    this.depthOfField.enabled =
      !this.isometric &&
      ((cinematic !== null && cinematic >= 6) || this.attractMode);
    if (this.attractMode)
      this.depthOfField.materialBokeh.uniforms.focus.value =
        this.camera.position.distanceTo(this.controls.target);
    if (this.postEnabled) this.post.render(dt);
    else {
      this.renderer.clear();
      this.renderer.render(this.sky, this.skyCamera);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, renderCamera);
    }
  };
  private animateGuests(run: Run, dt: number, time: number) {
    for (const g of run.guests) {
      const visible =
        !(
          this.cinematic !== null &&
          this.cinematic >= 29 &&
          this.cinematic < 33 &&
          g.id >= 3
        ) && !["upcoming", "gone", "riding", "cancelled"].includes(g.status);
      let p = this.people.get(g.id);
      if (!visible) {
        if (p) p.visible = false;
        continue;
      }
      if (!p) {
        p = astronaut(
          ["#f3be82", "#8eddd3", "#bc9fe9"][g.group],
          g.group === 0 ? 0.8 : 1,
          g.id,
        );
        p.traverse((o) => (o.userData.guest = g.id));
        this.scene.add(p);
        this.people.set(g.id, p);
        const x = ((g.cell % this.width) + 0.5 - this.width / 2) * SCALE,
          z = (Math.floor(g.cell / this.width) + 0.5 - this.originZ) * SCALE;
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
        (this.attractMode || this.opts.preview || this.cinematic !== null) &&
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
        (T.MathUtils.lerp(cell % this.width, nextCell % this.width, progress) +
          0.5 -
          this.width / 2) *
        SCALE;
      let z =
        (T.MathUtils.lerp(
          Math.floor(cell / this.width),
          Math.floor(nextCell / this.width),
          progress,
        ) +
          0.5 -
          this.originZ) *
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
        const slot = Math.max(0, index);
        const across = ((slot % 2) - 0.5) * 0.56;
        const behind = Math.floor(slot / 2) * 0.61;
        const rotation = (-(b?.rotation ?? 0) * Math.PI) / 2;
        x += Math.cos(rotation) * across + Math.sin(rotation) * behind;
        z += -Math.sin(rotation) * across + Math.cos(rotation) * behind;
      } else {
        x += Math.sin(g.id * 12.3) * 0.15;
        z += Math.cos(g.id * 7.1) * 0.15;
      }
      if (["walking", "leaving"].includes(g.status)) {
        const lane = ((g.id % 3) - 1) * 0.23;
        const dx = (nextCell % this.width) - (cell % this.width);
        const dz =
          Math.floor(nextCell / this.width) - Math.floor(cell / this.width);
        if (dx !== 0) z += Math.sign(dx) * lane;
        else if (dz !== 0) x -= Math.sign(dz) * lane;
      }
      const target = new T.Vector3(x, 0.22, z),
        d = target.clone().sub(p.position);
      d.y = 0;
      const movementDistance = d.length();
      const walking = movementDistance > 0.015;
      const maximumStep = dt * Math.max(0.4, this.speed) * 3.2;
      const following =
        movementDistance > 0 ? Math.min(1, maximumStep / movementDistance) : 1;
      if (d.lengthSq() > 0.000001) {
        const heading = Math.atan2(d.x, d.z);
        const turn =
          T.MathUtils.euclideanModulo(
            heading - p.rotation.y + Math.PI,
            Math.PI * 2,
          ) - Math.PI;
        p.rotation.y += turn * (1 - Math.exp(-14 * dt));
      }
      p.userData.walkDistance =
        (p.userData.walkDistance ?? 0) + movementDistance * following;
      const stride = p.userData.walkDistance * 5.4 + g.id;
      (p.userData.head as T.Object3D).rotation.y =
        Math.sin(time * 0.65 + g.id * 2.4) * (walking ? 0.06 : 0.15);
      p.position.lerp(target, following);
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
      for (const wheel of d.userData.wheels as T.Object3D[])
        wheel.rotation.x = time * 4;
      const u = Math.min(1, Math.max(0, 1 - (b.delivery_at - time) / 15));
      if (d.userData.paths !== this.pathSignature) {
        const entry = entrance(b);
        d.userData.route = walkingRoute(
          run,
          parkGate(run),
          entry.z * this.width + entry.x,
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
        (T.MathUtils.lerp(from % this.width, to % this.width, fraction) +
          0.5 -
          this.width / 2) *
          SCALE,
        0.19,
        (T.MathUtils.lerp(
          Math.floor(from / this.width),
          Math.floor(to / this.width),
          fraction,
        ) +
          0.5 -
          this.originZ) *
          SCALE,
      );
      if (from !== to)
        d.rotation.y = Math.atan2(
          (to % this.width) - (from % this.width),
          Math.floor(to / this.width) - Math.floor(from / this.width),
        );
    }
  }
  private introCamera(t: number) {
    this.cockpit.visible = t >= 4 && t < 9;
    if (this.reducedMotion) {
      this.camera.position.set(32, 28, 44);
      this.camera.lookAt(0, 0, 0);
      return;
    }
    const b = this.run?.buildings.find((b) => b.kind === "coaster" && !b.sold);
    const m = b ? this.models.get(b.id) : null;
    const pose = cinematicPose(
      t,
      m?.curve
        ? { curve: m.curve, frame: m.root.children[0], upAt: m.upAt }
        : undefined,
    );
    this.camera.up.copy(pose.up);
    this.camera.position.copy(pose.position);
    this.camera.lookAt(pose.target);
    this.depthOfField.materialBokeh.uniforms.focus.value =
      pose.position.distanceTo(pose.target);
    let lens = pose.fov;
    if (this.camera.aspect < 0.85) {
      if (t >= 14 && t < 21) lens *= 1.6;
      if (t >= 35) lens *= 1.45;
    }
    this.camera.fov = Math.min(82, lens);
    this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = 1.42 * pose.fade;
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
    this.lander.visible =
      phase < 38 &&
      (this.attractMode ||
        this.cinematic !== null ||
        (this.run?.opening_stage ?? 3) >= 2);
    this.gangway.visible = phase >= 10 && phase < 30;
    const status =
      phase < 10
        ? "ON APPROACH"
        : phase < 30
          ? "GATES OPEN"
          : phase < 38
            ? "DEPARTING"
            : "NEXT ARRIVAL";
    if (status !== this.flightStatus) {
      this.flightStatus = status;
      const old = this.scene.getObjectByName("port-status-sign");
      if (old?.parent) {
        const sign = label(status, "#9ee0ca", 1.84);
        sign.name = old.name;
        sign.position.copy(old.position);
        old.parent.add(sign);
        old.removeFromParent();
        disposeObject(old);
      }
    }
    const flame = this.lander.userData.flame as T.Group;
    flame.visible = phase < 10 || (phase >= 30 && phase < 38);
    for (const material of this.lander.userData
      .plumeMaterials as T.ShaderMaterial[])
      material.uniforms.time.value = this.time;
    this.exhaustLight.position
      .copy(this.lander.position)
      .add(new T.Vector3(0, 0.8, 0));
    this.exhaustLight.intensity = flame.visible
      ? 25 * Math.max(0, 1 - y / 15)
      : 0;
    flame.scale.y =
      1.1 + Math.sin(this.time * 32) * 0.13 + (phase >= 30 ? 0.7 : 0);
    if (this.dust) {
      const amount = flame.visible ? Math.max(0, 1 - y / 12) : 0;
      (this.dust.material as T.PointsMaterial).opacity = amount * 0.42;
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
      this.renderer.toneMappingExposure = 1.42;
    }
  }
  setAttractMode(value: boolean) {
    if (this.attractMode === value) return;
    this.attractMode = value;
    this.controls.enabled =
      !value && this.cinematic === null && this.rideId === null;
    if (value) {
      this.camera.position.set(29, 10, 39);
      this.controls.target.set(-11, 2.2, -5);
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
    this.thoughts.dispose();
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.controls.dispose();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.pointerDown);
    el.removeEventListener("pointermove", this.pointerMove);
    el.removeEventListener("pointerup", this.pointerUp);
    el.removeEventListener("pointerleave", this.pointerLeave);
    el.removeEventListener("pointercancel", this.cancelPointer);
    window.removeEventListener("blur", this.cancelPointer);
    el.removeEventListener("contextmenu", this.contextMenu);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    disposeObject(this.scene);
    disposeObject(this.sky);
    this.environmentTarget?.dispose();
    for (const pass of this.post.passes) pass.dispose();
    this.post.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
