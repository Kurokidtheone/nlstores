/** Shown when a product has no photo yet */
export function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--soft)] p-4 text-center">
      <span className="store-heading store-brand line-clamp-3 text-xl font-extrabold opacity-70">{name}</span>
    </div>
  );
}
