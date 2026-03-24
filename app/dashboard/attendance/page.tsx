"use client"

import { useEffect, useMemo, useState } from "react"

import type { AttendanceSummary, School } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusView: Record<string, { label: string; className: string }> = {
  present: { label: "P", className: "text-emerald-600" },
  absent: { label: "A", className: "text-destructive" },
  late: { label: "L", className: "text-amber-600" },
  excused: { label: "E", className: "text-sky-600" },
  "-": { label: "-", className: "text-muted-foreground" },
}

export default function AttendancePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState("")
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSchools() {
      try {
        const schoolResult = await resourceService.getSchools()
        setSchools(schoolResult.results)

        const firstSchoolId = schoolResult.results[0]?._id ?? schoolResult.results[0]?.id ?? ""
        setSelectedSchool(firstSchoolId)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load schools")
      }
    }

    void loadSchools()
  }, [])

  useEffect(() => {
    if (!selectedSchool) {
      setLoading(false)
      return
    }

    async function loadSummary() {
      setLoadError(null)
      setLoading(true)

      try {
        const result = await resourceService.getAttendanceSummary({ school: selectedSchool })
        setSummary(result)
      } catch (error) {
        setSummary(null)
        setLoadError(error instanceof Error ? error.message : "Unable to load attendance summary")
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [selectedSchool])

  const activeCount = useMemo(() => summary?.rows.length ?? 0, [summary])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <div className="w-full max-w-sm space-y-1">
          <label htmlFor="attendance-school" className="text-sm font-medium">
            School
          </label>
          <select
            id="attendance-school"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={selectedSchool}
            onChange={(event) => setSelectedSchool(event.target.value)}
          >
            <option value="">Select school</option>
            {schools.map((school) => {
              const schoolId = school._id ?? school.id
              if (!schoolId) {
                return null
              }

              return (
                <option key={schoolId} value={schoolId}>
                  {school.name}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      <div className="border-b">
        <button className="border-b-2 border-primary px-1 py-2 text-sm font-medium text-foreground">
          Statistics
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Term</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{summary?.term.name ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold capitalize">{summary?.term.resolvedScope ?? "-"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Table</CardTitle>
          {summary ? (
            <p className="text-sm text-muted-foreground">
              {summary.term.name} • {new Date(summary.term.startDate).toLocaleDateString()} -{" "}
              {new Date(summary.term.endDate).toLocaleDateString()} ({summary.school.name})
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && !loadError && summary?.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records found for the active term.</p>
          ) : null}
          {!loading && !loadError && summary && summary.rows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-max text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-medium">Student</th>
                    {summary.days.map((day) => (
                      <th key={day.date} className="px-2 py-2 text-center font-medium">
                        {day.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.studentId} className="border-t">
                      <td className="sticky left-0 z-10 bg-background px-3 py-2">
                        <div className="font-medium">{row.studentName}</div>
                        <div className="text-xs text-muted-foreground">{row.regNumber}</div>
                      </td>
                      {summary.days.map((day) => {
                        const rawStatus = row.statusByDate[day.date] ?? "-"
                        const view = statusView[rawStatus] ?? statusView["-"]

                        return (
                          <td key={`${row.studentId}-${day.date}`} className="px-2 py-2 text-center">
                            <span className={view.className}>{view.label}</span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-medium">{row.attendancePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
