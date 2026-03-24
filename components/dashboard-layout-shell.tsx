"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

function getPageTitle(pathname: string) {
  if (pathname === "/dashboard") {
    return "Overview"
  }

  const segments = pathname.split("/").filter(Boolean)
  const lastSegment = segments[segments.length - 1] ?? "dashboard"

  return lastSegment
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-medium">{pageTitle}</h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
