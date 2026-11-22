import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { APP_NAME } from "@/config/assistant";

import "./globals.css";

// Fonts are self-hosted (via @fontsource-variable) rather than fetched from
// Google at build time. This keeps builds reproducible offline and means the
// future Tauri desktop app never depends on a third-party font CDN.
const nunito = localFont({
  src: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

const fraunces = localFont({
  src: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Bunny AI is your witty, honest and slightly savage personal AI companion.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffcf8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
