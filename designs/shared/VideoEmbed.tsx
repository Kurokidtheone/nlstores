import { videoEmbed } from "@/lib/video";

/** YouTube / Facebook player. Renders nothing for an unknown link. */
export function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  const v = videoEmbed(url);
  if (!v) return null;
  return (
    <div className={`overflow-hidden bg-black store-img ${v.kind === "facebook" ? "aspect-[9/12]" : "aspect-video"}`}>
      <iframe
        src={v.src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
