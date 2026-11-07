import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOONPARK — A NEAR Future",
  description:
    "Build the Moon’s best day out. A lively nine-minute theme park tycoon with rocket arrivals, mass-driver coasters and an economy on NEAR.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=moonpark-2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=moonpark-2", sizes: "16x16 32x32 48x48 64x64" },
    ],
    shortcut: "/favicon.svg?v=moonpark-2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
