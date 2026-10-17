"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { navigation } from "@/components/app-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

type Crumb = {
  label: string;
  href?: string;
};

// Detail pages get a second crumb. Users are addressed by UUID, which is
// not useful to read, so they get a generic label.
const detailLabels: Record<string, (id: string) => string> = {
  "/posts": (id) => `#${id}`,
  "/users": () => "Detalle",
};

function getCrumbs(pathname: string): Crumb[] {
  const section = navigation.find(
    (item) =>
      item.href !== "/" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );

  if (!section) return [{ label: "Inicio" }];

  const id = pathname.slice(section.href.length + 1).split("/")[0];
  const detailLabel = detailLabels[section.href];

  if (!id || !detailLabel) return [{ label: section.title }];

  return [
    { label: section.title, href: section.href },
    { label: detailLabel(decodeURIComponent(id)) },
  ];
}

export function AppHeader() {
  const crumbs = getCrumbs(usePathname());

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 md:px-6">
      <SidebarTrigger aria-label="Mostrar u ocultar menú" />

      <nav aria-label="Ruta de navegación" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;

            return (
              <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}

                {last || !crumb.href ? (
                  <span
                    aria-current="page"
                    className="truncate font-semibold text-slate-800"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate text-muted-foreground hover:text-slate-900"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}
