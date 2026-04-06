"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  ChevronUp,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Layers,
  LogOut,
  MessageSquare,
  User,
  Settings,
  Users,
} from "lucide-react"
import type { AuthUser } from "@/interfaces/auth-interface"
import { authService } from "@/services/auth-service"

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
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
    internalOnly: false,
  },
  {
    title: "Staff",
    url: "/dashboard/staff",
    icon: Users,
    hideForInternal: true,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: User,
    showForInternal: true,
  },
  {
    title: "Students",
    url: "/dashboard/students",
    icon: Users,
    hideForInternal: true,
  },
  {
    title: "Attendance",
    url: "/dashboard/attendance",
    icon: CalendarDays,
    hideForInternal: true,
  },
  {
    title: "Schools",
    url: "/dashboard/schools",
    icon: BookOpen,
    internalOnly: false,
  },
  {
    title: "School Boards",
    url: "/dashboard/school-boards",
    icon: Settings,
    showForInternal: true,
  },
  {
    title: "Terms",
    url: "/dashboard/terms",
    icon: CalendarDays,
    allowedRoles: ["school-board-admin", "school-admin"],
  },
  {
    title: "Classes",
    url: "/dashboard/classes",
    icon: Layers,
    hideForInternal: true,
  },
  {
    title: "Messaging",
    url: "/dashboard/messaging",
    icon: MessageSquare,
    internalOnly: false,
  },
  {
    title: "Events",
    url: "/dashboard/events",
    icon: CalendarRange,
    internalOnly: false,
  },
]

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const menuContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setAuthUser(authService.getStoredUser())
  }, [])

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!menuContainerRef.current) {
        return
      }

      const target = event.target as Node
      if (!menuContainerRef.current.contains(target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick)
    }
  }, [])

  const isInternalUser = authUser?.accountType === "internal"
  const visibleNavItems = navItems.filter((item) => {
    if (item.hideForInternal && isInternalUser) return false
    if (item.showForInternal && !isInternalUser) return false
    if (item.allowedRoles && !item.allowedRoles.includes(authUser?.role as string)) return false
    return true
  })

  const displayName = authUser?.name?.trim() || "User"
  const displayEmail = authUser?.email?.trim() || ""
  const avatarUrl = authUser?.avatar || null

  const initials = useMemo(() => {
    const source = displayName !== "User" ? displayName : displayEmail
    const parts = source.split(/\s+/).filter(Boolean)

    if (parts.length === 0) {
      return "U"
    }

    if (parts.length === 1) {
      return parts[0]?.slice(0, 2).toUpperCase() ?? "U"
    }

    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "U"
  }, [displayName, displayEmail])

  async function handleLogout() {
    setIsMenuOpen(false)
    await authService.logout()
    router.push("/auth/sign-in")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <BookOpen className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Edu Dashboard</span>
                <span className="truncate text-xs">Education Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative" ref={menuContainerRef}>
              <SidebarMenuButton
                tooltip="Account"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    className="size-7 rounded-full object-cover"
                    width={28}
                    height={28}
                  />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                    {initials}
                  </div>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displayEmail || "Signed in"}
                  </span>
                </div>
                <ChevronUp className="size-4" />
              </SidebarMenuButton>

              {isMenuOpen ? (
                <div className="absolute bottom-12 left-0 z-50 w-56 rounded-md border bg-popover p-1 shadow-md">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      setIsMenuOpen(false)
                      router.push("/dashboard/settings")
                    }}
                  >
                    <User className="size-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                    onClick={() => {
                      void handleLogout()
                    }}
                  >
                    <LogOut className="size-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
