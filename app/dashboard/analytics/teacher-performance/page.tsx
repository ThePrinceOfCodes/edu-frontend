"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { AttendanceSummary, ResultRecord, School, Staff, Student } from "@/interfaces/resource-interface"
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

function getAttendanceRate(summary: AttendanceSummary | null) {
  if (!summary) {
    return 0
  }

  let present = 0
  let absent = 0
  summary.rows.forEach((row) => {
    summary.days.forEach((day) => {
      const status = row.statusByDate[day.date]
      if (status === "present") {
        present += 1
      } else if (status === "absent") {
        absent += 1
      }
    })
  })

  const total = present + absent
  return total > 0 ? toPercentage((present / total) * 100) : 0
}

export default function TeacherPerformanceAnalyticsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Staff[]>([])
  const [results, setResults] = useState<ResultRecord[]>([])
  const [attendanceBySchool, setAttendanceBySchool] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoadError(null)
      setLoading(true)

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined
        const [schoolsResult, staffResult, studentsResult, resultsResult] = await Promise.all([
          resourceService.getSchools({ limit: 500, page: 1, schoolBoard: schoolBoardId }),
          resourceService.getStaff({ limit: 2000, page: 1, schoolBoard: schoolBoardId, employmentType: "teacher" }),
          resourceService.getStudents({ limit: 3000, page: 1 }),
          resourceService.getResults({ limit: 3000, page: 1 }),
        ])

        setSchools(schoolsResult.results)
        setTeachers(staffResult.results)
        setStudents(studentsResult.results)
        setResults(resultsResult.results)

        const attendanceEntries = await Promise.all(
          schoolsResult.results.map(async (school) => {
            const schoolId = school._id ?? school.id
            if (!schoolId) {
              return null
            }

            try {
              const termsResult = await resourceService.getTerms({
                school: schoolId,
                isActive: true,
                limit: 1,
                page: 1,
              })
              const term = termsResult.results[0]
              const termId = term?._id ?? term?.id
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
          Object.fromEntries(attendanceEntries.filter((item): item is readonly [string, number] => item !== null))
        )
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load teacher performance analytics")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const schoolMetrics = useMemo(() => {
    const teacherBySchool = new Map<string, number>()
    const studentBySchool = new Map<string, number>()
    const resultBySchool = new Map<string, { total: number; scoreSum: number }>()

    teachers.forEach((teacher) => {
      if (!teacher.school) {
        return
      }

      teacherBySchool.set(teacher.school, (teacherBySchool.get(teacher.school) ?? 0) + 1)
    })

    students.forEach((student) => {
      const schoolId = student.currentEnrollment?.school ?? student.school
      if (!schoolId) {
        return
      }

      studentBySchool.set(schoolId, (studentBySchool.get(schoolId) ?? 0) + 1)
    })

    results.forEach((row) => {
      if (!resultBySchool.has(row.school)) {
        resultBySchool.set(row.school, { total: 0, scoreSum: 0 })
      }

      const bucket = resultBySchool.get(row.school)
      if (!bucket) {
        return
      }

      bucket.total += 1
      bucket.scoreSum += row.totalScore ?? 0
    })

    return schools
      .map((school) => {
        const schoolId = school._id ?? school.id ?? ""
        const teacherCount = teacherBySchool.get(schoolId) ?? 0
        const studentCount = studentBySchool.get(schoolId) ?? 0
        const resultBucket = resultBySchool.get(schoolId)
        const averageResultScore =
          resultBucket && resultBucket.total > 0 ? toPercentage(resultBucket.scoreSum / resultBucket.total) : 0
        const attendanceRate = attendanceBySchool[schoolId] ?? 0
        const studentTeacherRatio = teacherCount > 0 ? toPercentage(studentCount / teacherCount) : 0
        const compositeIndex = toPercentage(averageResultScore * 0.5 + attendanceRate * 0.5)

        return {
          schoolId,
          schoolName: school.name,
          teacherCount,
          studentCount,
          studentTeacherRatio,
          averageResultScore,
          attendanceRate,
          compositeIndex,
        }
      })
      .sort((left, right) => right.compositeIndex - left.compositeIndex)
  }, [schools, teachers, students, results, attendanceBySchool])

  const overview = useMemo(() => {
    const teacherCount = teachers.length
    const schoolCountWithTeachers = schoolMetrics.filter((item) => item.teacherCount > 0).length
    const averageComposite =
      schoolMetrics.length > 0
        ? toPercentage(schoolMetrics.reduce((sum, item) => sum + item.compositeIndex, 0) / schoolMetrics.length)
        : 0

    return {
      teacherCount,
      schoolCountWithTeachers,
      averageComposite,
    }
  }, [teachers, schoolMetrics])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Teacher Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">
            School-level proxy view combining teaching capacity, student outcomes, and attendance performance.
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
                { metric: "Teachers", value: overview.teacherCount },
                { metric: "Schools With Teachers", value: overview.schoolCountWithTeachers },
                { metric: "Composite Index", value: overview.averageComposite },
              ])
              const detailSheet = XLSX.utils.json_to_sheet(
                schoolMetrics.map((item) => ({
                  school: item.schoolName,
                  teachers: item.teacherCount,
                  students: item.studentCount,
                  studentTeacherRatio: item.studentTeacherRatio,
                  averageResultScore: item.averageResultScore,
                  attendanceRate: item.attendanceRate,
                  compositeIndex: item.compositeIndex,
                }))
              )

              XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
              XLSX.utils.book_append_sheet(workbook, detailSheet, "School Metrics")
              XLSX.writeFile(workbook, `teacher-performance-${new Date().toISOString().slice(0, 10)}.xlsx`)
            }}
          >
            Export Report
          </Button>
        </div>
      ) : null}

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="p-3 text-xs text-amber-900">
          This report uses proxy metrics. Direct teacher-to-class result attribution can be added when explicit class-teacher assignment data is available.
        </CardContent>
      </Card>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Teachers</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{overview.teacherCount}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Schools With Teachers</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{overview.schoolCountWithTeachers}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Composite Index</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{overview.averageComposite}%</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">School Teacher Effectiveness (Proxy)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">School</th>
                      <th className="px-3 py-2 text-right font-medium">Teachers</th>
                      <th className="px-3 py-2 text-right font-medium">Students</th>
                      <th className="px-3 py-2 text-right font-medium">Student:Teacher</th>
                      <th className="px-3 py-2 text-right font-medium">Avg Result</th>
                      <th className="px-3 py-2 text-right font-medium">Attendance</th>
                      <th className="px-3 py-2 text-right font-medium">Composite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolMetrics.map((row) => (
                      <tr key={row.schoolId} className="border-t">
                        <td className="px-3 py-2 font-medium">{row.schoolName}</td>
                        <td className="px-3 py-2 text-right">{row.teacherCount}</td>
                        <td className="px-3 py-2 text-right">{row.studentCount}</td>
                        <td className="px-3 py-2 text-right">{row.studentTeacherRatio}</td>
                        <td className="px-3 py-2 text-right">{row.averageResultScore}%</td>
                        <td className="px-3 py-2 text-right">{row.attendanceRate}%</td>
                        <td className="px-3 py-2 text-right font-semibold">{row.compositeIndex}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
