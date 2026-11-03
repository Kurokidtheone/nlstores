import Link from "next/link";
import { waLink } from "@/lib/algeria/phone";
import { mediaUrl } from "@/lib/media";
import type { Store } from "@/lib/types";

export function StoreHeader({ store }: { store: Store }) {
  return (
    <header className="store-header sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--card)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {store.logo_key && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(store.logo_key)} alt="" width={36} height={36} className="h-9 w-9 flex-none rounded-lg object-cover" />
          )}
          <span className="store-heading store-brand truncate text-lg font-extrabold">{store.name}</span>
        </Link>
        {store.whatsapp && (
          <a
            href={waLink(store.whatsapp)}
            target="_blank"
            rel="noopener"
            aria-label="WhatsApp"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#25d366] text-white"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
            </svg>
          </a>
        )}
      </div>
    </header>
  );
}
