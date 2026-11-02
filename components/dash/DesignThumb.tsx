import type { Design } from "@/designs/registry";

/** Mini store drawn with the design's own CSS ([data-design]) and the chosen colors */
export function DesignThumb({ design, primary, accent }: { design: Design; primary: string; accent: string }) {
  const aspect = design.options.gallery === "portrait" ? "aspect-[3/4]" : "aspect-square";
  return (
    <div
      data-design={design.id}
      aria-hidden
      className="pointer-events-none overflow-hidden rounded-xl border border-gray-200 text-[var(--text)]"
      style={{ "--brand": primary, "--accent": accent, background: "var(--bg)" } as React.CSSProperties}
    >
      <div className="store-accent h-2" />
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="store-heading store-brand text-[10px] font-extrabold">Boutique</span>
        <span className="h-2.5 w-2.5 rounded-full bg-[#25d366]" />
      </div>
      <div className={`grid gap-1.5 px-2 ${design.options.gridCols === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {[0, 1].slice(0, design.options.gridCols === 1 ? 1 : 2).map((i) => (
          <div key={i} className="store-card overflow-hidden">
            <div className={`store-soft ${design.options.gridCols === 1 ? "aspect-[2/1]" : aspect}`} />
            <div className="space-y-0.5 p-1">
              <div className="h-1 w-3/4 rounded bg-gray-300" />
              <div className="store-brand text-[8px] font-bold">2,900 DA</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-2">
        <div className="store-btn text-center text-[8px] leading-5">Commander</div>
      </div>
    </div>
  );
}
