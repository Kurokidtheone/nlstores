import { Bi, PageTitle } from "@/components/dash/ui";
import { waLink } from "@/lib/algeria/phone";
import { SUPPORT_WHATSAPP, TUTORIALS } from "@/lib/help";
import { requireSeller } from "@/lib/tenant";

export default async function HelpPage() {
  const { store, host } = await requireSeller();
  const message = `السلام عليكم، أحتاج مساعدة في متجري ${store.name} (${host})`;
  return (
    <>
      <PageTitle fr="Aide" ar="مساعدة" />
      <section className="dash-card space-y-3 p-4">
        <h2 className="text-lg">
          <Bi fr="🎬 Tutoriels vidéo" ar="شروحات بالفيديو" className="[&>span:first-child]:font-extrabold" />
        </h2>
        <ul className="space-y-2">
          {TUTORIALS.map((v, i) => (
            <li key={v.fr}>
              {v.url ? (
                <a href={v.url} target="_blank" rel="noopener" className="dash-btn dash-btn-ghost w-full !justify-start text-left">
                  <span className="text-xl" aria-hidden>▶️</span>
                  <Bi fr={`${i + 1}. ${v.fr}`} ar={v.ar} />
                </a>
              ) : (
                <div className="dash-btn w-full !justify-between border border-dashed border-gray-300 bg-gray-50 text-left text-gray-500">
                  <Bi fr={`${i + 1}. ${v.fr}`} ar={v.ar} />
                  <span className="flex-none rounded-full bg-gray-200 px-2 py-0.5 text-xs">Bientôt · قريبا</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="dash-card mt-4 space-y-3 p-4 text-center">
        <p>
          Une question ? Nous répondons sur WhatsApp. <span className="ar block">عندك سؤال؟ نجيبك على واتساب.</span>
        </p>
        <a href={waLink(SUPPORT_WHATSAPP, message)} target="_blank" rel="noopener" className="dash-btn min-h-14 w-full bg-[#25d366] text-lg text-white">
          💬 Support WhatsApp · <span className="ar">الدعم</span>
        </a>
        <p className="text-sm text-gray-500" dir="ltr">{SUPPORT_WHATSAPP.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}</p>
      </section>
    </>
  );
}
