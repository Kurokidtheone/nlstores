// Default "delivery & returns" text, used while stores.policy is NULL (new stores),
// in the store's current language. The seller edits it in Settings.
import type { Lang } from "./types";

export const DEFAULT_POLICY: Record<Lang, string> = {
  ar: `التوصيل
- نوصل إلى جميع الولايات الـ 69، إلى المنزل أو إلى مكتب التوصيل.
- مدة التوصيل من 2 إلى 5 أيام عمل حسب الولاية.
- الدفع عند الاستلام: تدفع فقط عندما تستلم طلبك.
- سنتصل بك هاتفيا لتأكيد الطلب قبل الإرسال.

الاستبدال والإرجاع
- يمكنك فحص المنتج أمام عامل التوصيل قبل الدفع.
- إذا وصلك منتج معيب أو غير مطابق، تواصل معنا خلال 48 ساعة لاستبداله.
- المنتجات المستعملة أو غير الموجودة في علبتها الأصلية لا تُستبدل.
- مصاريف الإرجاع على عاتقنا إذا كان الخطأ منا.`,
  fr: `Livraison
- Nous livrons dans les 69 wilayas, à domicile ou au bureau (stop desk).
- Délai : 2 à 5 jours ouvrables selon la wilaya.
- Paiement à la livraison : vous payez seulement à la réception.
- Nous vous appelons pour confirmer la commande avant l'envoi.

Échange et retour
- Vous pouvez vérifier le produit devant le livreur avant de payer.
- Produit défectueux ou non conforme : contactez-nous sous 48 heures pour l'échanger.
- Les produits utilisés ou sans leur emballage d'origine ne sont pas échangés.
- Les frais de retour sont à notre charge si l'erreur vient de nous.`,
};

export function policyText(policy: string | null, lang: Lang): string {
  return policy?.trim() ? policy : DEFAULT_POLICY[lang];
}
