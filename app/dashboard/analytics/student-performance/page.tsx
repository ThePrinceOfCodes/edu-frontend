"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { Class, ResultRecord, School, Student } from "@/interfaces/resource-interface"
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

export default function StudentPerformanceAnalyticsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [results, setResults] = useState<ResultRecord[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoadError(null)
      setLoading(true)

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined

        const [schoolsResult, classesResult, studentsResult, resultsResult] = await Promise.all([
          resourceService.getSchools({ limit: 500, page: 1, schoolBoard: schoolBoardId }),
          resourceService.getClasses({ limit: 500, page: 1 }),
          resourceService.getStudents({ limit: 3000, page: 1 }),
          resourceService.getResults({ limit: 3000, page: 1 }),
        ])

        setSchools(schoolsResult.results)
        setClasses(classesResult.results)
        setStudents(studentsResult.results)
        setResults(resultsResult.results)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load student performance analytics")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const classNameMap = useMemo(() => {
    return new Map(classes.map((item) => [item._id ?? item.id ?? item.code, `${item.code} - ${item.name}`]))
  }, [classes])

  const studentMap = useMemo(() => {
    return new Map(
      students.map((student) => {
        const studentId = student._id ?? student.id ?? ""
        const fullName = `${student.firstName} ${student.middleName ?? ""} ${student.lastName}`.replace(/\s+/g, " ").trim()
        return [studentId, { fullName, regNumber: student.regNumber }]
      })
    )
  }, [students])

  const availableClasses = useMemo(() => {
    if (!selectedSchoolId) {
      return classes
    }

    const schoolStudents = students.filter((item) => (item.currentEnrollment?.school ?? item.school) === selectedSchoolId)
    const classIds = new Set(schoolStudents.map((item) => item.currentEnrollment?.classId ?? item.classId).filter(Boolean))
    return classes.filter((item) => classIds.has(item._id ?? item.id ?? ""))
  }, [classes, students, selectedSchoolId])

  const filteredResults = useMemo(() => {
    return results.filter((row) => {
      if (selectedSchoolId && row.school !== selectedSchoolId) {
        return false
      }

      if (selectedClassId && row.classId !== selectedClassId) {
        return false
      }

      return true
    })
  }, [results, selectedSchoolId, selectedClassId])

  const analytics = useMemo(() => {
    const totalRecords = filteredResults.length
    const averageScore =
      totalRecords > 0
        ? toPercentage(filteredResults.reduce((sum, row) => sum + (row.totalScore ?? 0), 0) / totalRecords)
        : 0
    const passCount = filteredResults.filter((row) => (row.totalScore ?? 0) >= 50).length
    const passRate = totalRecords > 0 ? toPercentage((passCount / totalRecords) * 100) : 0

    const subjectMap = new Map<string, { subject: string; total: number; pass: number; scoreSum: number }>()
    const studentMapByScore = new Map<string, { studentId: string; count: number; scoreSum: number }>()

    filteredResults.forEach((row) => {
      if (!subjectMap.has(row.subject)) {
        subjectMap.set(row.subject, { subject: row.subject, total: 0, pass: 0, scoreSum: 0 })
      }

      const subjectBucket = subjectMap.get(row.subject)
      if (subjectBucket) {
        subjectBucket.total += 1
        subjectBucket.scoreSum += row.totalScore ?? 0
        if ((row.totalScore ?? 0) >= 50) {
          subjectBucket.pass += 1
        }
      }

      if (!studentMapByScore.has(row.student)) {
        studentMapByScore.set(row.student, { studentId: row.student, count: 0, scoreSum: 0 })
      }

      const studentBucket = studentMapByScore.get(row.student)
      if (studentBucket) {
        studentBucket.count += 1
        studentBucket.scoreSum += row.totalScore ?? 0
      }
    })

    const subjectPerformance = Array.from(subjectMap.values())
      .map((item) => ({
        ...item,
        averageScore: item.total > 0 ? toPercentage(item.scoreSum / item.total) : 0,
        passRate: item.total > 0 ? toPercentage((item.pass / item.total) * 100) : 0,
      }))
      .sort((left, right) => right.averageScore - left.averageScore)

    const topStudents = Array.from(studentMapByScore.values())
      .map((item) => ({
        ...item,
        averageScore: item.count > 0 ? toPercentage(item.scoreSum / item.count) : 0,
      }))
      .sort((left, right) => right.averageScore - left.averageScore)
      .slice(0, 10)

    return {
      totalRecords,
      averageScore,
      passRate,
      subjectPerformance,
      topStudents,
    }
  }, [filteredResults])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Student Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">Track achievement levels by subject, class, and student.</p>
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
                { metric: "Records Analyzed", value: analytics.totalRecords },
                { metric: "Average Score", value: analytics.averageScore },
                { metric: "Pass Rate", value: analytics.passRate },
              ])
              const subjectSheet = XLSX.utils.json_to_sheet(
                analytics.subjectPerformance.map((item) => ({
                  subject: item.subject,
                  averageScore: item.averageScore,
                  passRate: item.passRate,
                  records: item.total,
                }))
              )
              const topStudentsSheet = XLSX.utils.json_to_sheet(
                analytics.topStudents.map((item) => {
                  const studentMeta = studentMap.get(item.studentId)
                  const student = students.find((candidate) => (candidate._id ?? candidate.id) === item.studentId)
                  return {
                    studentName: studentMeta?.fullName ?? item.studentId,
                    regNumber: studentMeta?.regNumber ?? "",
                    class: classNameMap.get(student?.currentEnrollment?.classId ?? student?.classId ?? "") ?? "",
                    averageScore: item.averageScore,
                    records: item.count,
                  }
                })
              )

              XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")
              XLSX.utils.book_append_sheet(workbook, subjectSheet, "Subject Performance")
              XLSX.utils.book_append_sheet(workbook, topStudentsSheet, "Top Students")
              XLSX.writeFile(workbook, `student-performance-${new Date().toISOString().slice(0, 10)}.xlsx`)
            }}
          >
            Export Report
          </Button>
        </div>
      ) : null}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">School</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedSchoolId}
              onChange={(event) => {
                setSelectedSchoolId(event.target.value)
                setSelectedClassId("")
              }}
            >
              <option value="">All schools</option>
              {schools.map((item) => {
                const schoolId = item._id ?? item.id
                if (!schoolId) {
                  return null
                }

                return (
                  <option key={schoolId} value={schoolId}>
                    {item.name}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
            >
              <option value="">All classes</option>
              {availableClasses.map((item) => {
                const classId = item._id ?? item.id
                if (!classId) {
                  return null
                }

                return (
                  <option key={classId} value={classId}>
                    {item.code} - {item.name}
                  </option>
                )
              })}
            </select>
          </div>
        </CardContent>
      </Card>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Records Analyzed</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.totalRecords}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Average Score</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.averageScore}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Pass Rate</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{analytics.passRate}%</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Subject</th>
                        <th className="px-3 py-2 text-right font-medium">Average</th>
                        <th className="px-3 py-2 text-right font-medium">Pass Rate</th>
                        <th className="px-3 py-2 text-right font-medium">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.subjectPerformance.map((row) => (
                        <tr key={row.subject} className="border-t">
                          <td className="px-3 py-2 font-medium">{row.subject}</td>
                          <td className="px-3 py-2 text-right">{row.averageScore}%</td>
                          <td className="px-3 py-2 text-right">{row.passRate}%</td>
                          <td className="px-3 py-2 text-right">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Student</th>
                        <th className="px-3 py-2 text-left font-medium">Class</th>
                        <th className="px-3 py-2 text-right font-medium">Average</th>
                        <th className="px-3 py-2 text-right font-medium">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topStudents.map((row) => {
                        const studentMeta = studentMap.get(row.studentId)
                        const student = students.find((item) => (item._id ?? item.id) === row.studentId)
                        const className = classNameMap.get(student?.currentEnrollment?.classId ?? student?.classId ?? "")

                        return (
                          <tr key={row.studentId} className="border-t">
                            <td className="px-3 py-2 font-medium">
                              {studentMeta?.fullName ?? row.studentId}
                              <div className="text-xs text-muted-foreground">{studentMeta?.regNumber ?? "-"}</div>
                            </td>
                            <td className="px-3 py-2">{className ?? "-"}</td>
                            <td className="px-3 py-2 text-right">{row.averageScore}%</td>
                            <td className="px-3 py-2 text-right">{row.count}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
