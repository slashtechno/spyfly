import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AirVenture Live — KOSH Traffic & ATC",
    short_name: "AirVenture Live",
    description:
      "Live 3D traffic radar and ATC audio for EAA AirVenture Oshkosh.",
    start_url: "/",
    display: "standalone",
    background_color: "#05060a",
    theme_color: "#05060a",
    orientation: "any",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
