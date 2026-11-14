"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MoonWorld as World } from "@/lib/moon/world";
import type { Run, Placement, Detail } from "@/lib/moon/model";
type Props = {
  identity?: { name: string; emblem: number };
  onReady?: () => void;
  run: Run | null;
  speed: number;
  placement: Placement | null;
  selected: number | null;
  cinematic: number | null;
  paused?: boolean;
  attractMode?: boolean;
  preview?: boolean;
  rideId: number | null;
  onPick: (d: Detail | null) => void;
  onHover: (d: Detail | null) => void;
  onPlace: (x: number, z: number) => void;
  onPathStroke?: (cells: number[], erase: boolean) => void;
  onPathPreview?: (
    preview: { cells: number; cost: number; valid: boolean } | null,
  ) => void;
  worldRef: React.MutableRefObject<World | null>;
};
export default function MoonWorld(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    let active = true;
    let world: World | null = null;
    void import("@/lib/moon/world").then(({ MoonWorld }) => {
      if (!active || !host.current) return;
      try {
        world = new MoonWorld(host.current, {
          preview: latest.current.preview,
          onPick: (d) => latest.current.onPick(d),
          onHover: (d) => latest.current.onHover(d),
          onPlace: (x, z) => latest.current.onPlace(x, z),
          onPathStroke: (cells, erase) =>
            latest.current.onPathStroke?.(cells, erase),
          onPathPreview: (preview) => latest.current.onPathPreview?.(preview),
          onReady: () => latest.current.onReady?.(),
        });
        latest.current.worldRef.current = world;
        const p = latest.current;
        if (p.run)
          world.update(
            p.run,
            p.speed,
            p.placement,
            p.selected,
            p.cinematic,
            p.rideId,
          );
        if (p.identity)
          world.setParkIdentity(
            p.identity.name,
            p.identity.emblem,
            p.run?.palette ?? 0,
          );
        world.setPaused(!!p.paused);
        world.setAttractMode(!!p.attractMode);
      } catch (e) {
        console.error(e);
        setFailed(true);
      }
    });
    return () => {
      active = false;
      world?.dispose();
      latest.current.worldRef.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    if (props.run)
      props.worldRef.current?.update(
        props.run,
        props.speed,
        props.placement,
        props.selected,
        props.cinematic,
        props.rideId,
      );
    if (props.identity)
      props.worldRef.current?.setParkIdentity(
        props.identity.name,
        props.identity.emblem,
        props.run?.palette ?? 0,
      );
    props.worldRef.current?.setPaused(!!props.paused);
    props.worldRef.current?.setAttractMode(!!props.attractMode);
  }, [
    props.run,
    props.identity,
    props.speed,
    props.placement,
    props.selected,
    props.cinematic,
    props.rideId,
    props.worldRef,
    props.paused,
    props.attractMode,
  ]);
  return (
    <div className="moon-world" data-testid="moon-world" ref={host}>
      {failed && (
        <div className="moon-webgl-error">
          This park needs WebGL. Try enabling hardware acceleration or opening
          it in another browser.
        </div>
      )}
    </div>
  );
}
