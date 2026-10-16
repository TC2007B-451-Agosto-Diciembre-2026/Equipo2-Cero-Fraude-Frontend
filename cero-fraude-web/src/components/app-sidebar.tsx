
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
  ChartColumnDecreasing
} from "lucide-react";

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
} from "@/components/ui/sidebar";

const navigation = [
  { title: "Inicio", href: "/", icon: LayoutDashboard },
  { title: "Publicaciones", href: "/posts", icon: FileText },
  { title: "Estadísticas", href: "/statistics", icon: ChartColumnDecreasing},
  { title: "Usuarios", href: "/users", icon: Users },
  { title: "Catálogos", href: "/catalogs", icon: Tags },
  { title: "Administración", href: "/administration", icon: ShieldCheck },
  { title: "Registro de actividad", href: "/audit-logs", icon: History },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <ShieldCheck className="size-5" />
          </div>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-emerald-800">Cero Fraude</p>
            <p className="text-xs text-muted-foreground">
              Panel administrativo
            </p>
          </div>
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
                      className="data-[active=true]:bg-emerald-50 data-[active=true]:text-emerald-800"
                    >
                      <Link href={item.href}>
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

      <SidebarFooter className="border-t p-3">
        <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Cero Fraude · Administración
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
