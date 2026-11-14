"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Radio, Volume2, VolumeX } from "lucide-react";
import * as T from "three";

// A live, skippable first-person scene. No rendered video or external assets.
export default function Opening({
  ready,
  onComplete,
}: {
  ready: boolean;
  onComplete: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    time = useRef(0),
    [phase, setPhase] = useState(0),
    [finished, setFinished] = useState(false),
    [muted, setMuted] = useState(true),
    audio = useRef<AudioContext | null>(null),
    [failed, setFailed] = useState(false),
    progress = useRef<HTMLDivElement>(null);
  const readyRef = useRef(ready),
    onCompleteRef = useRef(onComplete);
  useLayoutEffect(() => {
    readyRef.current = ready;
    onCompleteRef.current = onComplete;
  }, [ready, onComplete]);
  const sound = (impact = false) => {
    if (muted) return;
    const ctx = (audio.current ??= new AudioContext());
    void ctx.resume();
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = impact ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(impact ? 65 : 440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      impact ? 24 : 220,
      ctx.currentTime + (impact ? 2 : 0.3),
    );
    gain.gain.setValueAtTime(impact ? 0.06 : 0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + (impact ? 2.5 : 0.4),
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (impact ? 3 : 0.5));
  };
  useEffect(() => {
    if (phase === 2) sound(true);
  }, [phase]);
  useEffect(() => {
    if (!host.current) return;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      const frame = requestAnimationFrame(() => {
        setFailed(true);
        setFinished(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.current.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(0x101a24);
    scene.fog = new T.FogExp2(0x553c36, 0.002);
    const camera = new T.PerspectiveCamera(53, 1, 0.1, 300);
    camera.position.set(0, 4.4, 13);
    camera.lookAt(0, 7, -28);
    scene.add(new T.HemisphereLight(0x7797b1, 0xba7148, 1.3));
    const sun = new T.DirectionalLight(0xffd4a5, 3.6);
    sun.position.set(-15, 30, 12);
    scene.add(sun);
    const earthFill = new T.DirectionalLight(0xa9d9f3, 1.2);
    earthFill.position.set(-15, 18, 40);
    scene.add(earthFill);
    const mat = (color: number) =>
      new T.MeshStandardMaterial({ color, roughness: 0.8 });
    const ground = new T.Mesh(
      new T.PlaneGeometry(500, 500, 30, 30),
      mat(0xa96544),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.4;
    scene.add(ground);
    for (let i = 0; i < 22; i++) {
      const x = (i - 11) * 12,
        z = -50 - Math.sin(i * 3) * 25;
      const mountain = new T.Mesh(
        new T.ConeGeometry(13 + Math.sin(i) * 5, 9 + Math.sin(i * 5) * 6, 6),
        mat(i % 2 ? 0xa66d50 : 0x835845),
      );
      mountain.position.set(x, -1, z);
      scene.add(mountain);
    }
    // Familiar colony hardware outside the observation window anchors the viewpoint on Mars.
    for (let i = 0; i < 5; i++) {
      const panel = new T.Mesh(new T.BoxGeometry(4, 0.12, 2.3), mat(0x335c74));
      panel.position.set(-12 + i * 4.8, 0.2, -17);
      panel.rotation.x = 0.3;
      scene.add(panel);
      const post = new T.Mesh(
        new T.CylinderGeometry(0.1, 0.1, 1.4, 6),
        mat(0xb6a38a),
      );
      post.position.set(-12 + i * 4.8, -0.6, -17);
      scene.add(post);
    }
    const dome = new T.Mesh(
      new T.SphereGeometry(3.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshStandardMaterial({
        color: 0x9ac3b6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.55,
      }),
    );
    dome.position.set(14, -1, -12);
    scene.add(dome);
    const starGeo = new T.BufferGeometry(),
      starPos = new Float32Array(400 * 3);
    let seed = 813;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 400; i++) {
      starPos[i * 3] = (random() - 0.5) * 280;
      starPos[i * 3 + 1] = random() * 100 + 12;
      starPos[i * 3 + 2] = -60 - random() * 100;
    }
    starGeo.setAttribute("position", new T.BufferAttribute(starPos, 3));
    scene.add(
      new T.Points(
        starGeo,
        new T.PointsMaterial({
          color: 0xe0e9f4,
          size: 0.16,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );
    const planet = new T.Group();
    planet.position.set(4, 14, -62);
    scene.add(planet);
    const earthCanvas = document.createElement("canvas");
    earthCanvas.width = 1024;
    earthCanvas.height = 512;
    const c = earthCanvas.getContext("2d")!;
    c.fillStyle = "#235d90";
    c.fillRect(0, 0, 1024, 512);
    const land = (pts: number[][]) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fill();
    };
    c.fillStyle = "#91ad6d";
    land([
      [120, 80],
      [210, 45],
      [280, 80],
      [325, 150],
      [275, 195],
      [230, 180],
      [210, 230],
      [170, 185],
      [90, 175],
      [70, 130],
    ]);
    land([
      [265, 230],
      [340, 255],
      [360, 335],
      [310, 440],
      [270, 370],
      [240, 285],
    ]);
    land([
      [510, 110],
      [590, 90],
      [615, 150],
      [670, 195],
      [645, 245],
      [580, 225],
      [565, 330],
      [520, 350],
      [475, 220],
    ]);
    land([
      [600, 80],
      [750, 65],
      [920, 120],
      [890, 195],
      [795, 215],
      [730, 275],
      [670, 230],
      [625, 150],
    ]);
    land([
      [820, 350],
      [885, 330],
      [920, 365],
      [880, 405],
      [825, 390],
    ]);
    c.fillStyle = "#f0eee0";
    c.fillRect(0, 0, 1024, 25);
    c.fillRect(0, 480, 1024, 32);
    for (let i = 0; i < 130; i++) {
      c.beginPath();
      c.fillStyle = "#eef7ee44";
      c.ellipse(
        random() * 1024,
        random() * 512,
        30 + random() * 60,
        3 + random() * 7,
        -0.2,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    const texture = new T.CanvasTexture(earthCanvas);
    texture.colorSpace = T.SRGBColorSpace;
    const earthTexture = new T.TextureLoader().load("/textures/earth.jpg");
    earthTexture.colorSpace = T.SRGBColorSpace;
    const earthMat = new T.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.9,
    });
    const earth = new T.Mesh(new T.SphereGeometry(3.8, 48, 32), earthMat);
    earth.rotation.y = -0.5;
    planet.add(earth);
    const aura = new T.Mesh(
      new T.SphereGeometry(4.05, 32, 24),
      new T.MeshBasicMaterial({
        color: 0x74cafc,
        side: T.BackSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    planet.add(aura);
    const rock = new T.Mesh(new T.IcosahedronGeometry(0.3, 1), mat(0xa6907b));
    scene.add(rock);
    const trailMat = new T.LineBasicMaterial({
      color: 0xffc58c,
      transparent: true,
      opacity: 0,
    });
    const trailGeo = new T.BufferGeometry().setFromPoints([
      new T.Vector3(),
      new T.Vector3(),
    ]);
    const trail = new T.Line(trailGeo, trailMat);
    scene.add(trail);
    const flash = new T.Mesh(
      new T.SphereGeometry(0.6, 32, 24),
      new T.MeshBasicMaterial({
        color: 0xffedce,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    flash.position.set(3.2, 14.7, -58.5);
    scene.add(flash);
    const rings = Array.from({ length: 3 }, (_, i) => {
      const m = new T.Mesh(
        new T.TorusGeometry(1, 0.035, 6, 80),
        new T.MeshBasicMaterial({
          color: i ? 0xffa25f : 0xffedbf,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      m.position.copy(flash.position);
      scene.add(m);
      return m;
    });
    const emberGeo = new T.BufferGeometry(),
      emberPos = new Float32Array(240 * 3),
      emberVel = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      const a = random() * Math.PI * 2,
        b = random() * Math.PI * 2;
      emberVel[i * 3] = Math.cos(a) * Math.sin(b) * (2 + random() * 3);
      emberVel[i * 3 + 1] = Math.sin(a) * (2 + random() * 3);
      emberVel[i * 3 + 2] = Math.cos(b) * (2 + random() * 3);
    }
    emberGeo.setAttribute("position", new T.BufferAttribute(emberPos, 3));
    const emberMat = new T.PointsMaterial({
      color: 0xffad64,
      size: 0.1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const embers = new T.Points(emberGeo, emberMat);
    embers.position.copy(planet.position);
    scene.add(embers);
    const light = new T.PointLight(0xff9d57, 0, 200, 1);
    light.position.copy(flash.position);
    scene.add(light);
    // The frame and sill are physical foreground objects, reinforcing the first-person point of view.
    const frameMaterial = mat(0x293e47);
    for (const x of [-15, 15]) {
      const b = new T.Mesh(new T.BoxGeometry(0.8, 24, 0.9), frameMaterial);
      b.position.set(x, 5, 3);
      b.rotation.z = x > 0 ? 0.15 : -0.15;
      scene.add(b);
    }
    const sill = new T.Mesh(new T.BoxGeometry(40, 1.5, 4), mat(0x41525b));
    sill.position.set(0, -0.8, 5);
    scene.add(sill);
    let animation = 0,
      start = performance.now(),
      lastPhase = -1,
      done = false;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const resize = () => {
      if (!host.current) return;
      renderer.setSize(host.current.clientWidth, host.current.clientHeight);
      camera.aspect = host.current.clientWidth / host.current.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current);
    resize();
    const animate = () => {
      animation = requestAnimationFrame(animate);
      if (document.hidden) {
        start = performance.now() - time.current * 1000;
        return;
      }
      const elapsed = (performance.now() - start) / 1000;
      time.current = elapsed;
      const t = reduce ? Math.min(elapsed * 1.5, 26) : elapsed;
      const p = t < 6 ? 0 : t < 11 ? 1 : t < 17 ? 2 : 3;
      if (p !== lastPhase) {
        lastPhase = p;
        setPhase(p);
      }
      progress.current?.style.setProperty(
        "width",
        `${Math.min(100, (t / 26) * 100)}%`,
      );
      earth.rotation.y += 0.0003;
      const flight = T.MathUtils.clamp((t - 6) / 5, 0, 1);
      rock.visible = t >= 6 && t < 11;
      rock.position.set(18 - 14.8 * flight, 22 - 7.3 * flight, -59);
      trailMat.opacity = rock.visible ? 0.9 : 0;
      trailGeo.setFromPoints([
        rock.position.clone(),
        rock.position.clone().add(new T.Vector3(2.5, 1.3, 0)),
      ]);
      const impact = Math.max(0, t - 11);
      const flashScale = impact < 1.8 ? impact * 4.5 : 8 + (impact - 1.8) * 0.8;
      flash.scale.setScalar(flashScale);
      (flash.material as T.MeshBasicMaterial).opacity =
        t >= 11 ? Math.max(0, 0.95 - impact * 0.12) : 0;
      light.intensity = t >= 11 ? Math.max(0, 14 - impact * 1.6) : 0;
      rings.forEach((m, i) => {
        const a = impact - i * 0.4;
        m.scale.setScalar(Math.max(0.01, a * 2.4));
        (m.material as T.MeshBasicMaterial).opacity =
          t >= 11 && a > 0 ? Math.max(0, 0.8 - a * 0.12) : 0;
      });
      earthMat.color.lerp(new T.Color(t > 11 ? 0xa75e41 : 0xffffff), 0.015);
      aura.material.opacity = t > 11 ? 0.08 : 0.18;
      if (impact > 0) {
        for (let i = 0; i < 240; i++) {
          const age = Math.min(impact, 6);
          emberPos[i * 3] = emberVel[i * 3] * age;
          emberPos[i * 3 + 1] = emberVel[i * 3 + 1] * age;
          emberPos[i * 3 + 2] = emberVel[i * 3 + 2] * age;
        }
        emberGeo.attributes.position.needsUpdate = true;
        emberMat.opacity = Math.max(0, 0.8 - impact * 0.08);
      }
      if (!reduce) {
        camera.position.x = Math.sin(t * 0.25) * 0.055;
        camera.position.y = 4.4 + Math.sin(t * 0.5) * 0.025;
        if (impact > 0 && impact < 1) {
          camera.position.x += Math.sin(t * 42) * 0.018;
        }
      }
      camera.fov = reduce
        ? 45
        : T.MathUtils.lerp(53, 45, T.MathUtils.smoothstep(t, 4, 10));
      camera.updateProjectionMatrix();
      camera.lookAt(1, 7.8, -28);
      renderer.render(scene, camera);
      if (t >= 26 && !done) {
        done = true;
        setFinished(true);
      }
    };
    animate();
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      texture.dispose();
      earthTexture.dispose();
      trailGeo.dispose();
      starGeo.dispose();
      emberGeo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      void audio.current?.close();
    };
  }, []);
  const captions = [
    ["OBSERVATION DECK / ARES SETTLEMENT", "Home was a blue light in the sky."],
    ["LONG-RANGE OPTICS / EARTH", "Then a second light appeared."],
    ["IMPACT DETECTED", "Eleven minutes too late."],
    [
      "EARTH UPLINK / SIGNAL LOST",
      "“Cancel the return flight. Take care of each other.”",
    ],
  ];
  return (
    <main className={`opening phase-${phase} ${finished ? "finished" : ""}`}>
      <div ref={host} className="opening-canvas" />
      <div className="window-overlay" aria-hidden="true">
        <div className="window-top" />
        <div className="window-left" />
        <div className="window-right" />
        <div className="window-console">
          <i />
          <i />
          <i />
          <span>ARES / OBSERVATION 01</span>
        </div>
      </div>
      <header>
        <span>
          <Radio size={17} /> LAST SIGNAL
        </span>
        <span>FIRST TRANSMISSION</span>
        <button
          onClick={() => {
            setMuted(!muted);
            if (muted) {
              audio.current ??= new AudioContext();
              void audio.current.resume();
            }
          }}
          aria-label={muted ? "Enable opening sound" : "Mute opening sound"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </header>
      <div className="optical-readout">
        <span className={phase >= 2 ? "signal-lost" : ""}>
          ● {phase < 2 ? "UPLINK ACTIVE" : "UPLINK LOST"}
        </span>
        <small>EARTH · LONG-RANGE OPTICS</small>
        <span className="optical-crosshair" />
      </div>
      <section className="opening-caption" aria-live="polite">
        <p className="eyebrow">{captions[phase][0]}</p>
        <h1 key={phase}>{captions[phase][1]}</h1>
        {finished && (
          <>
            <p>120 people. No resupply. One last home.</p>
            <button className="primary" disabled={!ready} onClick={onComplete}>
              Take command
              <ArrowRight size={17} />
            </button>
          </>
        )}
      </section>
      <footer>
        <button disabled={!ready} onClick={onComplete}>
          Skip transmission <ArrowRight size={14} />
        </button>
        <span>
          {!ready
            ? "Establishing your colony…"
            : finished
              ? "THE COLONY IS WAITING"
              : "WATCHING FROM MARS"}
        </span>
        <div className="opening-progress">
          <i ref={progress} />
        </div>
      </footer>
      {failed && (
        <div className="opening-fallback">
          Earth was gone. The settlement remained.
        </div>
      )}
    </main>
  );
}
