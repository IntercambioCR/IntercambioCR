import { AppShell } from "@/components/app-shell";

export default function AdminLoading() {
  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="mt-6 h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </section>
    </AppShell>
  );
}
