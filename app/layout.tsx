import type { Metadata } from "next";
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
