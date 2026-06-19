import { AppShell } from "@/components/app-shell";

export default function MessagesLoading() {
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white p-4">
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="mt-4 h-3 w-3/4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
