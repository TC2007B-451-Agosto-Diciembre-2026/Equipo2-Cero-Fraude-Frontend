"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Tags,
  ShieldCheck,
  History,
  ChartColumnDecreasing,
  Flag,
} from "lucide-react";

import { UserMenu } from "@/components/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export const navigation = [
  { title: "Inicio", href: "/", icon: LayoutDashboard },
  { title: "Publicaciones", href: "/posts", icon: FileText },
  { title: "Reportes", href: "/reports", icon: Flag },
  { title: "Estadísticas", href: "/statistics", icon: ChartColumnDecreasing },
  { title: "Usuarios", href: "/users", icon: Users },
  { title: "Catálogos", href: "/catalogs", icon: Tags },
  { title: "Administración", href: "/administration", icon: ShieldCheck },
  { title: "Registro de actividad", href: "/audit-logs", icon: History },
];

// Solid brand fill for the current section, white text keeps 4.5:1 contrast.
const activeItemClass =
  "data-[active=true]:bg-emerald-700 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:hover:bg-emerald-800 data-[active=true]:hover:text-white";

export function BrandTile({ size = "size-9" }: Readonly<{ size?: string }>) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white`}
    >
      <ShieldCheck className="size-5" aria-hidden="true" />
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b px-4 py-0 group-data-[collapsible=icon]:px-0">
        <Link
          href="/"
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <BrandTile />
          <span className="truncate font-bold text-emerald-800 group-data-[collapsible=icon]:hidden">
            Cero Fraude
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={activeItemClass}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
