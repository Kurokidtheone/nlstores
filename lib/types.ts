export type Lang = "ar" | "fr";

export type Store = {
  id: number;
  slug: string;
  name: string;
  lang: Lang;
  design: string;
  primary_color: string;
  whatsapp: string | null;
  meta_pixel_id: string | null;
  tiktok_pixel_id: string | null;
  owner_name: string;
  owner_phone: string;
  status: "active" | "suspended";
  expires_at: string;
  created_at: string;
  // 0002_store_self_service
  logo_key: string | null;
  accent_color: string;
  announcement: string;
  announcement_on: number;
  policy: string | null;
  must_change_password: number;
  password_changed_at: string | null;
  session_version: number;
  delivery_checked: number;
  // 0003_onboarding
  owner_wilaya: number | null;
  facebook_url: string | null;
  request_ref: string | null;
  // 0004_renewals: written by the daily job
  lifecycle: "active" | "grace" | "expired" | "to_delete";
};

export type VariantGroup = { name: string; options: string[] };
export type FaqItem = { q: string; a: string };

export const SECTION_KEYS = ["benefits", "steps", "reviews", "faq"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type Sections = {
  benefits: string[]; // short lines
  steps: string[]; // how to use
  reviews: string[]; // R2 keys of customer review screenshots
  faq: FaqItem[];
  hide: SectionKey[]; // sections switched off
};

export type Product = {
  id: number;
  store_id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number | null;
  images: string[]; // R2 keys, first = main photo
  video_url: string | null;
  variants: VariantGroup[];
  sections: Sections;
  visible: boolean;
  sort: number;
  /** from the design template: "Replace this sample product" until edited */
  is_sample: boolean;
};

export type Offer = { qty: number; total_price: number };

export type DeliveryPrice = { wilaya: number; home_price: number | null; desk_price: number | null };

export type OrderStatus = "new" | "confirmed" | "no_answer" | "cancelled" | "shipped" | "delivered" | "returned";

export type Order = {
  id: number;
  product_id: number | null;
  product_name: string;
  variant: string;
  qty: number;
  products_total: number;
  delivery_type: "home" | "desk";
  delivery_price: number;
  total: number;
  customer_name: string;
  phone: string;
  wilaya: number;
  commune: string;
  address: string;
  status: OrderStatus;
  no_answer_count: number;
  is_duplicate: number;
  created_at: string;
};

/** Bilingual message: French first, Arabic underneath */
export type Msg = { fr: string; ar: string };
