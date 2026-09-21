import Link from "next/link";

// GAP FIX: Privacy Policy / Terms pages ban gaye (see app/privacy,
// app/terms) lekin site mein kahin link hi nahi thi — na koi user unhe
// dhoond sakta, na AdSense/Google unhe crawl kar pata. Simple footer add
// kiya jo har page ke neeche dikhega.
export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-8 mb-16 md:mb-0">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>© {new Date().getFullYear()} Sarkari AI. Yeh ek independent info platform hai, kisi sarkari department ka official portal nahi.</div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-600">Terms of Use</Link>
          <Link href="/jobs" className="hover:text-slate-600">Jobs</Link>
        </div>
      </div>
    </footer>
  );
}
