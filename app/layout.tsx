import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAST SIGNAL — Humanity’s Last Home",
  description:
    "Earth is gone. Govern humanity’s last Martian settlement in a ten-minute economic survival game on NEAR.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
