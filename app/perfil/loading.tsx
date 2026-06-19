import { AppShell } from "@/components/app-shell";

export default function ProfileLoading() {
  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
