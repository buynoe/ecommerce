"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CartBadge from "@/components/storefront/CartBadge";

export default function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cart, setCart] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prisma_getStore();
  }, [slug]);

  async function prisma_getStore() {
    const sr = await fetch(`/api/storefront/product?slug=${slug}&handle=__store_info__`).catch(() => null);
    // Get store info
    const storeRes = await fetch(`/api/storefront/cart?storeId=&slug=${slug}`).catch(() => null);
    // Workaround: get storeId from slug
    const infoRes = await fetch(`/api/storefront/storeinfo?slug=${slug}`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      setStore(info.store);
      loadCart(info.store.id);
    } else {
      setLoading(false);
    }
  }

  async function loadCart(storeId: string) {
    const r = await fetch(`/api/storefront/cart?storeId=${storeId}`);
    const d = await r.json();
    setCart(d.cart);
    setLoading(false);
  }

  async function updateQty(variantId: string, quantity: number) {
    if (!store) return;
    await fetch("/api/storefront/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, variantId, quantity, action: "update" }) });
    loadCart(store.id);
  }

  async function remove(variantId: string) {
    if (!store) return;
    await fetch("/api/storefront/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: store.id, variantId, action: "remove" }) });
    loadCart(store.id);
  }

  const subtotal = cart?.items?.reduce((s: number, i: { quantity: number; variant: { price: number } }) => s + i.quantity * i.variant.price, 0) || 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">Loading cart…</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2 text-xl font-bold text-gray-900">
            {store?.logo && <img src={store.logo} alt={store.name} className="w-7 h-7 rounded-lg object-cover" />}
            {store?.name || slug}
          </Link>
          <div className="flex items-center gap-4">
            <Link href={`/store/${slug}`} className="text-sm text-gray-500 hover:text-gray-700">← Continue Shopping</Link>
            {store?.id && <CartBadge slug={slug} storeId={store.id} />}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart ({cart?.items?.length || 0} items)</h1>

        {!cart?.items?.length ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-semibold text-gray-700">Your cart is empty</h2>
            <Link href={`/store/${slug}`} className="mt-4 inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700">Shop Now</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cart.items.map((item: { id: string; quantity: number; variant: { id: string; price: number; title: string; options: Record<string, string>; imageUrl?: string | null; product: { title: string; handle: string; images: { url: string }[] } } }) => {
                const imgSrc = item.variant.imageUrl || item.variant.product.images?.[0]?.url || null;
                return (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                    {imgSrc
                      ? <img src={imgSrc} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{item.variant.product.title}</h3>
                    {item.variant.title !== "Default" && <p className="text-xs text-gray-500">{item.variant.title}</p>}
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(item.variant.price, store?.currency)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQty(item.variant.id, item.quantity - 1)} className="w-7 h-7 border border-gray-200 rounded text-sm hover:bg-gray-50">−</button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.variant.id, item.quantity + 1)} className="w-7 h-7 border border-gray-200 rounded text-sm hover:bg-gray-50">+</button>
                      <button onClick={() => remove(item.variant.id)} className="text-xs text-red-500 hover:underline ml-2">Remove</button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">{formatCurrency(item.variant.price * item.quantity, store?.currency)}</p>
                  </div>
                </div>
              ); })}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 h-fit">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal, store?.currency)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="text-green-600">Calculated at checkout</span></div>
                <div className="flex justify-between text-gray-600"><span>Tax (GST)</span><span>Calculated at checkout</span></div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Estimated Total</span><span>{formatCurrency(subtotal, store?.currency)}</span></div>
              </div>
              <Link href={`/store/${slug}/checkout`} className="block w-full mt-5 bg-green-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-green-700 transition-colors">
                Proceed to Checkout →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
