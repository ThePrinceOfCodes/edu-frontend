import { DashboardLayoutShell } from "@/components/dashboard-layout-shell"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>
}
