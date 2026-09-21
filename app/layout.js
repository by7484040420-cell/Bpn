import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import WebsiteModalProvider from "@/components/WebsiteModalProvider";
import Footer from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

// GAP FIX: metadataBase missing tha (Next.js console warning + relative OG
// image URLs broken rehte social share pe), aur koi openGraph/twitter card
// nahi thi — WhatsApp/Facebook pe link share karne par plain text dikhta,
// koi preview card nahi.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sarkari AI — Jobs, Exams & Documents",
    template: "%s",
  },
  description: "Latest sarkari jobs, admit cards, results aur documents — ek jagah, AI ke saath.",
  openGraph: {
    title: "Sarkari AI — Jobs, Exams & Documents",
    description: "Latest sarkari jobs, admit cards, results aur documents — ek jagah, AI ke saath.",
    type: "website",
    locale: "hi_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sarkari AI — Jobs, Exams & Documents",
    description: "Latest sarkari jobs, admit cards, results aur documents — ek jagah, AI ke saath.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>
        <AuthProvider>
          <WebsiteModalProvider>
            {children}
            <Footer />
          </WebsiteModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
