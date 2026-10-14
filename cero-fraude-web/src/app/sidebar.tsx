
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Inicio", href: "/", icon: "⌂" },
  { label: "Publicaciones", href: "/publicaciones", icon: "▤" },
  { label: "Usuarios", href: "/usuarios", icon: "♙" },
  { label: "Catálogos", href: "/catalogos", icon: "▦" },
  { label: "Administración", href: "/administracion", icon: "⚙" },
  { label: "Registro de actividad", href: "/actividad", icon: "◷" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-white p-6">
      <div className="mb-12 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-green)] text-xl font-bold text-white">
          C
        </div>

        <div>
          <h1 className="text-lg font-bold text-[var(--brand-blue)]">
            CERO FRAUDE
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Administración
          </p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex flex-col gap-2">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                active
                  ? "bg-emerald-50 font-semibold text-[var(--brand-green)]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-5">
        <p className="font-medium">Administrador</p>
        <p className="text-xs text-[var(--muted)]">
          Panel de gestión
        </p>
      </div>
    </aside>
  );
}
