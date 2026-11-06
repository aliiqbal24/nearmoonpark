import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOONPARK — A NEAR Future",
  description:
    "Build the Moon’s best day out. A lively nine-minute theme park tycoon with rocket arrivals, mass-driver coasters and an economy on NEAR.",
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
