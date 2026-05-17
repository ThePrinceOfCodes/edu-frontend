"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { ResultRecord, School, Staff, Student } from "@/interfaces/resource-interface"
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

export default function AnalyticsHomePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [results, setResults] = useState<ResultRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoadError(null)
      setLoading(true)

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined

        const [schoolsResult, studentsResult, staffResult, resultsResult] = await Promise.all([
          resourceService.getSchools({ limit: 500, page: 1, schoolBoard: schoolBoardId }),
          resourceService.getStudents({ limit: 2000, page: 1 }),
          resourceService.getStaff({ limit: 1000, page: 1, schoolBoard: schoolBoardId }),
          resourceService.getResults({ limit: 2000, page: 1 }),
        ])

        setSchools(schoolsResult.results)
        setStudents(studentsResult.results)
        setStaff(staffResult.results)
        setResults(resultsResult.results)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load analytics overview")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const overview = useMemo(() => {
    const teachers = staff.filter((item) => item.employmentType === "teacher")
    const nonTeaching = staff.filter((item) => item.employmentType !== "teacher")
    const averageResultScore =
      results.length > 0
        ? toPercentage(results.reduce((sum, row) => sum + (row.totalScore ?? 0), 0) / results.length)
        : 0
    const passCount = results.filter((row) => (row.totalScore ?? 0) >= 50).length
    const passRate = results.length > 0 ? toPercentage((passCount / results.length) * 100) : 0

    const schoolStudentCount = new Map<string, number>()
    students.forEach((student) => {
      const schoolId = student.currentEnrollment?.school ?? student.school
      if (!schoolId) {
        return
      }

      schoolStudentCount.set(schoolId, (schoolStudentCount.get(schoolId) ?? 0) + 1)
    })

    const schoolTeacherCount = new Map<string, number>()
    teachers.forEach((teacher) => {
      if (!teacher.school) {
        return
      }

      schoolTeacherCount.set(teacher.school, (schoolTeacherCount.get(teacher.school) ?? 0) + 1)
    })

    const schoolSnapshot = schools
      .map((school) => {
        const schoolId = school._id ?? school.id ?? ""
        const studentCount = schoolStudentCount.get(schoolId) ?? 0
        const teacherCount = schoolTeacherCount.get(schoolId) ?? 0
        const ratio = teacherCount > 0 ? toPercentage(studentCount / teacherCount) : 0

        return {
          schoolId,
          schoolName: school.name,
          studentCount,
          teacherCount,
          studentTeacherRatio: ratio,
        }
      })
      .sort((left, right) => right.studentCount - left.studentCount)

    return {
      schoolsCount: schools.length,
      studentsCount: students.length,
      teachersCount: teachers.length,
      nonTeachingCount: nonTeaching.length,
      resultsCount: results.length,
      averageResultScore,
      passRate,
      topSchoolSnapshots: schoolSnapshot.slice(0, 6),
    }
  }, [schools, students, staff, results])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground">
            Board-wide summary of student outcomes, staff mix, and key performance signals.
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
              const summaryRows = [
                { metric: "Schools", value: overview.schoolsCount },
                { metric: "Students", value: overview.studentsCount },
                { metric: "Teachers", value: overview.teachersCount },
                { metric: "Non-Teaching Staff", value: overview.nonTeachingCount },
                { metric: "Average Result Score", value: overview.averageResultScore },
                { metric: "Pass Rate", value: overview.passRate },
              ]

              const workbook = XLSX.utils.book_new()
              const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
              const snapshotSheet = XLSX.utils.json_to_sheet(
                overview.topSchoolSnapshots.map((item) => ({
                  school: item.schoolName,
                  students: item.studentCount,
                  teachers: item.teacherCount,
                  studentTeacherRatio: item.studentTeacherRatio,
                }))
              )

              XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
              XLSX.utils.book_append_sheet(workbook, snapshotSheet, "School Snapshot")
              XLSX.writeFile(workbook, `analytics-overview-${new Date().toISOString().slice(0, 10)}.xlsx`)
            }}
          >
            Export Report
          </Button>
        </div>
      ) : null}

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : null}

      {!loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Schools</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.schoolsCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Students</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.studentsCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Teachers</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.teachersCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Non-Teaching Staff</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.nonTeachingCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Average Result Score</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.averageResultScore}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Pass Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{overview.passRate}%</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">School Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">School</th>
                        <th className="px-3 py-2 text-right font-medium">Students</th>
                        <th className="px-3 py-2 text-right font-medium">Teachers</th>
                        <th className="px-3 py-2 text-right font-medium">Student:Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.topSchoolSnapshots.map((row) => (
                        <tr key={row.schoolId} className="border-t">
                          <td className="px-3 py-2 font-medium">{row.schoolName}</td>
                          <td className="px-3 py-2 text-right">{row.studentCount}</td>
                          <td className="px-3 py-2 text-right">{row.teacherCount}</td>
                          <td className="px-3 py-2 text-right">{row.studentTeacherRatio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deep Dive</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link href="/dashboard/analytics/student-performance" className="block rounded-md border px-3 py-2 hover:bg-muted/40">
                  Student Performance
                </Link>
                <Link href="/dashboard/analytics/teacher-performance" className="block rounded-md border px-3 py-2 hover:bg-muted/40">
                  Teacher Performance
                </Link>
                <Link href="/dashboard/analytics/attendance-trends" className="block rounded-md border px-3 py-2 hover:bg-muted/40">
                  Attendance Trends
                </Link>
                <Link href="/dashboard/analytics/correlation" className="block rounded-md border px-3 py-2 hover:bg-muted/40">
                  Correlation Insights
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
