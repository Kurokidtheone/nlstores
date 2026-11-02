import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Gives `next dev` access to the D1 / R2 bindings from wrangler.jsonc
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  images: { unoptimized: true }, // images are compressed on upload and served from R2
};

export default nextConfig;
