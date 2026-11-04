"use client";
import { useState, useTransition } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { CommuneSelect } from "@/designs/shared/CommuneSelect";
import { WILAYAS, wilayaName } from "@/lib/algeria/wilayas";
import { waLink } from "@/lib/algeria/phone";
import { formatDA } from "@/lib/format";
import { NEXT, STATUS } from "@/lib/order-status";
import type { Lang, Msg, Order, OrderStatus, VariantGroup } from "@/lib/types";
import { blockOrderPhone, bulkSetStatus, editOrder, markNoAnswer, setOrderStatus } from "../../actions";

export type ProductInfo = { variants: VariantGroup[]; qtys: number[] };

const STATUSES = Object.keys(STATUS) as OrderStatus[];

export function OrdersList({ orders, products, messages, lang }: { orders: Order[]; products: Record<number, ProductInfo>; messages: Record<number, string>; lang: Lang }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("confirmed");
  const [editing, setEditing] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allOn = selected.size === orders.length && orders.length > 0;

  return (
    <>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(orders.map((o) => o.id)))} />
        Tout sélectionner · <span className="ar">تحديد الكل</span> ({orders.length})
      </label>
      {toast && <p className="mb-2 rounded-xl bg-green-100 p-2 text-center text-sm font-semibold text-green-800" role="status">{toast}</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <OrderCard
            key={o.id}
            o={o}
            message={messages[o.id]}
            lang={lang}
            checked={selected.has(o.id)}
            onCheck={() => toggle(o.id)}
            onEdit={() => setEditing(o)}
          />
        ))}
      </ul>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur" data-testid="bulk-bar">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <span className="flex-none text-sm font-bold">{selected.size} ✓</span>
            <select className="dash-input !min-h-11 flex-1" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as OrderStatus)} aria-label="Nouveau statut">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS[s].fr} · {STATUS[s].ar}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending}
              className="dash-btn dash-btn-primary !min-h-11 flex-none text-sm"
              onClick={() =>
                start(async () => {
                  const r = await bulkSetStatus([...selected], bulkStatus);
                  setSelected(new Set());
                  setToast(`${r.count} commande(s) → ${STATUS[bulkStatus].fr} · ${STATUS[bulkStatus].ar}`);
                })
              }
            >
              Appliquer · <span className="ar">تطبيق</span>
            </button>
          </div>
        </div>
      )}

      {editing && <OrderSheet order={editing} info={editing.product_id ? products[editing.product_id] : undefined} onClose={() => setEditing(null)} onSaved={(total) => {
        setEditing(null);
        setToast(`Commande #${editing.id} enregistrée · total ${formatDA(total)}`);
      }} />}
    </>
  );
}

function OrderCard({ o, message, lang, checked, onCheck, onEdit }: { o: Order; message: string; lang: Lang; checked: boolean; onCheck: () => void; onEdit: () => void }) {
  const [showMsg, setShowMsg] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <li className={`dash-card space-y-3 p-4 ${checked ? "ring-2 ring-[var(--brand)]" : ""}`} data-testid={`order-${o.id}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-6 w-6 flex-none" checked={checked} onChange={onCheck} aria-label={`Sélectionner #${o.id}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold" dir="auto">{o.customer_name}</p>
              <p className="text-sm text-gray-500">#{o.id} · {o.created_at.slice(5, 16)}</p>
            </div>
            <span className={`flex-none rounded-full px-3 py-1 text-xs font-bold ${STATUS[o.status].cls}`}>
              {STATUS[o.status].fr}
              {o.status === "no_answer" && ` ×${o.no_answer_count}`}
            </span>
          </div>
        </div>
      </div>
      {o.is_duplicate === 1 && <p className="rounded-lg bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">⚠️ Doublon (même numéro &lt; 24 h) · <span className="ar">طلب مكرر</span></p>}
      <p className="text-sm" dir="auto">
        {o.qty} × {o.product_name}
        {o.variant && <span className="text-gray-500"> ({o.variant})</span>}
      </p>
      <p className="text-sm text-gray-600">
        {wilayaName(o.wilaya, "fr")} · <span dir="auto">{o.commune}</span> · {o.delivery_type === "home" ? "Domicile" : "Stop desk"}
        {o.address && <> · <span dir="auto">{o.address}</span></>}
      </p>
      <p className="text-xl font-black"><bdi>{formatDA(o.total)}</bdi></p>
      <div className="grid grid-cols-2 gap-2">
        <a href={`tel:${o.phone}`} className="dash-btn dash-btn-primary" dir="ltr">📞 {o.phone}</a>
        <button type="button" onClick={() => setShowMsg((v) => !v)} className="dash-btn bg-[#25d366] text-sm text-white">
          💬 WhatsApp
        </button>
        {showMsg && (
          <div className="col-span-2 space-y-2" data-testid="buyer-message">
            <div dir={lang === "ar" ? "rtl" : "ltr"} className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm [unicode-bidi:plaintext]">{message}</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="dash-btn dash-btn-ghost !min-h-11 text-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(message).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copié ✓" : "📋 Copier · نسخ"}
              </button>
              <a href={waLink(o.phone, message)} target="_blank" rel="noopener" className="dash-btn !min-h-11 bg-[#25d366] text-sm text-white">
                Envoyer · <span className="ar">إرسال</span>
              </a>
            </div>
          </div>
        )}
        <button type="button" onClick={onEdit} className="dash-btn dash-btn-ghost col-span-2 text-sm">
          ✏️ Modifier · <span className="ar">تعديل</span>
        </button>
        {(o.status === "new" || o.status === "no_answer") && (
          <form action={markNoAnswer}>
            <input type="hidden" name="id" value={o.id} />
            <button className="dash-btn dash-btn-ghost w-full text-sm">🔕 Pas de réponse</button>
          </form>
        )}
        {(NEXT[o.status] ?? []).map((st) => (
          <form key={st} action={setOrderStatus}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="status" value={st} />
            <button className={`dash-btn w-full text-sm ${st === "cancelled" || st === "returned" ? "dash-btn-danger" : "dash-btn-ghost"}`}>{STATUS[st].fr}</button>
          </form>
        ))}
      </div>
      {(o.status === "new" || o.status === "no_answer" || o.status === "cancelled") && (
        <form action={blockOrderPhone}>
          <input type="hidden" name="id" value={o.id} />
          <button className="w-full text-center text-xs text-red-700 underline">Bloquer ce numéro (fausse commande) · حظر الرقم</button>
        </form>
      )}
    </li>
  );
}

