import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinanceAI",
    short_name: "FinanceAI",
    description: "Track spending, scan receipts with OCR, and get AI-style insights.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/fi-logo-transparent-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/fi-logo-transparent-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/fi-logo-transparent-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
