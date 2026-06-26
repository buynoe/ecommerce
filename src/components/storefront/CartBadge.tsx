"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CartBadge({ slug, storeId }: { slug: string; storeId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchCount() {
      try {
        const r = await fetch(`/api/storefront/cart?storeId=${storeId}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const items = d.cart?.items ?? [];
        const total = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        if (isMounted) setCount(total);
      } catch { /* ignore */ }
    }

    fetchCount();

    // Re-fetch when user returns to the tab (e.g. after adding to cart on product page)
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    // Also listen for custom cart-updated events
    const onCartUpdate = () => fetchCount();
    window.addEventListener("cart-updated", onCartUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cart-updated", onCartUpdate);
    };
  }, [storeId]);

  return (
    <Link href={`/store/${slug}/cart`} aria-label="Cart"
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] sf-chip-solid text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
