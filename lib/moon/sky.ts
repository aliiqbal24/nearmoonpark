import * as T from "three";

// Shared by the visible solar disc and both lighting scenes.
export const SUN_DIRECTION = new T.Vector3(-0.72, 0.27, 0.64).normalize();

export function lunarEnvironment(renderer: T.WebGLRenderer) {
  const environment = new T.Scene();
  environment.background = new T.Color("#03070d");
  const ground = new T.Mesh(
    new T.PlaneGeometry(200, 200),
    new T.MeshBasicMaterial({ color: "#66717e" }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -12;
  environment.add(ground);
  const source = new T.Mesh(
    new T.PlaneGeometry(16, 16),
    new T.MeshBasicMaterial({ color: new T.Color(6, 5.6, 5.0) }),
  );
  source.position.copy(SUN_DIRECTION).multiplyScalar(65);
  source.lookAt(0, 0, 0);
  environment.add(source);
  const earthlight = new T.Mesh(
    new T.PlaneGeometry(60, 35),
    new T.MeshBasicMaterial({ color: new T.Color(0.32, 0.52, 0.8) }),
  );
  earthlight.position.set(30, 25, -40);
  earthlight.lookAt(0, 0, 0);
  environment.add(earthlight);
  const pmrem = new T.PMREMGenerator(renderer);
  const result = pmrem.fromScene(environment, 0.055, 0.1, 200);
  environment.traverse((object) => {
    if (object instanceof T.Mesh) {
      object.geometry.dispose();
      (object.material as T.Material).dispose();
    }
  });
  pmrem.dispose();
  return result;
}

export const EARTH_DIRECTION = new T.Vector3(-0.42, 0.25, -0.87).normalize();

export function createSky(sky: T.Scene) {
  const loader = new T.TextureLoader();
  const starmap = loader.loadAsync("/textures/space/starmap-v3.webp");
  const daymap = loader.loadAsync("/textures/space/earth-day-v3.webp");
  const nightmap = loader.loadAsync("/textures/space/earth-night-v3.webp");
  const cloudmap = loader.loadAsync("/textures/space/earth-clouds-v3.webp");
  const domeMaterial = new T.MeshBasicMaterial({
    color: "#667a99",
    side: T.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const dome = new T.Mesh(new T.SphereGeometry(2800, 48, 24), domeMaterial);
  dome.rotation.set(0.65, 1.25, 0.32);
  sky.add(dome);

  const starCanvas = document.createElement("canvas");
  starCanvas.width = starCanvas.height = 32;
  const paint = starCanvas.getContext("2d")!;
  const gradient = paint.createRadialGradient(16, 16, 0, 16, 16, 15);
  gradient.addColorStop(0, "#ffffffff");
  gradient.addColorStop(0.18, "#ffffffec");
  gradient.addColorStop(0.45, "#ffffff66");
  gradient.addColorStop(1, "#ffffff00");
  paint.fillStyle = gradient;
  paint.fillRect(0, 0, 32, 32);
  const starTexture = new T.CanvasTexture(starCanvas);
  let seed = 71823;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(520 * 3);
  const colors = new Float32Array(520 * 3);
  const starColor = new T.Color();
  for (let i = 0; i < 520; i++) {
    const angle = random() * Math.PI * 2,
      height = random() * 2 - 1;
    const radius = Math.sqrt(1 - height * height);
    positions.set(
      [
        Math.cos(angle) * radius * 1900,
        height * 1900,
        Math.sin(angle) * radius * 1900,
      ],
      i * 3,
    );
    starColor
      .set(["#d5e3ff", "#f5e7ce", "#96b5ec"][i % 3])
      .toArray(colors, i * 3);
  }
  const stars = new T.BufferGeometry();
  stars.setAttribute("position", new T.BufferAttribute(positions, 3));
  stars.setAttribute("color", new T.BufferAttribute(colors, 3));
  sky.add(
    new T.Points(
      stars,
      new T.PointsMaterial({
        map: starTexture,
        vertexColors: true,
        size: 2.4,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false,
      }),
    ),
  );

  const solarPosition = SUN_DIRECTION.clone().multiplyScalar(1800);
  const sun = new T.Mesh(
    new T.SphereGeometry(8.4, 32, 20),
    new T.MeshBasicMaterial({ color: "#fff8e6", toneMapped: false }),
  );
  sun.position.copy(solarPosition);
  sky.add(sun);
  const coronaCanvas = document.createElement("canvas");
  coronaCanvas.width = coronaCanvas.height = 256;
  const coronaPaint = coronaCanvas.getContext("2d")!;
  const corona = coronaPaint.createRadialGradient(128, 128, 2, 128, 128, 128);
  corona.addColorStop(0, "#fff9efff");
  corona.addColorStop(0.045, "#fff5dcce");
  corona.addColorStop(0.13, "#ffe6b533");
  corona.addColorStop(0.45, "#f6c67809");
  corona.addColorStop(1, "#f6c67800");
  coronaPaint.fillStyle = corona;
  coronaPaint.fillRect(0, 0, 256, 256);
  const coronaTexture = new T.CanvasTexture(coronaCanvas);
  coronaTexture.colorSpace = T.SRGBColorSpace;
  const halo = new T.Sprite(
    new T.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  halo.position.copy(solarPosition);
  halo.scale.set(200, 200, 1);
  sky.add(halo);

  const material = new T.ShaderMaterial({
    uniforms: {
      dayMap: { value: null },
      nightMap: { value: null },
      sunlight: { value: SUN_DIRECTION },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPositionW;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vPositionW = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunlight;
      varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPositionW;
      void main() {
        vec3 normal = normalize(vNormalW);
        vec3 view = normalize(cameraPosition - vPositionW);
        float light = dot(normal, sunlight);
        float daylight = smoothstep(-0.12, 0.18, light);
        vec3 surface = texture2D(dayMap, vUv).rgb;
        vec3 cities = texture2D(nightMap, vUv).rgb;
        float ocean = smoothstep(0.015, 0.09, surface.b - surface.r);
        float reflection = pow(max(dot(reflect(-sunlight, normal), view), 0.0), 80.0) * ocean;
        vec3 color = surface * (0.025 + max(light, 0.0) * 1.3);
        color += cities * (1.0 - daylight) * 0.9;
        color += vec3(0.72, 0.83, 0.92) * reflection * max(light, 0.0) * 0.48;
        float limb = pow(1.0 - max(dot(normal, view), 0.0), 4.0) * daylight;
        color = mix(color, vec3(0.025, 0.16, 0.5), limb * 0.45);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const earth = new T.Mesh(new T.SphereGeometry(26, 96, 64), material);
  earth.position.copy(EARTH_DIRECTION).multiplyScalar(1400);
  earth.rotation.y = -1.5;
  earth.visible = false;
  sky.add(earth);
  const clouds = new T.Mesh(
    new T.SphereGeometry(26.12, 80, 48),
    new T.MeshPhongMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.83,
      depthWrite: false,
      shininess: 4,
    }),
  );
  clouds.name = "earth-clouds";
  earth.add(clouds);
  const atmosphere = new T.Mesh(
    new T.SphereGeometry(26.48, 80, 48),
    new T.ShaderMaterial({
      uniforms: { sunlight: { value: SUN_DIRECTION } },
      side: T.BackSide,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
      vertexShader: `varying vec3 vNormalW; varying vec3 vPositionW;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.0);
        vNormalW=normalize(mat3(modelMatrix)*normal);
        vPositionW=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
      fragmentShader: `uniform vec3 sunlight;varying vec3 vNormalW;varying vec3 vPositionW;
      void main(){
        vec3 normal=normalize(vNormalW);
        vec3 view=normalize(cameraPosition-vPositionW);
        float rim=pow(1.0-abs(dot(normal,view)),3.1);
        float lit=smoothstep(-0.3,0.55,dot(normal,sunlight));
        vec3 blue=mix(vec3(0.015,0.11,0.4),vec3(0.18,0.55,1.0),lit);
        gl_FragColor=vec4(blue,rim*(0.1+lit*0.75));
      }`,
    }),
  );
  earth.add(atmosphere);
  sky.add(new T.AmbientLight("#849fc1", 0.045));
  const sunlight = new T.DirectionalLight("#fff4e6", 2.5);
  sunlight.position.copy(SUN_DIRECTION).multiplyScalar(1500);
  sky.add(sunlight);

  const ready = Promise.all([starmap, daymap, nightmap, cloudmap]).then(
    ([stars, day, night, cloud]) => {
      if (sky.userData.disposed) {
        for (const texture of [stars, day, night, cloud]) texture.dispose();
        return;
      }
      for (const texture of [stars, day, night])
        texture.colorSpace = T.SRGBColorSpace;
      stars.wrapS = T.RepeatWrapping;
      stars.anisotropy = 4;
      domeMaterial.map = stars;
      domeMaterial.needsUpdate = true;
      material.uniforms.dayMap.value = day;
      material.uniforms.nightMap.value = night;
      clouds.material.alphaMap = cloud;
      clouds.material.needsUpdate = true;
      earth.visible = true;
    },
  );
  return { earth, ready };
}
