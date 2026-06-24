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
    <Link href={`/store/${slug}/cart`}
      className="relative text-gray-700 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
      🛒 Cart
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
