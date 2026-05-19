"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { AttendanceSummary, ResultRecord, School } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { AnalyticsScreenSwitcher } from "@/components/analytics-screen-switcher"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function toPercentage(value: number) {
  if (Number.isNaN(value)) {
    return 0
  }

  return Number(value.toFixed(2))
}

function pearsonCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) {
    return 0
  }

  const n = x.length
  const sumX = x.reduce((sum, value) => sum + value, 0)
  const sumY = y.reduce((sum, value) => sum + value, 0)
  const sumXY = x.reduce((sum, value, index) => sum + value * y[index]!, 0)
  const sumX2 = x.reduce((sum, value) => sum + value * value, 0)
  const sumY2 = y.reduce((sum, value) => sum + value * value, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  if (denominator === 0) {
    return 0
  }

  return Number((numerator / denominator).toFixed(4))
}

function getInterpretation(value: number) {
  const abs = Math.abs(value)
  if (abs >= 0.7) {
    return "strong"
  }
  if (abs >= 0.4) {
    return "moderate"
  }
  if (abs >= 0.2) {
    return "weak"
  }
  return "very weak"
}

function getAttendanceRate(summary: AttendanceSummary | null) {
  if (!summary) {
    return 0
  }

  let present = 0
  let absent = 0
  summary.rows.forEach((row) => {
    summary.days.forEach((day) => {
      const s = row.statusByDate[day.date]
      if (s?.am === "present") present += 1
      else if (s?.am === "absent") absent += 1
      if (s?.pm === "present") present += 1
      else if (s?.pm === "absent") absent += 1
    })
  })

  const total = present + absent
  return total > 0 ? toPercentage((present / total) * 100) : 0
}

