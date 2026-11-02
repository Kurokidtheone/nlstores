"use client";
import { useActionState, useState } from "react";
import { DesignThumb } from "@/components/dash/DesignThumb";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { Switch } from "@/components/dash/Switch";
import { Bi, FieldError } from "@/components/dash/ui";
import { UploadField } from "@/components/UploadField";
import { DESIGNS, getDesign } from "@/designs/registry";
import { mediaUrl } from "@/lib/media";
import { getTemplate } from "@/designs/templates";
import { policyText } from "@/lib/policy";
import type { Lang, Store } from "@/lib/types";
import { saveSettings, type SimpleState } from "../../actions";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function Card({ icon, fr, ar, children }: { icon: string; fr: string; ar: string; children: React.ReactNode }) {
  return (
    <section className="dash-card space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-lg">
        <span aria-hidden>{icon}</span>
        <Bi fr={fr} ar={ar} className="[&>span:first-child]:font-extrabold" />
      </h2>
      {children}
    </section>
  );
}

export function SettingsForm({ store }: { store: Store }) {
  const [state, action] = useActionState<SimpleState, FormData>(saveSettings, {});
  const [logo, setLogo] = useState<string | null>(store.logo_key);
  const [design, setDesign] = useState(store.design);
  const [primary, setPrimary] = useState(store.primary_color);
  const [accent, setAccent] = useState(store.accent_color);
  const [announceOn, setAnnounceOn] = useState(store.announcement_on === 1);
  const [announcement, setAnnouncement] = useState(store.announcement);
  const [lang, setLang] = useState<Lang>(store.lang);
  const [policy, setPolicy] = useState(policyText(store.policy, store.lang));

  const current = getDesign(design);
  const previewHref = `/?preview_design=${design}&preview_colors=${primary.slice(1)},${accent.slice(1)}`;

  function pickDesign(id: string) {
    // Colors chosen from the old design's palettes follow the new design; custom colors are kept
    const fromPalette = current.palettes.some((p) => same(p.primary, primary) && same(p.accent, accent));
    setDesign(id);
    if (fromPalette) {
      const p = getDesign(id).palettes[0];
      setPrimary(p.primary);
      setAccent(p.accent);
    }
  }

  // Default delivery & returns text = the design template's (designs/<id>/template.ts)
  const defaultPolicy = (l: Lang) => getTemplate(design).policy[l];

  function pickLang(l: Lang) {
    // The default policy text follows the language until the seller edits it
    if (policy.trim() === defaultPolicy(lang).trim()) setPolicy(defaultPolicy(l));
    setLang(l);
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="logo_key" value={logo ?? ""} />
      <input type="hidden" name="design" value={design} />
      <input type="hidden" name="announcement_on" value={announceOn ? "1" : "0"} />

      <Card icon="🏪" fr="Boutique" ar="المتجر">
        <label className="block space-y-1">
          <Bi fr="Nom de la boutique" ar="اسم المتجر" />
          <input name="name" defaultValue={store.name} dir="auto" maxLength={60} className="dash-input" required />
        </label>
        <div className="space-y-2">
          <Bi fr="Logo (carré)" ar="الشعار (مربع)" />
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(logo)} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl" aria-hidden>🏷️</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <UploadField square label={logo ? { fr: "Changer", ar: "تغيير" } : { fr: "Ajouter un logo", ar: "إضافة شعار" }} onUploaded={setLogo} />
              {logo && (
                <button type="button" onClick={() => setLogo(null)} className="dash-btn dash-btn-danger w-full !min-h-11 text-sm">
                  🗑️ Retirer · <span className="ar">حذف</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <label className="block space-y-1">
          <Bi fr="Langue de la boutique" ar="لغة المتجر" />
          <select name="lang" value={lang} onChange={(e) => pickLang(e.target.value as Lang)} className="dash-input">
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </label>
      </Card>

      <Card icon="🎨" fr="Design" ar="التصميم">
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Design">
          {DESIGNS.map((d) => {
            const selected = d.id === design;
            const colors = selected ? { primary, accent } : d.palettes[0];
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pickDesign(d.id)}
                className={`rounded-2xl border-2 p-2 text-left ${selected ? "border-[var(--brand)] bg-indigo-50" : "border-transparent bg-gray-50"}`}
              >
                <DesignThumb design={d} primary={colors.primary} accent={colors.accent} />
                <span className="mt-2 flex items-center gap-1 font-bold">
                  {selected && <span aria-hidden>✓</span>}
                  {d.name}
                </span>
                <span className="block text-xs leading-tight text-gray-500">{d.tagline.fr}</span>
                <span className="ar block text-xs leading-tight text-gray-500">{d.tagline.ar}</span>
              </button>
            );
          })}
        </div>
        <a href={previewHref} target="_blank" rel="noopener" className="dash-btn dash-btn-ghost w-full">
          👁️ Aperçu dans ma boutique · <span className="ar">معاينة في متجري</span>
        </a>
        <p className="-mt-2 text-center text-xs text-gray-500">
          Rien n&apos;est changé avant « Enregistrer » · <span className="ar">لا يتغير شيء قبل الحفظ</span>
        </p>
      </Card>

      <Card icon="🖌️" fr="Couleurs" ar="الألوان">
        <div className="grid grid-cols-3 gap-2">
          {current.palettes.map((p) => {
            const on = same(p.primary, primary) && same(p.accent, accent);
            return (
              <button
                key={p.fr}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPrimary(p.primary);
                  setAccent(p.accent);
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 ${on ? "border-[var(--brand)] bg-indigo-50" : "border-gray-200 bg-white"}`}
              >
                <span className="flex h-10 w-10 overflow-hidden rounded-full border border-gray-200" aria-hidden>
                  <span className="h-full w-1/2" style={{ background: p.primary }} />
                  <span className="h-full w-1/2" style={{ background: p.accent }} />
                </span>
                <span className="text-xs font-semibold leading-tight">{p.fr}</span>
                <span className="ar text-[11px] leading-tight text-gray-500">{p.ar}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-gray-500">Ou vos couleurs · <span className="ar">أو ألوانك الخاصة</span></p>
        <label className="flex items-center justify-between gap-3">
          <Bi fr="Couleur principale (boutons, prix)" ar="اللون الرئيسي (الأزرار، الأسعار)" />
          <input name="primary_color" type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-12 w-20 flex-none rounded-xl border border-gray-300" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <Bi fr="Couleur secondaire (bandeau, pied de page)" ar="اللون الثانوي (الشريط، أسفل الصفحة)" />
          <input name="accent_color" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-12 w-20 flex-none rounded-xl border border-gray-300" />
        </label>
      </Card>

      <Card icon="📢" fr="Bandeau d'annonce" ar="شريط الإعلان">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
          <Bi fr={announceOn ? "Affiché en haut de la boutique" : "Masqué"} ar={announceOn ? "ظاهر أعلى المتجر" : "مخفي"} />
          <Switch checked={announceOn} onChange={setAnnounceOn} label="Bandeau d'annonce" />
        </div>
        <label className="block space-y-1">
          <Bi fr="Texte (une ligne courte)" ar="النص (سطر قصير)" />
          <input
            name="announcement"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            dir="auto"
            maxLength={120}
            placeholder="Livraison gratuite dès 2 pièces 🚚"
            className="dash-input"
          />
          <span className="block text-end text-xs text-gray-400">{announcement.length}/120</span>
        </label>
        {announceOn && announcement.trim() && (
          <p dir="auto" className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-white" style={{ background: accent }}>
            {announcement}
          </p>
        )}
      </Card>

      <Card icon="📞" fr="Contact et publicité" ar="التواصل والإشهار">
        <label className="block space-y-1">
          <Bi fr="WhatsApp (facultatif)" ar="واتساب (اختياري)" />
          <input name="whatsapp" defaultValue={store.whatsapp ?? ""} className="dash-input" dir="ltr" inputMode="tel" placeholder="05 / 06 / 07 …" />
        </label>
        <label className="block space-y-1">
          <Bi fr="ID Pixel Meta (Facebook / Instagram)" ar="معرف بيكسل ميتا" />
          <input name="meta_pixel_id" defaultValue={store.meta_pixel_id ?? ""} className="dash-input" dir="ltr" inputMode="numeric" />
        </label>
        <label className="block space-y-1">
          <Bi fr="ID Pixel TikTok" ar="معرف بيكسل تيك توك" />
          <input name="tiktok_pixel_id" defaultValue={store.tiktok_pixel_id ?? ""} className="dash-input" dir="ltr" autoCapitalize="characters" />
        </label>
      </Card>

      <Card icon="📄" fr="Page « Livraison et retours »" ar="صفحة «التوصيل والإرجاع»">
        <p className="text-sm text-gray-500">
          Lien en bas de chaque page de la boutique. <span className="ar block">رابط في أسفل كل صفحة من المتجر.</span>
        </p>
        <textarea name="policy" value={policy} onChange={(e) => setPolicy(e.target.value)} dir="auto" maxLength={5000} rows={12} className="dash-input text-sm leading-relaxed" />
        <button type="button" onClick={() => setPolicy(defaultPolicy(lang))} className="dash-btn dash-btn-ghost w-full text-sm">
          ↺ Remettre le texte par défaut · <span className="ar">النص الافتراضي</span>
        </button>
        <a href="/policy" target="_blank" rel="noopener" className="block text-center text-sm text-[var(--brand)] underline">
          Voir la page · <span className="ar">شاهد الصفحة</span>
        </a>
      </Card>

      <div className="sticky bottom-20 z-10 space-y-2">
        <FieldError msg={state.error} />
        {state.ok && <p className="rounded-xl bg-green-100 p-2 text-center font-semibold text-green-800">Enregistré ✓ · تم الحفظ</p>}
        <SubmitButton className="dash-btn dash-btn-primary w-full shadow-lg">
          💾 Enregistrer · <span className="ar">حفظ</span>
        </SubmitButton>
      </div>
    </form>
  );
}
