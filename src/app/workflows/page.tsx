import Link from "next/link";

export default function WorkflowsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Workflows</h1>
            <p className="mt-1 text-sm text-slate-500">
              Automations and workflows will appear here. This page is a placeholder for now.
            </p>
          </div>
          <Link
            href="/patients"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <span>Back to patients</span>
          </Link>
        </header>
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
          <p className="mb-2 font-medium text-slate-700">Workflows are coming soon</p>
          <p>
            You&apos;ll be able to define automations that react to deals, appointments, and other
            events in your clinic.
          </p>
        </section>
      </div>
    </main>
  );
}
