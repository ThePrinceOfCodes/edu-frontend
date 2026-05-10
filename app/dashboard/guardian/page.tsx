"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GuardianStudentOverview, GuardianStudentsOverviewResponse } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"

function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString()
}

function getAverageScore(results: GuardianStudentOverview["results"]) {
  if (results.length === 0) return 0
  const total = results.reduce((sum, item) => sum + item.totalScore, 0)
  return Number((total / results.length).toFixed(2))
}

export default function GuardianDashboardPage() {
  const authUser = authService.getStoredUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<GuardianStudentsOverviewResponse | null>(null)

  useEffect(() => {
    async function loadOverview() {
      setLoading(true)
      setError(null)

      try {
        const result = await resourceService.getGuardianStudentsOverview()
        setOverview(result)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load guardian dashboard")
      } finally {
        setLoading(false)
      }
    }

    if (authUser?.role === "guardian") {
      void loadOverview()
      return
    }

    setLoading(false)
    setError("This page is only available to guardian accounts")
  }, [authUser?.role])

  const studentCount = overview?.students.length ?? 0
  const overallAttendance = useMemo(() => {
    if (!overview || overview.students.length === 0) return 0
    const total = overview.students.reduce((sum, student) => sum + student.attendance.attendanceRate, 0)
    return Number((total / overview.students.length).toFixed(2))
  }, [overview])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading guardian dashboard...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Guardian Portal</h1>
        <p className="text-sm text-muted-foreground">
          Track attendance, results, and profile information for your linked students.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Linked Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{studentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Average Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overallAttendance}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Guardian</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">{overview?.guardian.name || "-"}</p>
            <p className="text-xs text-muted-foreground">{overview?.guardian.email || "-"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {(overview?.students || []).map((student) => {
          const averageScore = getAverageScore(student.results)

          return (
            <Card key={student.id}>
              <CardHeader>
                <CardTitle className="text-lg">{student.fullName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reg No: {student.regNumber} | {student.currentPlacement?.schoolName || "No school"} |{" "}
                  {student.currentPlacement?.className || "No class"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    <p className="text-lg font-semibold">{student.attendance.attendanceRate}%</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Present Records</p>
                    <p className="text-lg font-semibold">{student.attendance.presentCount}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Absent Records</p>
                    <p className="text-lg font-semibold">{student.attendance.absentCount}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Average Result (Total/200)</p>
                    <p className="text-lg font-semibold">{averageScore}</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Student Info
                    </p>
                    <div className="space-y-1 text-sm">
                      <p>Gender: {student.gender}</p>
                      <p>Date of Birth: {formatDate(student.dateOfBirth)}</p>
                      <p>State: {student.stateOfOrigin}</p>
                      <p>Local Government: {student.localGovernment}</p>
                      <p>Last Attendance Mark: {formatDate(student.attendance.lastMarkedDate)}</p>
                    </div>
                  </div>

                  <div className="rounded-md border p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Recent Results
                    </p>
                    <div className="max-h-48 space-y-2 overflow-auto text-sm">
                      {student.results.length === 0 ? (
                        <p className="text-muted-foreground">No results uploaded yet.</p>
                      ) : (
                        student.results.slice(0, 8).map((result) => (
                          <div key={result.id} className="rounded border p-2">
                            <p className="font-medium">{result.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.termName} | {result.academicSessionName} | {result.className}
                            </p>
                            <p className="text-xs">
                              Test: {result.testScore} | Exam: {result.examScore} | Total: {result.totalScore}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
