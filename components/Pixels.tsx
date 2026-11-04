"use client";
import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

const ID_RE = /^[A-Za-z0-9]{5,40}$/;

/** Meta + TikTok base code (PageView). IDs come from the store settings. */
export function Pixels({ metaId, tiktokId }: { metaId: string | null; tiktokId: string | null }) {
  const meta = metaId && ID_RE.test(metaId) ? metaId : null;
  const tiktok = tiktokId && ID_RE.test(tiktokId) ? tiktokId : null;
  return (
    <>
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      )}
      {tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}

/** Fires Purchase once per order (a refresh of the thank-you page does not count twice) */
export function PurchaseEvent({ orderId, value }: { orderId: number; value: number }) {
  useEffect(() => {
    const key = `purchase-${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const fire = () => {
      window.fbq?.("track", "Purchase", { value, currency: "DZD" }, { eventID: `order-${orderId}` });
      window.ttq?.track("CompletePayment", { value, currency: "DZD", content_type: "product" });
    };
    const timer = setTimeout(fire, 800); // let the base code load first
    return () => clearTimeout(timer);
  }, [orderId, value]);
  return null;
}
