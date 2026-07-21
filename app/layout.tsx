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

const TITLE = "SpyFly — Live Air Traffic Radar";
const DESCRIPTION =
  "A live 3D air traffic radar for any airport — search one by name, or start at EAA AirVenture Oshkosh, the world's busiest control tower for one week a year. Built entirely on free, keyless public data: no API keys, no signup, no config.";

export const metadata: Metadata = {
  metadataBase: new URL("https://flights.angad.me"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "SpyFly",
  keywords: [
    "flight tracker",
    "live flight tracker",
    "air traffic radar",
    "ADS-B",
    "flight radar",
    "EAA AirVenture Oshkosh",
    "KOSH",
    "Wittman Regional Airport",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "SpyFly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
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
