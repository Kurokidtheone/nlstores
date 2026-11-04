"use client";
import { useEffect, useState } from "react";

/**
 * Sticky "Order now" bar. Hidden while the order form is on screen, so it never covers the
 * form fields or the confirm button. IntersectionObserver only: no scroll listener, no library.
 */
export function StickyCta({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const form = document.getElementById("order");
    if (!form || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { rootMargin: "0px 0px -15% 0px" });
    io.observe(form);
    return () => io.disconnect();
  }, []);
  return (
    <div
      className={`store-fixed-cta fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--card)]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-200 ${hidden ? "translate-y-full" : ""}`}
      aria-hidden={hidden}
    >
      {children}
    </div>
  );
}
