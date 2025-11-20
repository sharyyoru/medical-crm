import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Hi Dr. Smith
          </h1>
          <p className="text-sm text-slate-500">
            Let&apos;s get you on a productive routine today!
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
          <Link
            href="/add-patients"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/70 px-4 py-1.5 font-medium text-sky-700 shadow-[0_10px_25px_rgba(15,23,42,0.16)] backdrop-blur hover:bg-white hover:text-sky-800"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[12px] font-semibold text-white shadow-sm">
              +
            </span>
            <span>Add patient</span>
          </Link>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-4 py-1.5 font-medium text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.10)] backdrop-blur hover:bg-white hover:text-slate-900"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-[11px] text-white shadow-sm">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
            </span>
            <span>Schedule appointment</span>
          </Link>
        </div>
      </header>

      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Today&apos;s appointments
              </h2>
              <p className="text-xs text-slate-500">
                Quick view of your upcoming consultations and surgeries.
              </p>
            </div>
            <Link
              href="/appointments"
              className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-slate-800">09:30 · New patient consult</p>
                <p className="text-xs text-slate-500">John Doe · Facial aesthetics</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Confirmed
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-slate-800">11:15 · Post-op check</p>
                <p className="text-xs text-slate-500">Sarah K. · Day 7 review</p>
              </div>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                Today
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-slate-800">15:45 · Surgery planning</p>
                <p className="text-xs text-slate-500">Emily R. · Rhinoplasty</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Needs prep
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
              <p className="text-xs text-slate-500">
                Your most important follow-ups and admin items.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              View all tasks
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2">
              <div>
                <p className="font-medium text-slate-800">
                  Call insurer for Emily R.
                </p>
                <p className="text-xs text-slate-500">
                  Pre-auth for rhinoplasty · 10 min
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Today
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50/60 px-3 py-2">
              <div>
                <p className="font-medium text-slate-800">
                  Review post-op photos
                </p>
                <p className="text-xs text-slate-500">
                  3 patients waiting for approval
                </p>
              </div>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                This week
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50/40 px-3 py-2">
              <div>
                <p className="font-medium text-slate-800">
                  Send follow-up emails
                </p>
                <p className="text-xs text-slate-500">
                  5 patients · AI drafts ready
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                Pending
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Mentions</h2>
              <p className="text-xs text-slate-500">
                Notes and comments where you were tagged.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              View inbox
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start justify-between rounded-lg bg-slate-50/80 px-3 py-2">
              <div className="pr-4">
                <p className="text-xs font-medium text-slate-500">Today · 10:12</p>
                <p className="mt-0.5 text-slate-800">
                  @You Dr. Lee added new photos for Sarah&apos;s post-op. Please
                  confirm healing looks on track.
                </p>
              </div>
              <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </div>
            <div className="flex items-start justify-between rounded-lg bg-slate-50/60 px-3 py-2">
              <div className="pr-4">
                <p className="text-xs font-medium text-slate-500">Yesterday</p>
                <p className="mt-0.5 text-slate-800">
                  @You Finance flagged an update on Emily&apos;s insurance
                  paperwork.
                </p>
              </div>
            </div>
            <div className="flex items-start justify-between rounded-lg bg-slate-50/40 px-3 py-2">
              <div className="pr-4">
                <p className="text-xs font-medium text-slate-500">2 days ago</p>
                <p className="mt-0.5 text-slate-800">
                  @You Workflow engine suggests enabling an automated
                  follow-up after day 30.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
