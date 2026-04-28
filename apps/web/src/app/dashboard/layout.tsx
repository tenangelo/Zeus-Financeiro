import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white/80 backdrop-blur-md px-4 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium text-muted-foreground">Zeus Financeiro</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </header>
        {/* Page content with fade-in animation */}
        <main className="flex-1 overflow-auto bg-gray-50/50 p-6">
          <div className="animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
