import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tableau de bord", robots: { index: false } };

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return <div className="dash">{children}</div>;
}
