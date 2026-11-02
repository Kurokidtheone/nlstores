// Regenerate with `npm run cf-typegen` after changing wrangler.jsonc
interface CloudflareEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  ROOT_DOMAIN: string;
  ADMIN_HOST: string;
  CF_ZONE_ID: string;
  SESSION_SECRET: string;
  CF_API_TOKEN: string;
  ADMIN_PASSWORD: string;
}
