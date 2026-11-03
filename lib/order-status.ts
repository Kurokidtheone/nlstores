import type { OrderStatus } from "./types";

/** Status labels (French + Arabic) and badge colors of the orders screen */
export const STATUS: Record<OrderStatus, { fr: string; ar: string; cls: string }> = {
  new: { fr: "Nouvelle", ar: "جديدة", cls: "bg-blue-100 text-blue-800" },
  no_answer: { fr: "Pas de réponse", ar: "لا يرد", cls: "bg-amber-100 text-amber-800" },
  confirmed: { fr: "Confirmée", ar: "مؤكدة", cls: "bg-green-100 text-green-800" },
  shipped: { fr: "Expédiée", ar: "تم الإرسال", cls: "bg-indigo-100 text-indigo-800" },
  delivered: { fr: "Livrée", ar: "تم التوصيل", cls: "bg-emerald-100 text-emerald-800" },
  returned: { fr: "Retour", ar: "مرتجع", cls: "bg-gray-200 text-gray-700" },
  cancelled: { fr: "Annulée", ar: "ملغاة", cls: "bg-red-100 text-red-800" },
};

/** Next steps offered on each order card */
export const NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  new: ["confirmed", "cancelled"],
  no_answer: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
};
