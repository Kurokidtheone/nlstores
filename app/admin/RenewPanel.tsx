"use client";
import { useState, useTransition } from "react";
import { UploadField } from "@/components/UploadField";
import { formatDA } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/plans";
import { dmy } from "@/lib/store-state";
import { renewWithPayment, type RenewResult } from "./actions";
import { MessageBox } from "./MessageBox";

/** +1 year with payment: amount (8,000 / 13,000 DA), method, receipt photo -> thank-you message */
export function RenewPanel({ storeId, storeName, amount: defaultAmount }: { storeId: number; storeName: string; amount: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState("ccp");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [result, setResult] = useState<RenewResult | null>(null);
  const [pending, start] = useTransition();

  if (result?.ok) {
    return (
      <div className="space-y-2 rounded-xl border-2 border-green-300 bg-green-50 p-3" data-testid="renew-done">
        <p className="font-bold text-green-800">✅ Renouvelée jusqu&apos;au {dmy(result.expiresAt)}</p>
        <MessageBox message={result.message} phone={result.phone} lang={result.lang} />
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="dash-btn dash-btn-ghost w-full !min-h-11 text-sm">
        🔄 Renouveler (+1 an)
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid="renew-form">
      <p className="font-bold">Renouveler « {storeName} »</p>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Montant (DA)</span>
        <input className="dash-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))} aria-label="Montant du renouvellement" />
        <span className="text-xs text-gray-500">Tarif : {formatDA(defaultAmount)}</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button key={m.id} type="button" aria-pressed={method === m.id} onClick={() => setMethod(m.id)} className={`dash-btn !min-h-11 text-sm ${method === m.id ? "dash-btn-primary" : "dash-btn-ghost"}`}>
            {m.fr}
          </button>
        ))}
      </div>
      {receipt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/admin/media/${receipt}`} alt="Reçu" className="h-20 w-20 rounded-lg border object-cover" />
      )}
      <UploadField endpoint="/api/admin/upload?kind=receipt" label={{ fr: receipt ? "Changer le reçu" : "Photo du reçu", ar: "صورة الوصل" }} onUploaded={setReceipt} />
      {result && !result.ok && <p role="alert" className="text-sm font-semibold text-red-700">{result.error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} className="dash-btn dash-btn-ghost !min-h-11 text-sm">Annuler</button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setResult(await renewWithPayment({ storeId, amount, method, receipt_key: receipt })))}
          className="dash-btn dash-btn-primary !min-h-11 text-sm"
        >
          {pending ? "…" : "✅ Confirmer"}
        </button>
      </div>
    </div>
  );
}
