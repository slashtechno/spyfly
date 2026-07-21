import type { MetadataRoute } from "next";

// A single-page app only has one real URL to list — the ?lat=&lon= variants
// are the same page with client-side state, not distinct crawlable content.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://flights.angad.me",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
