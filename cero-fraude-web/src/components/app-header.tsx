
"use client";

import { usePathname } from "next/navigation";
import { CircleUserRound } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/": "Inicio",
  "/posts": "Publicaciones",
  "/users": "Usuarios",
  "/catalogs": "Catálogos",
  "/administration": "Administración",
  "/audit-logs": "Registro de actividad",
};

export function AppHeader() {
    const router = useRouter();

    async function handleLogout() {
    await fetch("/api/auth/logout", {
        method: "POST",
    });

    router.replace("/login");
    router.refresh();
    }
  const pathname = usePathname();
  const section =
    Object.entries(titles).find(
      ([path]) =>
        path !== "/" &&
        (pathname === path || pathname.startsWith(`${path}/`))
    )?.[1] ?? titles["/"];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-5" />
        <span className="font-semibold text-slate-800">
          {section}
        </span>
      </div>

      <Button
  variant="ghost"
  size="icon"
  aria-label="Cerrar sesión"
  title="Cerrar sesión"
  onClick={handleLogout}
>
  <LogOut className="size-5" />
</Button>

      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Vista de desarrollo
        </Badge>
        <CircleUserRound className="size-7 text-slate-500" />
      </div>
    </header>
  );
}
