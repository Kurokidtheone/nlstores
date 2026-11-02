// Daily job endpoint. Called at 07:00 UTC by the cron in worker.ts with the CRON_SECRET header.
// Refuses any call without the secret.
import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";
import { runDailyJob } from "@/lib/daily-job";
import { getEnv } from "@/lib/db";

export async function POST(req: Request) {
  const env = await getEnv();
  const secret = env.CRON_SECRET ?? "";
  const given = req.headers.get("x-cron-secret") ?? "";
  if (secret.length < 16) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (!safeEqual(given, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runDailyJob(env.DB, env));
}
