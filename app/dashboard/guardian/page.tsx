"use client"

import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { GuardianStudentOverview, GuardianStudentsOverviewResponse, Term } from "@/interfaces/resource-interface"
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

function getAttendanceMetrics(records: GuardianStudentOverview["attendanceRecords"]) {
  let presentCount = 0
  let absentCount = 0
  records.forEach((item) => {
    if (item.amStatus === "present" || item.amStatus === "late") presentCount++
    else if (item.amStatus === "absent" || item.amStatus === "excused") absentCount++
    if (item.pmStatus === "present" || item.pmStatus === "late") presentCount++
    else if (item.pmStatus === "absent" || item.pmStatus === "excused") absentCount++
  })
  const totalMarked = presentCount + absentCount
  const attendanceRate = totalMarked > 0 ? Number(((presentCount / totalMarked) * 100).toFixed(2)) : 0

  return {
    presentCount,
    absentCount,
    totalMarked,
    attendanceRate,
  }
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
  return initials || "?"
}

export default function GuardianDashboardPage() {
  const authUser = authService.getStoredUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<GuardianStudentsOverviewResponse | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedTermId, setSelectedTermId] = useState("")

  useEffect(() => {
    async function loadOverview() {
      setLoading(true)
      setError(null)

      try {
        const [overviewResult, termsResult] = await Promise.all([
          resourceService.getGuardianStudentsOverview(),
          resourceService.getTerms({ limit: 200, page: 1 }),
        ])

        setOverview(overviewResult)
        setTerms(termsResult.results || [])
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

  useEffect(() => {
    const students = overview?.students || []
    if (students.length === 0) {
      setSelectedStudentId("")
      return
    }

    if (!students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(students[0]?.id || "")
    }
  }, [overview, selectedStudentId])

  const studentCount = overview?.students.length ?? 0
  const overallAttendance = useMemo(() => {
    if (!overview || overview.students.length === 0) return 0
    const total = overview.students.reduce((sum, student) => sum + student.attendance.attendanceRate, 0)
    return Number((total / overview.students.length).toFixed(2))
  }, [overview])

  const selectedStudent = useMemo(
    () => overview?.students.find((student) => student.id === selectedStudentId) || null,
    [overview, selectedStudentId]
  )

  const filteredTermOptions = useMemo(
    () =>
      terms
        .map((term) => ({
          id: term._id ?? term.id ?? "",
          name: term.name || term.termName,
          startDate: term.startDate,
          endDate: term.endDate,
          isActive: term.isActive,
        }))
        .filter((term) => Boolean(term.id)),
    [terms]
  )

  useEffect(() => {
    if (filteredTermOptions.length === 0) {
      setSelectedTermId("")
      return
    }

    const stillAvailable = selectedTermId && filteredTermOptions.some((item) => item.id === selectedTermId)
    if (stillAvailable) {
      return
    }

    const activeTermByFlag = filteredTermOptions.find((term) => Boolean(term.isActive))
    if (activeTermByFlag) {
      setSelectedTermId(activeTermByFlag.id)
      return
    }

    const now = new Date()
    const activeTerm = filteredTermOptions.find((term) => {
      if (!term.startDate || !term.endDate) {
        return false
      }
      const start = new Date(term.startDate)
      const end = new Date(term.endDate)
      return start <= now && now <= end
    })

    setSelectedTermId(activeTerm?.id ?? filteredTermOptions[0]?.id ?? "")
  }, [filteredTermOptions, selectedTermId])

  const filteredAttendance = useMemo(() => {
    if (!selectedStudent) {
      return []
    }

    const attendanceRecords = selectedStudent.attendanceRecords || []

    return attendanceRecords
      .filter((item) => (selectedTermId ? item.termId === selectedTermId : true))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedStudent, selectedTermId])

  const filteredResults = useMemo(() => {
    if (!selectedStudent) {
      return []
    }

    return selectedStudent.results
      .filter((item) => (selectedTermId ? item.termId === selectedTermId : true))
      .slice(0, 12)
  }, [selectedStudent, selectedTermId])

  const selectedAttendanceMetrics = useMemo(
    () => getAttendanceMetrics(filteredAttendance),
    [filteredAttendance]
  )

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Students</CardTitle>
        </CardHeader>
        <CardContent>
          {(overview?.students || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No students linked to this guardian account.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(overview?.students || []).map((student) => {
                const active = selectedStudent?.id === student.id

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors ${
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {getInitials(student.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{student.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{student.regNumber}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{selectedStudent.fullName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reg No: {selectedStudent.regNumber} | {selectedStudent.currentPlacement?.schoolName || "No school"} |{" "}
              {selectedStudent.currentPlacement?.className || "No class"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Term</label>
              <select
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={selectedTermId}
                onChange={(event) => setSelectedTermId(event.target.value)}
              >
                <option value="">All Terms</option>
                {filteredTermOptions.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
                <p className="text-lg font-semibold">{selectedAttendanceMetrics.attendanceRate}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Present Records</p>
                <p className="text-lg font-semibold">{selectedAttendanceMetrics.presentCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Absent Records</p>
                <p className="text-lg font-semibold">{selectedAttendanceMetrics.absentCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Average Result (Total/200)</p>
                <p className="text-lg font-semibold">{getAverageScore(filteredResults)}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Student Info</p>
                <div className="space-y-1 text-sm">
                  <p>Gender: {selectedStudent.gender}</p>
                  <p>Date of Birth: {formatDate(selectedStudent.dateOfBirth)}</p>
                  <p>State: {selectedStudent.stateOfOrigin}</p>
                  <p>Local Government: {selectedStudent.localGovernment}</p>
                  <p>Last Attendance Mark: {formatDate(selectedStudent.attendance.lastMarkedDate)}</p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Complete Attendance (Selected Term/Session)
                </p>
                <div className="max-h-72 overflow-auto rounded-md border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 font-medium">Date</th>
                        <th className="px-2 py-2 font-medium">AM</th>
                        <th className="px-2 py-2 font-medium">PM</th>
                        <th className="px-2 py-2 font-medium">Term</th>
                        <th className="px-2 py-2 font-medium">Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                            No attendance records for this selection.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map((record) => (
                          <tr key={record.id} className="border-t">
                            <td className="px-2 py-2">{formatDate(record.date)}</td>
                            <td className="px-2 py-2 capitalize">{record.amStatus}</td>
                            <td className="px-2 py-2 capitalize">{record.pmStatus}</td>
                            <td className="px-2 py-2">{record.termName || "-"}</td>
                            <td className="px-2 py-2">{record.academicSession || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Results (Selected Term/Session)
              </p>
              <div className="max-h-56 space-y-2 overflow-auto text-sm">
                {filteredResults.length === 0 ? (
                  <p className="text-muted-foreground">No results for this selection.</p>
                ) : (
                  filteredResults.map((result) => (
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
