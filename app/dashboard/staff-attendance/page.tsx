"use client"

import { useEffect, useMemo, useState } from "react"

import type { School, StaffAttendanceMatrixResponse } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sessionLabels = {
  morning: "AM",
  afternoon: "PM",
} as const

const statusTone: Record<string, string> = {
  present: "bg-emerald-600 text-white",
  absent: "bg-rose-600 text-white",
  late: "bg-amber-500 text-white",
  excused: "bg-sky-600 text-white",
}

function getMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export default function StaffAttendancePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState("")
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [matrix, setMatrix] = useState<StaffAttendanceMatrixResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    resourceService
      .getSchools({ limit: 1000, page: 1 })
      .then((res) => {
        setSchools(res.results)
        if (res.results.length > 0) {
          setSelectedSchool(res.results[0]._id ?? res.results[0].id ?? "")
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedSchool) return

    setLoading(true)
    setError(null)
    resourceService
      .getStaffAttendanceMatrix({ school: selectedSchool, month, year })
      .then((res) => setMatrix(res))
      .catch((err) => {
        setMatrix(null)
        setError(err instanceof Error ? err.message : "Failed to load staff attendance matrix")
      })
      .finally(() => setLoading(false))
  }, [selectedSchool, month, year])

  const summary = useMemo(() => {
    const rows = matrix?.rows ?? []
    const totalStaff = matrix?.totalStaff ?? 0
    const totalPresent = rows.reduce((sum, row) => sum + row.totalPresent, 0)
    const totalAbsent = rows.reduce((sum, row) => sum + row.totalAbsent, 0)
    const totalRecords = totalPresent + totalAbsent

    return { totalStaff, totalPresent, totalAbsent, totalRecords }
  }, [matrix])

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader className="space-y-4">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">School</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                <option value="">Select school</option>
                {schools.map((school) => {
                  const id = school._id ?? school.id ?? ""
                  return (
                    <option key={id} value={id}>
                      {school.name}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Month</label>
              <input
                type="number"
                min={1}
                max={12}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Year</label>
              <input
                type="number"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Month Label</label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {getMonthLabel(month, year)}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {summary.totalStaff} staff for {getMonthLabel(month, year)}
          </p>
        </CardHeader>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading && matrix ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Staff</div>
                <div className="text-3xl font-semibold">{summary.totalStaff}</div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Present Marks</div>
                <div className="text-3xl font-semibold text-emerald-600">{summary.totalPresent}</div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Absent Marks</div>
                <div className="text-3xl font-semibold text-rose-600">{summary.totalAbsent}</div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Records</div>
                <div className="text-3xl font-semibold text-slate-700">{summary.totalRecords}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Monthly Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <div className="max-h-[34rem] overflow-auto">
                  <table className="min-w-max border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="sticky left-0 z-20 border-b bg-muted/40 px-3 py-2 text-left font-medium">Staff</th>
                        <th className="sticky left-[220px] z-20 border-b bg-muted/40 px-3 py-2 text-left font-medium">ID</th>
                        <th className="sticky left-[320px] z-20 border-b bg-muted/40 px-3 py-2 text-left font-medium">%</th>
                        {matrix.days.map((day) => (
                          <th key={day.date} className="border-b px-2 py-2 text-center font-medium">
                            {day.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.rows.map((row) => (
                        <tr key={row.staffId} className="border-t">
                          <td className="sticky left-0 z-10 w-[220px] bg-background px-3 py-2 font-medium">
                            <div>{row.staffName}</div>
                            <div className="text-xs text-muted-foreground">{row.designation || row.staffType || "-"}</div>
                          </td>
                          <td className="sticky left-[220px] z-10 w-[100px] bg-background px-3 py-2 text-xs text-muted-foreground">
                            {row.employeeId || "-"}
                          </td>
                          <td className="sticky left-[320px] z-10 w-[70px] bg-background px-3 py-2 font-semibold">
                            {row.totalPresent + row.totalAbsent > 0
                              ? `${Math.round((row.totalPresent / (row.totalPresent + row.totalAbsent)) * 100)}%`
                              : "0%"}
                          </td>
                          {matrix.days.map((day) => {
                            const cell = row.cells[day.date] ?? { morning: null, afternoon: null }
                            return (
                              <td key={day.date} className="min-w-[72px] border-l px-1 py-1 align-top">
                                <div className="flex flex-col items-center gap-1 text-[10px] leading-none">
                                  <span className={`rounded px-1.5 py-0.5 ${cell.morning ? statusTone[cell.morning] || "bg-muted text-muted-foreground" : "text-muted-foreground"}`}>
                                    {cell.morning ? sessionLabels.morning : "-"}
                                  </span>
                                  <span className={`rounded px-1.5 py-0.5 ${cell.afternoon ? statusTone[cell.afternoon] || "bg-muted text-muted-foreground" : "text-muted-foreground"}`}>
                                    {cell.afternoon ? sessionLabels.afternoon : "-"}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
