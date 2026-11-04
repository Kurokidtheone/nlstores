"use client";
import { useRef, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { Placeholder } from "./Placeholder";

/** Swipeable photos (scroll-snap) + thumbnails. First photo = main photo. */
export function Gallery({ images, name, portrait }: { images: string[]; name: string; portrait: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const aspect = portrait ? "aspect-[3/4]" : "aspect-square";

  if (images.length === 0)
    return (
      <div className={`${aspect} store-img overflow-hidden`}>
        <Placeholder name={name} />
      </div>
    );

  const go = (i: number) => {
    const el = track.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <div>
      <div
        ref={track}
        dir="ltr"
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className={`store-img flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] ${aspect}`}
      >
        {images.map((k, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={k}
            src={mediaUrl(k)}
            alt={i === 0 ? name : ""}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
            className="h-full w-full flex-none snap-center object-cover"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div dir="ltr" className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((k, i) => (
            <button
              key={k}
              type="button"
              onClick={() => go(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-14 w-14 flex-none overflow-hidden rounded-lg border-2 ${i === active ? "border-[var(--brand)]" : "border-transparent opacity-70"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(k)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
