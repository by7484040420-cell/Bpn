import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import JobCarousel from "@/components/JobCarousel";
import AdBanner from "@/components/AdBanner";
import SubscribeWidget from "@/components/SubscribeWidget";
import PremiumButton from "@/components/PremiumButton";
import { getJobs } from "@/lib/db";

export const metadata = { title: "Jobs & Exams — Bipin AI" };

// FIX: pehle yeh page hamesha data/jobs.js ki static (hardcoded) list dikhata
// tha — admin panel se koi job add/delete karo, yahan kabhi kuch badalta hi
// nahi tha. Ab lib/db se live (admin-managed) jobs list aati hai.
export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }) {
  const q = (searchParams?.q || "").toLowerCase().trim();
  // DB does the filtering (indexed) instead of loading every job into JS —
  // this is the part that matters once there are thousands of rows.
  const jobs = await getJobs({ limit: 60 });
  const filteredJobs = q ? await getJobs({ q, limit: 100 }) : jobs;

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col items-center gap-6 pb-24">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl">
            {q ? `"${q}" ke liye results` : "Latest Jobs & Exams"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {q
              ? `${filteredJobs.length} job(s) mile`
              : "Har 3 second me naya notification — ya niche dot dabakar seedha jump karo"}
          </p>
        </div>

        {!q && <JobCarousel jobs={jobs} intervalMs={3000} />}

        <div className="w-full max-w-2xl">
          <AdBanner placement="job-list" />
        </div>

        <div className="w-full max-w-2xl">
          <SubscribeWidget />
        </div>

        <div className="w-full max-w-2xl text-center">
          <PremiumButton />
        </div>

        <div className="w-full grid sm:grid-cols-2 gap-3 mt-4">
          {filteredJobs.length === 0 && (
            <div className="col-span-2 text-center text-sm text-slate-400 py-10">
              Koi job nahi mila. Kisi aur keyword se try karo.
            </div>
          )}
          {filteredJobs.map((job) => (
            <a
              key={job.id}
              href={`/jobs/${job.id}`}
              className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-sm">{job.title}</div>
                <div className="text-xs text-slate-400">{job.department} · Last date {job.lastDate}</div>
              </div>
              <span className="text-brandblue text-sm font-medium">Details →</span>
            </a>
          ))}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