/** "Taille: M / Couleur: Rouge" -> { Taille: "M", Couleur: "Rouge" } */
function parseVariant(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(" / ")) {
    const i = part.indexOf(": ");
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 2);
  }
  return out;
}

function OrderSheet({ order, info, onClose, onSaved }: { order: Order; info?: ProductInfo; onClose: () => void; onSaved: (total: number) => void }) {
  const [name, setName] = useState(order.customer_name);
  const [phone, setPhone] = useState(order.phone);
  const [wilaya, setWilaya] = useState(order.wilaya);
  const [commune, setCommune] = useState(order.commune);
  const [address, setAddress] = useState(order.address);
  const [deliveryType, setDeliveryType] = useState(order.delivery_type);
  const [qty, setQty] = useState(order.qty);
  const [variant, setVariant] = useState<Record<string, string>>(parseVariant(order.variant));
  const [error, setError] = useState<{ msg: Msg; field?: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await editOrder(order.id, { name, phone, wilaya, commune, address, delivery_type: deliveryType, qty, variant });
      if (r.ok) onSaved(r.total);
      else setError({ msg: r.error, field: r.field });
    });
  const err = (f: string) => (error?.field === f ? <FieldError msg={error.msg} /> : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="dialog" aria-modal="true" aria-label={`Commande #${order.id}`} onClick={onClose}>
      <div className="mx-auto max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()} data-testid="order-sheet">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Commande #{order.id} · <span className="ar">الطلب</span></h2>
          <button type="button" onClick={onClose} className="dash-icon-btn" aria-label="Fermer">✕</button>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1">
            <Bi fr="Nom" ar="الاسم" />
            <input className="dash-input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nom" />
            {err("name")}
          </label>
          <label className="block space-y-1">
            <Bi fr="Téléphone" ar="الهاتف" />
            <input className="dash-input" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Téléphone" />
            {err("phone")}
          </label>
          <label className="block space-y-1">
            <Bi fr="Wilaya" ar="الولاية" />
            <select className="dash-input" value={wilaya} onChange={(e) => setWilaya(Number(e.target.value))} aria-label="Wilaya">
              {WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>{String(w.code).padStart(2, "0")} - {w.fr} · {w.ar}</option>
              ))}
            </select>
          </label>
          <div className="space-y-1">
            <Bi fr="Commune" ar="البلدية" />
            <CommuneSelect lang="fr" wilaya={wilaya} value={commune} onChange={setCommune} inputClass="dash-input" invalid={error?.field === "commune"} />
            {err("commune")}
          </div>
          <label className="block space-y-1">
            <Bi fr="Adresse" ar="العنوان" />
            <input className="dash-input" dir="auto" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Adresse" />
          </label>
          <div>
            <Bi fr="Livraison" ar="التوصيل" />
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["home", "desk"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={deliveryType === t} onClick={() => setDeliveryType(t)} className={`dash-btn !min-h-11 text-sm ${deliveryType === t ? "dash-btn-primary" : "dash-btn-ghost"}`}>
                  {t === "home" ? "Domicile · المنزل" : "Stop desk · المكتب"}
                </button>
              ))}
            </div>
            {err("delivery_type")}
          </div>
          {info ? (
            <>
              <label className="block space-y-1">
                <Bi fr="Quantité" ar="الكمية" />
                <select className="dash-input" value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Quantité">
                  {info.qtys.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
                {err("qty")}
              </label>
              {info.variants.map((g) => (
                <label key={g.name} className="block space-y-1">
                  <span className="block font-semibold" dir="auto">{g.name}</span>
                  <select className="dash-input" dir="auto" value={variant[g.name] ?? ""} onChange={(e) => setVariant((v) => ({ ...v, [g.name]: e.target.value }))} aria-label={g.name}>
                    <option value="">—</option>
                    {g.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
              ))}
              {err("variant")}
            </>
          ) : (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              Produit supprimé : quantité et variante gardées. <span className="ar block">المنتج محذوف: الكمية والخيار محفوظان.</span>
            </p>
          )}
          {error && !["name", "phone", "commune", "delivery_type", "qty", "variant"].includes(error.field ?? "") && <FieldError msg={error.msg} />}
          <p className="text-xs text-gray-500">
            Le total est recalculé à l&apos;enregistrement (prix, offres et livraison actuels). <span className="ar block">يعاد حساب المجموع عند الحفظ.</span>
          </p>
          <button type="button" disabled={pending} onClick={save} className="dash-btn dash-btn-primary min-h-14 w-full text-lg">
            {pending ? "…" : "💾 Enregistrer · حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}
