import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import StorefrontBannerSlider from "@/components/storefront/BannerSlider";
import CartBadge from "@/components/storefront/CartBadge";
import AnimateOnScroll from "@/components/storefront/AnimateOnScroll";
import { Metadata } from "next";
import { cloudinaryTransform } from "@/lib/cloudinary";

const BASE = "https://ecomm.buynoe.com";
// Resize collection tiles: 400px wide, 195:370 ratio, fill crop, auto quality/format
const COLLECTION_TRANSFORMS = "w_400,ar_195:370,c_fill,g_auto,q_auto,f_auto";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { name: true, description: true, logo: true, metaTitle: true, metaDesc: true },
  });
  if (!store) return { title: "Store Not Found" };

  const title = store.metaTitle || `${store.name} — Official Store`;
  const description = store.metaDesc || store.description || `Shop at ${store.name} — Browse our latest products, exclusive deals and fast delivery.`;
  const url = `${BASE}/store/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(store.logo && { images: [{ url: store.logo, alt: store.name }] }),
    },
    twitter: {
      card: store.logo ? "summary_large_image" : "summary",
      title,
      description,
      ...(store.logo && { images: [store.logo] }),
    },
    robots: { index: true, follow: true },
  };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      collections: { where: { status: "ACTIVE" }, take: 8 },
      banners: { where: { isActive: true }, orderBy: { position: "asc" } },
      products: {
        where: { status: "ACTIVE" },
        include: { images: { where: { isFeatured: true }, take: 1 }, variants: { where: { status: "ACTIVE" }, include: { inventoryItem: { select: { available: true } } }, orderBy: { price: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });
  if (!store) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
            {store.logo && (
              <img src={store.logo} alt={store.name} className="w-8 h-8 rounded-lg object-cover" />
            )}
            {store.name}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href={`/store/${slug}/search`} className="text-sm text-gray-600 hover:text-gray-900">Products</Link>
            {store.collections.slice(0, 5).map(c => (
              <Link key={c.id} href={`/store/${slug}/collections/${c.handle}`} className="text-sm text-gray-600 hover:text-gray-900">{c.title}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href={`/store/${slug}/search`} className="text-gray-500 hover:text-gray-900">🔍</Link>
            <Link href={`/store/${slug}/account`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium">
              👤 My Account
            </Link>
            <CartBadge slug={slug} storeId={store.id} />
          </div>
        </div>
      </header>

      {/* Hero Banners (dynamic from merchant) */}
      {store.banners.length > 0 ? (
        <StorefrontBannerSlider banners={store.banners} slug={slug} />
      ) : (
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">{store.name}</h1>
            {store.description && <p className="text-xl text-gray-300 mb-8">{store.description}</p>}
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href={`/store/${slug}/search`} className="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                Shop All Products
              </Link>
              {store.collections[0] && (
                <Link href={`/store/${slug}/collections/${store.collections[0].handle}`} className="border border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                  Browse Collections
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Collections */}
      {store.collections.length > 0 && (
        <section className="py-12 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <AnimateOnScroll from="bottom">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
            </AnimateOnScroll>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {store.collections.map((c, i) => (
                <AnimateOnScroll key={c.id} from="bottom" delay={i * 60}>
                  <Link href={`/store/${slug}/collections/${c.handle}`}
                    className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow hover:border-green-300 group h-full">
                    <div className="relative w-full bg-gray-100 overflow-hidden" style={{ aspectRatio: "195/370" }}>
                      {c.imageUrl ? (
                        <img src={cloudinaryTransform(c.imageUrl, COLLECTION_TRANSFORMS)} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 group-hover:scale-110 transition-transform duration-300">
                          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center">
                      <h3 className="font-semibold text-gray-900 text-sm">{c.title}</h3>
                    </div>
                  </Link>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <AnimateOnScroll from="bottom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Latest Products</h2>
              <Link href={`/store/${slug}/search`} className="text-sm text-green-600 hover:text-green-700 font-semibold border border-green-200 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
                View All →
              </Link>
            </div>
          </AnimateOnScroll>
          {store.products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🏪</div>
              <p className="text-xl font-medium">Coming Soon</p>
              <p className="mt-2">Products are being added. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {store.products.map((product, i) => {
                const cheapestInStock = product.variants.find(v => (v.inventoryItem?.available ?? 0) > 0);
                const displayVariant = cheapestInStock ?? product.variants[0];
                const price = displayVariant?.price || 0;
                const compareAt = displayVariant?.compareAtPrice;
                const isOutOfStock = !cheapestInStock;
                const img = product.images[0]?.url;
                const discount = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
                return (
                  <AnimateOnScroll key={product.id} from="bottom" delay={i * 50}>
                    <Link href={`/store/${slug}/products/${product.handle}`}
                      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow relative block h-full">
                      {discount > 0 && (
                        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{discount}% OFF</div>
                      )}
                      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                        {img
                          ? <img src={img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <span className="text-5xl">📦</span>}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{product.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{formatCurrency(price, store.currency)}</span>
                          {compareAt && compareAt > price && <span className="text-xs text-gray-400 line-through">{formatCurrency(compareAt, store.currency)}</span>}
                        </div>
                        {isOutOfStock && <p className="text-xs text-red-500 mt-1">Out of stock</p>}
                      </div>
                    </Link>
                  </AnimateOnScroll>
                );
              })}
            </div>
          )}
          {store.products.length > 0 && (
            <AnimateOnScroll from="fade" delay={200}>
              <div className="text-center mt-10">
                <Link href={`/store/${slug}/search`}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
                  View All Products →
                </Link>
              </div>
            </AnimateOnScroll>
          )}
        </div>
      </section>

      {/* Footer */}
      <AnimateOnScroll from="fade">
      <footer className="bg-gray-900 text-gray-400 py-12 px-6 mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <p className="text-white font-bold text-lg mb-2">{store.name}</p>
              {store.description && <p className="text-sm leading-relaxed">{store.description}</p>}
            </div>
            {/* Collections / Categories */}
            {store.collections.length > 0 && (
              <div>
                <p className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">Collections</p>
                <ul className="space-y-2">
                  {store.collections.map(c => (
                    <li key={c.id}>
                      <Link href={`/store/${slug}/collections/${c.handle}`} className="text-sm hover:text-white transition-colors">
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Quick Links */}
            <div>
              <p className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">Quick Links</p>
              <ul className="space-y-2 text-sm">
                <li><Link href={`/store/${slug}/search`} className="hover:text-white transition-colors">All Products</Link></li>
                <li><Link href={`/store/${slug}/account`} className="hover:text-white transition-colors">My Account</Link></li>
                <li><Link href={`/store/${slug}/cart`} className="hover:text-white transition-colors">Cart</Link></li>
                <li><Link href={`/store/${slug}/account`} className="hover:text-white transition-colors">Track Order</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs">&copy; {new Date().getFullYear()} {store.name}. All rights reserved.</p>
            <p className="text-xs">Powered by <Link href="/" className="text-green-400 hover:underline">Buynoe</Link></p>
          </div>
        </div>
      </footer>
      </AnimateOnScroll>
    </div>
  );
}
