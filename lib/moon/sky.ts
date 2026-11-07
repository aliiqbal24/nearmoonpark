import * as T from "three";

// Shared by the visible solar disc and both lighting scenes.
export const SUN_DIRECTION = new T.Vector3(-0.6, 0.075, -0.795).normalize();

export function createSky(sky: T.Scene) {
  let seed = 71823;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const paint = canvas.getContext("2d")!;
  const backdrop = paint.createLinearGradient(0, 0, 0, 1024);
  backdrop.addColorStop(0, "#01030a");
  backdrop.addColorStop(0.5, "#071124");
  backdrop.addColorStop(1, "#02050d");
  paint.fillStyle = backdrop;
  paint.fillRect(0, 0, 2048, 1024);
  // A quiet, dusty Milky Way. This is distant starlight, with no local parallax.
  for (let i = 0; i < 13000; i++) {
    const x = random() * 2048;
    const centre = 410 + Math.sin((x / 2048) * Math.PI * 2) * 100;
    const spread = (random() + random() + random() - 1.5) * 115;
    const radius = 4 + random() * 22;
    const glow = paint.createRadialGradient(
      x,
      centre + spread,
      0,
      x,
      centre + spread,
      radius,
    );
    glow.addColorStop(0, i % 3 ? "#8ba9c20a" : "#b1a1ce0c");
    glow.addColorStop(1, "#8ba9c200");
    paint.fillStyle = glow;
    paint.fillRect(
      x - radius,
      centre + spread - radius,
      radius * 2,
      radius * 2,
    );
  }
  const field = new T.CanvasTexture(canvas);
  field.colorSpace = T.SRGBColorSpace;
  const dome = new T.Mesh(
    new T.SphereGeometry(2800, 48, 24),
    new T.MeshBasicMaterial({
      map: field,
      side: T.BackSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  dome.rotation.y = 0.65;
  sky.add(dome);

  for (let layer = 0; layer < 3; layer++) {
    const count = [3200, 850, 120][layer];
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new T.Color();
    for (let i = 0; i < count; i++) {
      const azimuth = random() * Math.PI * 2;
      const elevation = random() * 2 - 1;
      const radius = Math.sqrt(1 - elevation * elevation);
      positions.set(
        [
          Math.cos(azimuth) * radius * 1900,
          elevation * 1900,
          Math.sin(azimuth) * radius * 1900,
        ],
        i * 3,
      );
      color.set(
        ["#dce9ff", "#f5dfbb", "#93bddf", "#ffffff"][Math.floor(random() * 4)],
      );
      color.multiplyScalar(0.55 + random() * 0.45).toArray(colors, i * 3);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    sky.add(
      new T.Points(
        geometry,
        new T.PointsMaterial({
          vertexColors: true,
          size: [2.5, 4, 7][layer],
          sizeAttenuation: true,
          transparent: true,
          opacity: [0.52, 0.75, 0.9][layer],
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    );
  }

  const solarPosition = SUN_DIRECTION.clone().multiplyScalar(1800);
  const sun = new T.Mesh(
    new T.SphereGeometry(9, 24, 16),
    new T.MeshBasicMaterial({ color: "#fff5da", toneMapped: false }),
  );
  sun.position.copy(solarPosition);
  sky.add(sun);
  const coronaCanvas = document.createElement("canvas");
  coronaCanvas.width = coronaCanvas.height = 256;
  const coronaPaint = coronaCanvas.getContext("2d")!;
  const corona = coronaPaint.createRadialGradient(128, 128, 4, 128, 128, 128);
  corona.addColorStop(0, "#fff9eaff");
  corona.addColorStop(0.07, "#fff3d9b0");
  corona.addColorStop(0.2, "#ffe7b42a");
  corona.addColorStop(0.5, "#f6c67808");
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
  halo.scale.set(240, 240, 1);
  sky.add(halo);

  const earth = new T.Mesh(
    new T.SphereGeometry(24, 64, 48),
    new T.MeshPhongMaterial({
      color: "#ffffff",
      emissive: "#426387",
      emissiveIntensity: 0.16,
      shininess: 8,
      specular: "#25394b",
    }),
  );
  earth.position.copy(
    new T.Vector3(-0.33, 0.12, -0.93).normalize().multiplyScalar(1400),
  );
  earth.rotation.y = -1.5;
  sky.add(earth);
  new T.TextureLoader().load("/textures/earth.jpg", (texture) => {
    texture.colorSpace = T.SRGBColorSpace;
    (earth.material as T.MeshPhongMaterial).map = texture;
    (earth.material as T.MeshPhongMaterial).emissiveMap = texture;
    earth.material.needsUpdate = true;
  });
  const atmosphere = new T.Mesh(
    new T.SphereGeometry(24.55, 48, 32),
    new T.MeshBasicMaterial({
      color: "#8ed8ff",
      transparent: true,
      opacity: 0.16,
      side: T.BackSide,
      depthWrite: false,
    }),
  );
  atmosphere.position.copy(earth.position);
  sky.add(atmosphere);
  sky.add(new T.AmbientLight("#879dc0", 0.1));
  const sunlight = new T.DirectionalLight("#fff7e8", 3);
  sunlight.position.copy(SUN_DIRECTION).multiplyScalar(1500);
  sky.add(sunlight);
  return earth;
}
