import type { Metadata } from "next";
import { readSession, ADMIN_COOKIE } from "@/lib/auth";
import { adminLogout } from "./actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const loggedIn = (await readSession(ADMIN_COOKIE))?.role === "admin";
  return (
    <div className="dash">
      {loggedIn && <AdminNav logout={adminLogout} />}
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
