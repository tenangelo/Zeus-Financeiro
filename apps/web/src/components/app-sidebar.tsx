"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  BookOpen,
  ArrowLeftRight,
  TrendingDown,
  BarChart3,
  Upload,
  Warehouse,
  LogOut,
  Zap,
  Settings,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  {
    group: "Visão Geral",
    items: [
      { href: "/dashboard",             label: "Dashboard",        icon: LayoutDashboard },
    ],
  },
  {
    group: "Estoque & Cardápio",
    items: [
      { href: "/dashboard/ingredients", label: "Ingredientes",     icon: Package },
      { href: "/dashboard/stock",       label: "Estoque",          icon: Warehouse },
      { href: "/dashboard/recipes",     label: "Fichas Técnicas",  icon: BookOpen },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { href: "/dashboard/transactions",label: "Lançamentos",      icon: ArrowLeftRight },
      { href: "/dashboard/dre",         label: "DRE",              icon: BarChart3 },
      { href: "/dashboard/cmv",         label: "CMV",              icon: TrendingDown },
    ],
  },
  {
    group: "Ferramentas",
    items: [
      { href: "/dashboard/import",    label: "Importar",       icon: Upload },
      { href: "/dashboard/settings",  label: "Configurações",  icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar>
      {/* Logo */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground">Zeus Financeiro</p>
            <p className="text-[10px] text-sidebar-foreground/50">Agente Financeiro</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {NAV_ITEMS.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href as any} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
