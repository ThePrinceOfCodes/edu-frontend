"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { AttendanceSummary, School } from "@/interfaces/resource-interface"
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

export default function AttendanceTrendsAnalyticsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([])
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
        setSchools(schoolsResult.results)

        const toTimestamp = (value?: string) => {
          if (!value) {
            return 0
          }

          const parsed = Date.parse(value)
          return Number.isNaN(parsed) ? 0 : parsed
        }

        const termSortValue = (term: { endDate?: string; updatedAt?: string; createdAt?: string }) => {
          return Math.max(toTimestamp(term.endDate), toTimestamp(term.updatedAt), toTimestamp(term.createdAt))
        }

        const resolveTermIdForSchool = async (schoolId: string) => {
          try {
            const activeTerms = await resourceService.getTerms({
              school: schoolId,
              isActive: true,
              limit: 1,
              page: 1,
            })
            const activeTermId = activeTerms.results[0]?._id ?? activeTerms.results[0]?.id
            if (activeTermId) {
              return activeTermId
            }
          } catch {
            // Continue with fallback logic.
          }

          try {
            const schoolTerms = await resourceService.getTerms({ school: schoolId, limit: 50, page: 1 })
            const latestSchoolTerm = [...schoolTerms.results].sort((left, right) => termSortValue(right) - termSortValue(left))[0]
            const latestSchoolTermId = latestSchoolTerm?._id ?? latestSchoolTerm?.id
            if (latestSchoolTermId) {
              return latestSchoolTermId
            }
          } catch {
            // Continue with board-level fallback.
          }

          if (!schoolBoardId) {
            return null
          }

          try {
            const boardTerms = await resourceService.getTerms({ schoolBoard: schoolBoardId, limit: 50, page: 1 })
            const latestBoardTerm = [...boardTerms.results].sort((left, right) => termSortValue(right) - termSortValue(left))[0]
            return latestBoardTerm?._id ?? latestBoardTerm?.id ?? null
          } catch {
            return null
          }
        }

        const summaryRows = await Promise.all(
          schoolsResult.results.map(async (school) => {
            const schoolId = school._id ?? school.id
            if (!schoolId) {
              return null
            }

            try {
              const termId = await resolveTermIdForSchool(schoolId)
              if (!termId) {
                return null
              }

              return await resourceService.getAttendanceSummary({ school: schoolId, termId })
            } catch {
              return null
            }
          })
        )

        setSummaries(summaryRows.filter((item): item is AttendanceSummary => item !== null))
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load attendance trends")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const analytics = useMemo(() => {
    const perSchool = summaries.map((summary) => {
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
      const rate = total > 0 ? toPercentage((present / total) * 100) : 0

      return {
        schoolId: summary.school.id,
        schoolName: summary.school.name,
        present,
        absent,
        rate,
      }
    })

    const dailyMap = new Map<string, { date: string; label: string; present: number; absent: number }>()
    summaries.forEach((summary) => {
      summary.days.forEach((day) => {
        if (!dailyMap.has(day.date)) {
          dailyMap.set(day.date, {
            date: day.date,
            label: day.label,
            present: 0,
            absent: 0,
          })
        }

        const bucket = dailyMap.get(day.date)
        if (!bucket) {
          return
        }

        summary.rows.forEach((row) => {
          const s = row.statusByDate[day.date]
          if (s?.am === "present") bucket.present += 1
          else if (s?.am === "absent") bucket.absent += 1
          if (s?.pm === "present") bucket.present += 1
          else if (s?.pm === "absent") bucket.absent += 1
        })
      })
    })

    const boardDailyTrend = Array.from(dailyMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((item) => {
        const total = item.present + item.absent
        return {
          ...item,
          rate: total > 0 ? toPercentage((item.present / total) * 100) : 0,
        }
      })

    const totalPresent = perSchool.reduce((sum, item) => sum + item.present, 0)
    const totalAbsent = perSchool.reduce((sum, item) => sum + item.absent, 0)
    const totalMarks = totalPresent + totalAbsent
    const boardRate = totalMarks > 0 ? toPercentage((totalPresent / totalMarks) * 100) : 0

    const sorted = [...perSchool].sort((left, right) => right.rate - left.rate)
    return {
      boardRate,
      totalPresent,
      totalAbsent,
      schoolsWithData: perSchool.length,
      trend: boardDailyTrend,
      best: sorted.slice(0, 5),
      worst: [...sorted].reverse().slice(0, 5),
    }
  }, [summaries])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendance Trends Analytics</h2>
          <p className="text-sm text-muted-foreground">Board-wide attendance movement and school-level trend ranking.</p>
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
                { metric: "Schools Covered", value: analytics.schoolsWithData },
                { metric: "Attendance Rate", value: analytics.boardRate },
                { metric: "Present Marks", value: analytics.totalPresent },
                { metric: "Absent Marks", value: analytics.totalAbsent },
              ])
              const trendSheet = XLSX.utils.json_to_sheet(
                analytics.trend.map((item) => ({
                  date: item.date,
                  label: item.label,
                  present: item.present,
                  absent: item.absent,
                  attendanceRate: item.rate,
                }))
              )
              const rankingSheet = XLSX.utils.json_to_sheet([
                ...analytics.best.map((item) => ({
                  segment: "Best",
                  school: item.schoolName,
                  attendanceRate: item.rate,
                  present: item.present,
                  absent: item.absent,
                })),
                ...analytics.worst.map((item) => ({
                  segment: "Needs Support",
                  school: item.schoolName,
                  attendanceRate: item.rate,
                  present: item.present,
                  absent: item.absent,
                })),
              ])

              XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
              XLSX.utils.book_append_sheet(workbook, trendSheet, "Daily Trend")
              XLSX.utils.book_append_sheet(workbook, rankingSheet, "School Ranking")
              XLSX.writeFile(workbook, `attendance-trends-${new Date().toISOString().slice(0, 10)}.xlsx`)
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
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Schools Covered</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.schoolsWithData}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.boardRate}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Present Marks</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.totalPresent}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Absent Marks</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.totalAbsent}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Board Daily Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.trend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trend data available.</p>
              ) : (
                <div className="grid grid-cols-10 items-end gap-2">
                  {analytics.trend.slice(-10).map((day) => (
                    <div key={day.date} className="space-y-2 text-center">
                      <div className="flex h-36 items-end justify-center rounded-md bg-slate-100 px-1 py-2">
                        <div
                          className="w-full rounded-t bg-gradient-to-b from-cyan-400 to-cyan-700"
                          style={{ height: `${Math.max(0, Math.min(100, day.rate))}%` }}
                          title={`${day.rate}%`}
                        />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{day.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Best Schools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analytics.best.map((item, index) => (
                  <div key={item.schoolId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{index + 1}. {item.schoolName}</p>
                      <p className="text-muted-foreground">{item.present} present • {item.absent} absent</p>
                    </div>
                    <span className="font-semibold text-emerald-700">{item.rate}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schools Needing Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analytics.worst.map((item, index) => (
                  <div key={item.schoolId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{index + 1}. {item.schoolName}</p>
                      <p className="text-muted-foreground">{item.present} present • {item.absent} absent</p>
                    </div>
                    <span className="font-semibold text-rose-700">{item.rate}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
