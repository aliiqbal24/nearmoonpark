import type { Metadata } from "next";
import CameraPreview from "./preview";

export const metadata: Metadata = {
  title: "Moonpark — Isometric Camera Preview",
  robots: { index: false, follow: false },
};

export default function IsometricPreviewPage() {
  return <CameraPreview />;
}
