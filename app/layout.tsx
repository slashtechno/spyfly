import type { Metadata, Viewport } from "next";
import { Big_Shoulders, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Big Shoulders was drawn for the City of Chicago's wayfinding — the same
// condensed industrial-signage register as the taxiway and hangar lettering
// at a Midwest airfield.
const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SpyFly — KOSH Traffic Radar",
  description:
    "Live 3D traffic radar for EAA AirVenture Oshkosh, built on public airplanes.live data.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpyFly",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05060a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink-0 font-body">
        {children}
      </body>
    </html>
  );
}
