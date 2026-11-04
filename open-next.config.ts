import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// `npm run build` runs `opennextjs-cloudflare build`, which itself builds Next.js. The Next.js
// step is written out here so it never calls `npm run build` again (that would loop).
export default {
  ...defineCloudflareConfig(),
  buildCommand: "npx next build",
};