function toTimestamp(value?: string) {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function resolveLatestTermId(
  terms: Array<{ id?: string; _id?: string; endDate?: string; updatedAt?: string; createdAt?: string }>
) {
  const latest = [...terms].sort((left, right) => {
    const leftValue = Math.max(toTimestamp(left.endDate), toTimestamp(left.updatedAt), toTimestamp(left.createdAt))
    const rightValue = Math.max(toTimestamp(right.endDate), toTimestamp(right.updatedAt), toTimestamp(right.createdAt))
    return rightValue - leftValue
  })[0]

  return latest?._id ?? latest?.id ?? null
}

async function resolveAttendanceTermId(schoolId: string, schoolBoardId?: string) {
  try {
    const activeTerms = await resourceService.getTerms({ school: schoolId, isActive: true, limit: 1, page: 1 })
    const activeTermId = activeTerms.results[0]?._id ?? activeTerms.results[0]?.id
    if (activeTermId) {
      return activeTermId
    }
  } catch {
    // Continue with fallback logic.
  }

  try {
    const schoolTerms = await resourceService.getTerms({ school: schoolId, limit: 50, page: 1 })
    const schoolTermId = resolveLatestTermId(schoolTerms.results)
    if (schoolTermId) {
      return schoolTermId
    }
  } catch {
    // Continue with board-level fallback.
  }

  if (!schoolBoardId) {
    return null
  }

  try {
    const boardTerms = await resourceService.getTerms({ schoolBoard: schoolBoardId, limit: 50, page: 1 })
    return resolveLatestTermId(boardTerms.results)
  } catch {
    return null
  }
}

export default function CorrelationAnalyticsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [results, setResults] = useState<ResultRecord[]>([])
  const [attendanceBySchool, setAttendanceBySchool] = useState<Record<string, number>>({})
  const [selectedSchoolId, setSelectedSchoolId] = useState("")
  const [selectedSchoolSummary, setSelectedSchoolSummary] = useState<AttendanceSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoadError(null)
      setLoading(true)

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined
        const schoolsResult = await resourceService.getSchools({ limit: 500, page: 1, schoolBoard: schoolBoardId })
        const firstResultsPage = await resourceService.getResults({ limit: 1000, page: 1 })
        const remainingPageNumbers = Array.from(
          { length: Math.max(0, (firstResultsPage.totalPages ?? 1) - 1) },
          (_, index) => index + 2
        )
        const remainingPages = await Promise.all(
          remainingPageNumbers.map((page) => resourceService.getResults({ limit: 1000, page }))
        )

        const allResults = [
          ...firstResultsPage.results,
          ...remainingPages.flatMap((pageResult) => pageResult.results),
        ]

        setSchools(schoolsResult.results)
        setResults(allResults)

        const attendancePairs = await Promise.all(
          schoolsResult.results.map(async (school) => {
            const schoolId = school._id ?? school.id
            if (!schoolId) {
              return null
            }

            try {
              const termId = await resolveAttendanceTermId(schoolId, schoolBoardId)
              if (!termId) {
                return [schoolId, 0] as const
              }

              const summary = await resourceService.getAttendanceSummary({ school: schoolId, termId })
              return [schoolId, getAttendanceRate(summary)] as const
            } catch {
              return [schoolId, 0] as const
            }
          })
        )

        setAttendanceBySchool(
          Object.fromEntries(attendancePairs.filter((item): item is readonly [string, number] => item !== null))
        )
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load correlation analytics")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    async function loadSchoolSummary() {
      if (!selectedSchoolId) {
        setSelectedSchoolSummary(null)
        return
      }

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined
        const termId = await resolveAttendanceTermId(selectedSchoolId, schoolBoardId)
        if (!termId) {
          setSelectedSchoolSummary(null)
          return
        }

        const summary = await resourceService.getAttendanceSummary({ school: selectedSchoolId, termId })
        setSelectedSchoolSummary(summary)
      } catch {
        setSelectedSchoolSummary(null)
      }
    }

    void loadSchoolSummary()
  }, [selectedSchoolId])

  const boardCorrelation = useMemo(() => {
    const schoolIds = new Set([...Object.keys(attendanceBySchool), ...results.map((row) => row.school)])
    const attendanceSeries: number[] = []
    const resultSeries: number[] = []
    const detail: Array<{ schoolId: string; schoolName: string; attendanceRate: number; averageScore: number }> = []

    schoolIds.forEach((schoolId) => {
      const schoolResults = results.filter((row) => row.school === schoolId)
      if (schoolResults.length === 0) {
        return
      }

      const attendanceRate = attendanceBySchool[schoolId] ?? 0
      const averageScore = toPercentage(
        schoolResults.reduce((sum, row) => sum + (row.totalScore ?? 0), 0) / schoolResults.length
      )

      attendanceSeries.push(attendanceRate)
      resultSeries.push(averageScore)

      const school = schools.find((item) => (item._id ?? item.id) === schoolId)
      detail.push({
        schoolId,
        schoolName: school?.name ?? schoolId,
        attendanceRate,
        averageScore,
      })
    })

    return {
      coefficient: pearsonCorrelation(attendanceSeries, resultSeries),
      sampleSize: detail.length,
      detail: detail.sort((left, right) => right.attendanceRate - left.attendanceRate),
    }
  }, [attendanceBySchool, results, schools])

  const schoolCorrelation = useMemo(() => {
    if (!selectedSchoolSummary) {
      return { coefficient: 0, sampleSize: 0, rows: [] as Array<{ studentId: string; studentName: string; attendanceRate: number; averageScore: number }> }
    }

    const resultsByStudent = new Map<string, ResultRecord[]>()
    results
      .filter((row) => row.school === selectedSchoolSummary.school.id)
      .forEach((row) => {
        if (!resultsByStudent.has(row.student)) {
          resultsByStudent.set(row.student, [])
        }

        resultsByStudent.get(row.student)?.push(row)
      })

    const rows = selectedSchoolSummary.rows
      .map((row) => {
        const studentResults = resultsByStudent.get(row.studentId) ?? []
        if (studentResults.length === 0) {
          return null
        }

        const averageScore = toPercentage(
          studentResults.reduce((sum, item) => sum + (item.totalScore ?? 0), 0) / studentResults.length
        )

        return {
          studentId: row.studentId,
          studentName: row.studentName,
          attendanceRate: row.attendancePercentage,
          averageScore,
        }
      })
      .filter((item): item is { studentId: string; studentName: string; attendanceRate: number; averageScore: number } => item !== null)

    return {
      coefficient: pearsonCorrelation(
        rows.map((item) => item.attendanceRate),
        rows.map((item) => item.averageScore)
      ),
      sampleSize: rows.length,
      rows: rows.sort((left, right) => right.attendanceRate - left.attendanceRate).slice(0, 12),
    }
  }, [selectedSchoolSummary, results])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Correlation Insights</h2>
          <p className="text-sm text-muted-foreground">
            Relationship between attendance behavior and academic performance indicators.
          </p>
        </div>
        <AnalyticsScreenSwitcher />
      </div>

      {!loading ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const workbook = XLSX.utils.book_new()
              const summarySheet = XLSX.utils.json_to_sheet([
                { metric: "Board Correlation Coefficient", value: boardCorrelation.coefficient },
                { metric: "Board Sample Size", value: boardCorrelation.sampleSize },
                { metric: "Board Relationship", value: getInterpretation(boardCorrelation.coefficient) },
                { metric: "School Correlation Coefficient", value: schoolCorrelation.coefficient },
                { metric: "School Sample Size", value: schoolCorrelation.sampleSize },
                { metric: "School Relationship", value: getInterpretation(schoolCorrelation.coefficient) },
              ])
              const boardDetailSheet = XLSX.utils.json_to_sheet(
                boardCorrelation.detail.map((item) => ({
                  school: item.schoolName,
                  attendanceRate: item.attendanceRate,
                  averageScore: item.averageScore,
                }))
              )
              const schoolDetailSheet = XLSX.utils.json_to_sheet(
                schoolCorrelation.rows.map((item) => ({
                  studentName: item.studentName,
                  attendanceRate: item.attendanceRate,
                  averageScore: item.averageScore,
                }))
              )

              XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
              XLSX.utils.book_append_sheet(workbook, boardDetailSheet, "Board Detail")
              XLSX.utils.book_append_sheet(workbook, schoolDetailSheet, "School Detail")
              XLSX.writeFile(workbook, `correlation-insights-${new Date().toISOString().slice(0, 10)}.xlsx`)
            }}
          >
            Export Report
          </Button>
        </div>
      ) : null}

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Board Correlation Coefficient (r)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{boardCorrelation.coefficient}</p>
                <p className="text-xs text-muted-foreground">
                  {getInterpretation(boardCorrelation.coefficient)} relationship across {boardCorrelation.sampleSize} schools
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">School-Level Correlation (r)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{schoolCorrelation.coefficient}</p>
                <p className="text-xs text-muted-foreground">
                  {getInterpretation(schoolCorrelation.coefficient)} relationship within selected school ({schoolCorrelation.sampleSize} students)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Board-Level Correlation Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">School</th>
                      <th className="px-3 py-2 text-right font-medium">Attendance Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Average Result Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardCorrelation.detail.map((row) => (
                      <tr key={row.schoolId} className="border-t">
                        <td className="px-3 py-2 font-medium">{row.schoolName}</td>
                        <td className="px-3 py-2 text-right">{row.attendanceRate}%</td>
                        <td className="px-3 py-2 text-right">{row.averageScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">School-Level Drilldown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Select School</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedSchoolId}
                  onChange={(event) => setSelectedSchoolId(event.target.value)}
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

              {selectedSchoolId ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Student</th>
                        <th className="px-3 py-2 text-right font-medium">Attendance %</th>
                        <th className="px-3 py-2 text-right font-medium">Average Score %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolCorrelation.rows.map((row) => (
                        <tr key={row.studentId} className="border-t">
                          <td className="px-3 py-2 font-medium">{row.studentName}</td>
                          <td className="px-3 py-2 text-right">{row.attendanceRate}%</td>
                          <td className="px-3 py-2 text-right">{row.averageScore}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
