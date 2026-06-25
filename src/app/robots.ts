import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://ecomm.buynoe.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/store/"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/store/*/cart",
          "/store/*/checkout",
          "/store/*/account",
          "/store/*/order-success",
          "/store/*/payment-callback",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
