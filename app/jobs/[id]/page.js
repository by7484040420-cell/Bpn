import { getJobById } from "@/lib/db";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ApplyFlow from "@/components/ApplyFlow";
import { notFound } from "next/navigation";

// FIX: pehle yeh sirf data/jobs.js (static seed) se job dhoondta tha, isliye
// admin panel se add kiya gaya koi bhi naya job yahan "404 Not Found" deta
// tha. Ab lib/db (admin-managed, live) se job uthata hai. Jobs runtime par
// admin se badal sakte hain, isliye build-time static generation ke bajaye
// har request par fresh data lo.
export const dynamic = "force-dynamic";

// GAP FIX: pehle job pages ka apna <title>/description nahi tha (sab pages
// "Sarkari AI — Jobs, Exams & Documents" hi dikhate) aur koi structured data
// nahi thi — Google Jobs listing mein aane ke liye JobPosting schema chahiye
// hota hai. Dono add kiye.
export async function generateMetadata({ params }) {
  const job = await getJobById(params.id);
  if (!job) return { title: "Job Not Found — Bipin AI" };

  const description = `${job.title} — ${job.department}. Last date: ${job.lastDate}. Apply details, eligibility aur AI se form-fill assistance yahan.`;
  return {
    title: `${job.title} — Apply Online, Last Date, Details`,
    description,
    openGraph: {
      title: job.title,
      description,
      type: "website",
    },
    alternates: {
      canonical: `/jobs/${job.id}`,
    },
  };
}

export default async function JobDetailPage({ params }) {
  const job = await getJobById(params.id);
  if (!job) return notFound();

  const jobPostingSchema = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.subtitle || job.title,
    datePosted: job.createdAt,
    validThrough: parseDateLoose(job.lastDate),
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.department || "Government of India",
      sameAs: job.officialUrl || undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "IN",
      },
    },
  };

  return (
    <>
      <Header />
      {/* Google Jobs rich-result eligibility ke liye JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="bg-navy rounded-2xl p-6 text-white mb-6">
          <div className="text-xs text-slate-300">{job.department}</div>
          <h1 className="font-display font-bold text-2xl mt-1">{job.title}</h1>
          <div className="text-slate-300 text-sm">{job.subtitle}</div>
          <div className="mt-3 text-sm">
            Last Date: <span className="font-semibold">{job.lastDate}</span>
          </div>
        </div>

        <ApplyFlow job={job} />
      </main>
      <BottomNav />
    </>
  );
}

// last_date is a free-text field (e.g. "04 Sep 2026") entered by admin/AI,
// not always a strict ISO date — this tries a best-effort parse for the
// schema's validThrough, and just omits it if it can't confidently parse
// rather than emitting a wrong date (which Google Jobs would penalize).
function parseDateLoose(text) {
  if (!text) return undefined;
  const d = new Date(text);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
