"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, LogOut } from "lucide-react";

import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

type CurrentUser = {
  id: string;
  username: string;
  email: string;
};

// Only admins can log in to the panel (checked in api/auth/login), so the
// role label is fixed.
const ROLE_LABEL = "Administrador";

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<CurrentUser>("/users/me", { signal: controller.signal })
      .then((response) => setUser(response.data))
      .catch(() => {
        // The menu still works without the name (logout is what matters).
      });

    return () => controller.abort();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });

    router.replace("/login");
    router.refresh();
  }

  const name = user?.username ?? "Mi cuenta";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" tooltip={name}>
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-800"
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1 text-left leading-tight">
            <div className="truncate text-sm font-semibold text-slate-800">
              {name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {ROLE_LABEL}
            </div>
          </div>

          <ChevronUp
            className="ml-auto size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <DropdownMenuLabel>
          {name} · {ROLE_LABEL}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
