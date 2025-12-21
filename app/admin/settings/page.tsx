export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen bg-[#FAF6F1] px-6 py-16 font-[Montserrat]">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <div className="space-y-2">

          <h1 className="text-3xl font-semibold text-[#111]">
            Admin Settings
          </h1>

          <p className="text-neutral-600">
            Core system settings for Pages & Peace.  
            These are informational only and safe to view.
          </p>
        </div>

        {/* Store */}
        <section className="bg-white rounded-xl border border-[#e5e2dc] p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-[var(--accent)]">
            Store
          </h2>

          <ul className="text-sm text-neutral-700 space-y-1">
            <li><strong>Name:</strong> Pages & Peace</li>
            <li><strong>Location:</strong> Rossington, Doncaster</li>
            <li><strong>Contact:</strong> admin@pagesandpeace.co.uk</li>
          </ul>
        </section>

        {/* Commerce */}
        <section className="bg-white rounded-xl border border-[#e5e2dc] p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-[var(--accent)]">
            Commerce
          </h2>

          <ul className="text-sm text-neutral-700 space-y-1">
            <li>✔ Stripe checkout enabled</li>
            <li>✔ Inventory handled via RPC</li>
            <li>✔ Webhooks active</li>
          </ul>
        </section>

        {/* Events */}
        <section className="bg-white rounded-xl border border-[#e5e2dc] p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-[var(--accent)]">
            Events
          </h2>

          <ul className="text-sm text-neutral-700 space-y-1">
            <li>✔ Events excluded from shop</li>
            <li>✔ Booked via dedicated flow</li>
            <li>✔ Capacity handled separately</li>
          </ul>
        </section>

        {/* System */}
        <section className="bg-white rounded-xl border border-[#e5e2dc] p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-[var(--accent)]">
            System Status
          </h2>

          <ul className="text-sm text-neutral-700 space-y-1">
            <li>✔ Supabase connected</li>
            <li>✔ Admin routes isolated</li>
            <li>✔ No destructive actions enabled</li>
          </ul>
        </section>

        {/* Footer */}
        <p className="text-xs text-neutral-500">
          Editable admin controls can be added here later once fully tested.
        </p>

      </div>
    </main>
  );
}
