"use client";
import { useState } from "react";
import { waLink } from "@/lib/algeria/phone";
import type { Lang } from "@/lib/types";

/** A ready-to-send WhatsApp message: preview + Copy + Send on WhatsApp */
export function MessageBox({ message, phone, lang, onSend }: { message: string; phone: string; lang: Lang; onSend?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        data-testid="message"
        className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed [unicode-bidi:plaintext]"
      >
        {message}
      </div>
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
          {copied ? "Copié ✓" : "📋 Copier"}
        </button>
        <a href={waLink(phone, message)} target="_blank" rel="noopener" onClick={onSend} className="dash-btn !min-h-11 bg-[#25d366] text-sm text-white">
          💬 WhatsApp
        </a>
      </div>
    </div>
  );
}
