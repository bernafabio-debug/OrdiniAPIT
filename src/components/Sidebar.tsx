"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FilePlus2,
  History,
  ShieldCheck,
  LogOut
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/ordini/nuovo", label: "Nuovo Ordine", icon: FilePlus2, adminOnly: false },
  { href: "/ordini", label: "Storico Ordini", icon: History, adminOnly: false },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/materiali", label: "Catalogo Materiali", icon: Package, adminOnly: false },
  { href: "/admin", label: "Amministrazione", icon: ShieldCheck, adminOnly: true }
];

export default function Sidebar({ role, name }: { role: "user" | "admin"; name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-fluent-sidebar text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Logo aziendale" className="w-8 h-8 rounded-lg object-cover shrink-0" />
        <span className="font-semibold text-sm">PO Manager Service</span>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin").map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-fluent-accent text-white"
                  : "text-gray-300 hover:bg-fluent-sidebarHover hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-2 mb-2">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-gray-400">{role === "admin" ? "Amministratore" : "Utente"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-fluent-sidebarHover hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Esci
        </button>
      </div>
    </aside>
  );
}
