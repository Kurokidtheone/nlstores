// YouTube / Facebook link -> embeddable iframe URL. Used by the editor preview, the server
// validation and the storefront, so all three agree on what is a valid link.

export type VideoEmbed = { kind: "youtube" | "facebook"; src: string };

export function videoEmbed(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.|web\.)/, "");

  const yt = (id: string | null | undefined) =>
    id && /^[\w-]{6,20}$/.test(id) ? ({ kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` } as const) : null;

  if (host === "youtu.be") return yt(url.pathname.split("/")[1]);
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") return yt(url.searchParams.get("v"));
    const m = url.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
    return m ? yt(m[2]) : null;
  }

  if (host === "facebook.com" || host === "fb.watch") {
    const isVideo =
      host === "fb.watch" ||
      /\/videos\/|\/reel\/|\/watch\/?$|\/share\/(v|r)\//.test(url.pathname) ||
      (url.pathname.startsWith("/watch") && url.searchParams.has("v"));
    if (!isVideo) return null;
    const href = `https://www.facebook.com${url.pathname}${url.search}`;
    const clean = host === "fb.watch" ? url.toString() : href;
    return {
      kind: "facebook",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=false`,
    };
  }
  return null;
}
