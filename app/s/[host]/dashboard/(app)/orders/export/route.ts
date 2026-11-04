// CSV of the filtered orders list, ready for courier upload. UTF-8 with BOM (Arabic text in Excel)
// and ";" as separator: Excel set to French or Arabic (Algeria) splits columns on ";".
import { wilayaName } from "@/lib/algeria/wilayas";
import { findOrders, parseOrderFilter } from "@/lib/order-query";
import { algeriaDate } from "@/lib/store-state";
import { requireSeller } from "@/lib/tenant";

const HEADER = ["Nom", "Téléphone", "Code wilaya", "Wilaya", "Commune", "Type de livraison", "Produit", "Quantité", "Total (DA)", "Adresse", "Variante", "N° commande", "Date", "Statut"];
const STATUS: Record<string, string> = { new: "Nouvelle", no_answer: "Pas de réponse", confirmed: "Confirmée", shipped: "Expédiée", delivered: "Livrée", returned: "Retour", cancelled: "Annulée" };

const cell = (v: string | number) => {
  const s = String(v ?? "").replace(/\r?\n/g, " ");
  return /[";]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const { store, db } = await requireSeller();
  const sp = new URL(req.url).searchParams;
  const orders = await findOrders(db, store.id, parseOrderFilter({ s: sp.get("s") ?? undefined, q: sp.get("q") ?? undefined }), 5000);
  const rows = orders.map((o) => [
    o.customer_name, o.phone, String(o.wilaya).padStart(2, "0"), wilayaName(o.wilaya, "fr").replace(/^\d+ - /, ""), o.commune,
    o.delivery_type === "home" ? "Domicile" : "Stop desk", o.product_name, o.qty, o.total, o.address, o.variant, o.id,
    o.created_at.slice(0, 16), STATUS[o.status] ?? o.status,
  ]);
  const csv = "﻿" + [HEADER, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="commandes-${store.slug}-${algeriaDate(Date.now())}.csv"`,
      "cache-control": "no-store",
    },
  });
}
