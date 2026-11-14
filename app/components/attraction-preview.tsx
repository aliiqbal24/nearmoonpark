"use client";
import { useEffect, useRef } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createBuilding,
  disposeObject,
  type AnimatedModel,
} from "@/lib/moon/assets";
import { previewBuilding, type Design, type Kind } from "@/lib/moon/model";

export function AttractionPreview({
  kind,
  design,
  palette = 0,
}: {
  kind: Kind;
  design: Design;
  palette?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<{
    scene: T.Scene;
    camera: T.PerspectiveCamera;
    controls: OrbitControls;
    model: AnimatedModel | null;
  } | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = T.AgXToneMapping;
    renderer.toneMappingExposure = 1.5;
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(38, 1, 0.1, 500);
    scene.add(new T.HemisphereLight("#deefff", "#bca59e", 3));
    const key = new T.DirectionalLight("#ffedd0", 4);
    key.position.set(20, 40, 20);
    scene.add(key);
    const rim = new T.DirectionalLight("#7ddfd6", 2);
    rim.position.set(-10, 12, -10);
    scene.add(rim);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    controls.autoRotateSpeed = 0.6;
    controls.enableDamping = true;
    el.appendChild(renderer.domElement);
    const current = {
      scene,
      camera,
      controls,
      model: null as AnimatedModel | null,
    };
    stage.current = current;
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      controls.update();
      renderer.render(scene, camera);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (current.model) disposeObject(current.model.root);
      controls.dispose();
      renderer.dispose();
      el.replaceChildren();
      stage.current = null;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = stage.current;
      if (!s) return;
      if (s.model) {
        s.scene.remove(s.model.root);
        disposeObject(s.model.root);
      }
      s.model = createBuilding(previewBuilding(kind, design), palette);
      s.scene.add(s.model.root);
      const bounds = new T.Box3().setFromObject(s.model.root),
        size = bounds.getSize(new T.Vector3());
      const center = bounds.getCenter(new T.Vector3());
      const distance = Math.max(size.x, size.y, size.z, 4) * 2.35;
      s.controls.target.copy(center);
      s.camera.position
        .copy(center)
        .add(new T.Vector3(distance * 0.65, distance * 0.42, distance * 0.8));
      s.controls.update();
    }, 140);
    return () => clearTimeout(timer);
  }, [kind, design, palette]);
  return (
    <div
      className="mp-attraction-preview"
      ref={host}
      aria-label="Interactive attraction preview"
    />
  );
}
