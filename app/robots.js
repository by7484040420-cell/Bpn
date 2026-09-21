const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

// GAP FIX: robots.txt bhi missing tha. Admin panel aur API routes ko crawl
// se block kiya (koi SEO value nahi, ulta admin URL leak hone se bachta
// hai), baaki sab allow.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
