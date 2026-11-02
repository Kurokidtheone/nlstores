import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash">
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
