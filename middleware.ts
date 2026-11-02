import { NextResponse, type NextRequest } from "next/server";

// Routes every request by its Host header:
//   admin.yourbrand.com/x          -> /admin/x            (owner panel)
//   yourbrand.com, www.yourbrand.com -> redirect to the Next Level stores page
//   anything else (store.yourbrand.com, clientstore.com) -> /s/<host>/x
// The page then looks the host up in the `domains` table.
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";
const ADMIN = process.env.NEXT_PUBLIC_ADMIN_HOST ?? `admin.${ROOT}`;
const SALES_URL = process.env.NEXT_PUBLIC_SALES_URL ?? "https://example.com";
const PREVIEW_HEADER = "x-nls-preview";

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // Internal paths are never reachable directly
  if (path.startsWith("/s/") || path.startsWith("/admin")) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (host === ADMIN) {
    url.pathname = `/admin${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }

  if (host === ROOT || host === `www.${ROOT}`) {
    return NextResponse.redirect(SALES_URL);
  }

  url.pathname = `/s/${encodeURIComponent(host)}${path === "/" ? "" : path}`;
  // Design preview from Settings (?preview_design=maison&preview_colors=a16207,422006).
  // Passed to the store layout as a header; the layout only applies it for the logged-in seller.
  const headers = new Headers(req.headers);
  headers.delete(PREVIEW_HEADER); // never trust one sent by the browser
  const design = url.searchParams.get("preview_design");
  if (design && /^[a-z]{2,20}$/.test(design)) {
    const colors = url.searchParams.get("preview_colors") ?? "";
    headers.set(PREVIEW_HEADER, /^[0-9a-f]{6},[0-9a-f]{6}$/i.test(colors) ? `${design};${colors}` : design);
  }
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Skip Next internals, API routes and static files (anything with a dot).
  // /s/* and /admin/* are listed too: internal paths contain a dot (/s/demo.localhost/...)
  // and would otherwise skip the "not reachable directly" check above.
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\..*).*)", "/s/:path*", "/admin/:path*"],
};
