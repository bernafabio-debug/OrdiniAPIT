import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-fluent-bg">
      <Sidebar role={session.role} name={session.name} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
      <div className="fixed bottom-2 right-3 text-[11px] text-fluent-textMuted/60 pointer-events-none select-none">
        Fabio Bernardini con Claude, versione 1.0
      </div>
    </div>
  );
}
