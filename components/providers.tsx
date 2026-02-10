"use client";

import { useEffect } from "react";
import Link from "next/link";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Image from "next/image";

const sidebarStyle = {
  "--sidebar-width": "14rem",
  "--sidebar-width-icon": "0rem",
};

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={false} style={sidebarStyle as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-2 h-12 px-4 border-b flex-shrink-0 sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
                <Link href="/" data-testid="link-header-home">
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Image src="/agentclaw-pfp.png" alt="AgentClaw" width={28} height={28} className="rounded-md" />
                    <span className="font-bold text-sm tracking-tight">AgentClaw</span>
                  </div>
                </Link>
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
