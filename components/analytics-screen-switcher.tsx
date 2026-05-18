"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

const ANALYTICS_SCREENS = [
  { label: "Analytics Overview", value: "/dashboard/analytics" },
  { label: "Student Performance", value: "/dashboard/analytics/student-performance" },
  { label: "Teacher Performance", value: "/dashboard/analytics/teacher-performance" },
  { label: "Attendance Trends", value: "/dashboard/analytics/attendance-trends" },
  { label: "Correlation Insights", value: "/dashboard/analytics/correlation" },
]

export function AnalyticsScreenSwitcher() {
  const router = useRouter()
  const pathname = usePathname()

  const currentValue = useMemo(() => {
    return ANALYTICS_SCREENS.find((item) => item.value === pathname)?.value ?? "/dashboard/analytics"
  }, [pathname])

  const [selectedValue, setSelectedValue] = useState(currentValue)

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 rounded-md border bg-background px-3 text-sm"
        value={selectedValue}
        onChange={(event) => setSelectedValue(event.target.value)}
      >
        {ANALYTICS_SCREENS.map((screen) => (
          <option key={screen.value} value={screen.value}>
            {screen.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (selectedValue !== pathname) {
            router.push(selectedValue)
          }
        }}
      >
        Go
      </Button>
    </div>
  )
}
