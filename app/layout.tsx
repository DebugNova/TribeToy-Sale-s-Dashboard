import type { Metadata, Viewport } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";

// Nunito: a rounded, friendly humanist sans that matches TribeToy's cozy,
// hand-made vibe while staying highly legible for dense data. Variable font =
// a single self-hosted file (good on slow networks / low-end devices).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

// Kept for monospaced data (SKUs, order numbers, AWBs).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TribeToy · Commerce Dashboard",
  description: "Sales & operations dashboard for TribeToy.",
  icons: { icon: "/tribetoy-logo.png" },
};

// Mobile-first viewport. width=device-width + initial-scale keeps phones from
// rendering at a zoomed-out desktop width; we leave pinch-zoom enabled (no
// maximum-scale) for accessibility. themeColor tints the mobile browser chrome
// in TribeToy leaf-green.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5f9e2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
