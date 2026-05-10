"use client"

import { useEffect, useMemo, useState } from "react"

import type { AttendanceSummary, Class, School } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusView: Record<string, { label: string; className: string }> = {
  present: { label: "P", className: "text-emerald-600" },
  absent: { label: "A", className: "text-destructive" },
  "-": { label: "-", className: "text-muted-foreground" },
}

function isWeekday(dateKey: string) {
  const dayOfWeek = new Date(`${dateKey}T00:00:00Z`).getUTCDay()
  return dayOfWeek !== 0 && dayOfWeek !== 6
}

function clampPercentage(value: number) {
  if (Number.isNaN(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, value))
}

function resolveGender(
  row: { studentId: string; gender?: "male" | "female" },
  fallbackMap?: Record<string, "male" | "female">
) {
  return row.gender ?? fallbackMap?.[row.studentId]
}

export default function AttendancePage() {
  const [schools, setSchools] = useState<School[]>([])
  const [schoolClasses, setSchoolClasses] = useState<Class[]>([])
  const [allSchoolSummaries, setAllSchoolSummaries] = useState<AttendanceSummary[]>([])
  const [allSchoolGenderMaps, setAllSchoolGenderMaps] = useState<Record<string, Record<string, "male" | "female">>>({})
  const [selectedSchoolGenderMap, setSelectedSchoolGenderMap] = useState<Record<string, "male" | "female">>({})
  const [selectedSchool, setSelectedSchool] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [classesLoading, setClassesLoading] = useState(false)

  async function resolveActiveTermId(schoolId: string) {
    try {
      const activeTerm = await resourceService.getActiveTerm({ school: schoolId })
      return activeTerm._id ?? activeTerm.id ?? ""
    } catch {
      const authUser = authService.getStoredUser()
      const fallbackTerms = await resourceService.getTerms({
        schoolBoard: authUser?.schoolBoardId ?? undefined,
        school: authUser?.schoolId ?? undefined,
        isActive: true,
        limit: 1,
        page: 1,
      })

      const term = fallbackTerms.results[0]
      return term?._id ?? term?.id ?? ""
    }
  }

  useEffect(() => {
    async function loadSchools() {
      try {
        const schoolResult = await resourceService.getSchools()
        setSchools(schoolResult.results)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load schools")
      }
    }

    void loadSchools()
  }, [])

  useEffect(() => {
    if (selectedSchool) {
      setAllSchoolSummaries([])
      setAllSchoolGenderMaps({})
      return
    }

    if (schools.length === 0) {
      setAllSchoolSummaries([])
      setAllSchoolGenderMaps({})
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadAllSchoolsDashboard() {
      setLoadError(null)
      setLoading(true)
      setSummary(null)

      try {
        const summaries = await Promise.all(
          schools.map(async (school) => {
            const schoolId = school._id ?? school.id
            if (!schoolId) {
              return null
            }

            try {
              const termId = await resolveActiveTermId(schoolId)
              if (!termId) {
                return null
              }

              return await resourceService.getAttendanceSummary({ school: schoolId, termId })
            } catch {
              return null
            }
          })
        )

        if (cancelled) {
          return
        }

        const filteredSummaries = summaries.filter((item): item is AttendanceSummary => item !== null)
        setAllSchoolSummaries(filteredSummaries)

        const schoolGenderEntries = await Promise.all(
          filteredSummaries.map(async (schoolSummary) => {
            try {
              const studentResult = await resourceService.getStudents({
                school: schoolSummary.school.id,
                limit: 1000,
                page: 1,
              })

              const genderMap = studentResult.results.reduce<Record<string, "male" | "female">>((acc, student) => {
                const studentId = student._id ?? student.id
                if (!studentId || (student.gender !== "male" && student.gender !== "female")) {
                  return acc
                }

                acc[studentId] = student.gender
                return acc
              }, {})

              return [schoolSummary.school.id, genderMap] as const
            } catch {
              return [schoolSummary.school.id, {}] as const
            }
          })
        )

        if (cancelled) {
          return
        }

        setAllSchoolGenderMaps(Object.fromEntries(schoolGenderEntries))
      } catch (error) {
        if (!cancelled) {
          setAllSchoolSummaries([])
          setAllSchoolGenderMaps({})
          setLoadError(error instanceof Error ? error.message : "Unable to load attendance summary")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAllSchoolsDashboard()

    return () => {
      cancelled = true
    }
  }, [selectedSchool, schools])

  useEffect(() => {
    if (!selectedSchool) {
      setSchoolClasses([])
      setSelectedClassId("")
      setSelectedSchoolGenderMap({})
      return
    }

    let cancelled = false

    async function loadSchoolClasses() {
      setClassesLoading(true)

      try {
        const [schoolDetail, classResult, studentResult] = await Promise.all([
          resourceService.getSchoolById(selectedSchool),
          resourceService.getClasses({ limit: 500, page: 1 }),
          resourceService.getStudents({ school: selectedSchool, limit: 1000, page: 1 }),
        ])

        if (cancelled) {
          return
        }

        const schoolClassIds = new Set((schoolDetail.classes ?? []).filter(Boolean))
        const nextClasses = classResult.results
          .filter((classItem) => schoolClassIds.has(classItem._id ?? classItem.id ?? ""))
          .sort((left, right) => left.code.localeCompare(right.code))

        setSchoolClasses(nextClasses)
        const genderMap = studentResult.results.reduce<Record<string, "male" | "female">>((acc, student) => {
          const studentId = student._id ?? student.id
          if (!studentId || (student.gender !== "male" && student.gender !== "female")) {
            return acc
          }

          acc[studentId] = student.gender
          return acc
        }, {})
        setSelectedSchoolGenderMap(genderMap)
        setSelectedClassId((current) =>
          nextClasses.some((classItem) => (classItem._id ?? classItem.id) === current) ? current : ""
        )
      } catch (error) {
        if (!cancelled) {
          setSchoolClasses([])
          setSelectedClassId("")
          setSelectedSchoolGenderMap({})
          setLoadError(error instanceof Error ? error.message : "Unable to load classes")
        }
      } finally {
        if (!cancelled) {
          setClassesLoading(false)
        }
      }
    }

    void loadSchoolClasses()

    return () => {
      cancelled = true
    }
  }, [selectedSchool])

  useEffect(() => {
    if (!selectedSchool) {
      setSummary(null)
      return
    }

    async function loadSummary() {
      setLoadError(null)
      setLoading(true)

      try {
        const termId = await resolveActiveTermId(selectedSchool)

        if (!termId) {
          setSummary(null)
          setLoadError("No active term found for this school or school board")
          return
        }

        const result = await resourceService.getAttendanceSummary(
          selectedClassId
            ? { school: selectedSchool, termId, classId: selectedClassId }
            : { school: selectedSchool, termId }
        )
        setSummary(result)
      } catch (error) {
        setSummary(null)
        setLoadError(error instanceof Error ? error.message : "Unable to load attendance summary")
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [selectedSchool, selectedClassId])

  const activeCount = useMemo(() => summary?.rows.length ?? 0, [summary])
  const visibleDays = useMemo(
    () => (summary?.days ?? []).filter((day) => isWeekday(day.date)),
    [summary]
  )
  const selectedClass = useMemo(
    () => schoolClasses.find((classItem) => (classItem._id ?? classItem.id) === selectedClassId) ?? null,
    [schoolClasses, selectedClassId]
  )
  const allSchoolsDashboardMetrics = useMemo(() => {
    if (allSchoolSummaries.length === 0) {
      return null
    }

    const dayMap = new Map<string, { date: string; label: string; present: number; absent: number }>()
    const schoolPerformance: Array<{ schoolId: string; schoolName: string; rate: number; present: number; absent: number }> = []
    const schoolSummaries: Array<{
      schoolId: string
      schoolName: string
      totalStudents: number
      attendancePercentage: number
      maleAttendancePercentage: number
      femaleAttendancePercentage: number
    }> = []
    let totalStudents = 0
    let totalMaleStudents = 0
    let totalFemaleStudents = 0

    allSchoolSummaries.forEach((schoolSummary) => {
      const fallbackGenderMap = allSchoolGenderMaps[schoolSummary.school.id]
      totalStudents += schoolSummary.rows.length
      totalMaleStudents += schoolSummary.rows.filter((row) => resolveGender(row, fallbackGenderMap) === "male").length
      totalFemaleStudents += schoolSummary.rows.filter((row) => resolveGender(row, fallbackGenderMap) === "female").length
      const schoolVisibleDays = schoolSummary.days.filter((day) => isWeekday(day.date))
      let schoolPresent = 0
      let schoolAbsent = 0
      let schoolMalePresent = 0
      let schoolMaleAbsent = 0
      let schoolFemalePresent = 0
      let schoolFemaleAbsent = 0

      schoolVisibleDays.forEach((day) => {
        if (!dayMap.has(day.date)) {
          dayMap.set(day.date, {
            date: day.date,
            label: day.label,
            present: 0,
            absent: 0,
          })
        }

        const bucket = dayMap.get(day.date)
        if (!bucket) {
          return
        }

        schoolSummary.rows.forEach((row) => {
          const status = row.statusByDate[day.date]
          const gender = resolveGender(row, fallbackGenderMap)
          if (status === "present") {
            bucket.present += 1
            schoolPresent += 1
            if (gender === "male") {
              schoolMalePresent += 1
            } else if (gender === "female") {
              schoolFemalePresent += 1
            }
          } else if (status === "absent") {
            bucket.absent += 1
            schoolAbsent += 1
            if (gender === "male") {
              schoolMaleAbsent += 1
            } else if (gender === "female") {
              schoolFemaleAbsent += 1
            }
          }
        })
      })

      const schoolTotal = schoolPresent + schoolAbsent
      schoolPerformance.push({
        schoolId: schoolSummary.school.id,
        schoolName: schoolSummary.school.name,
        rate: schoolTotal > 0 ? Number(((schoolPresent / schoolTotal) * 100).toFixed(2)) : 0,
        present: schoolPresent,
        absent: schoolAbsent,
      })

      const maleTotal = schoolMalePresent + schoolMaleAbsent
      const femaleTotal = schoolFemalePresent + schoolFemaleAbsent
      schoolSummaries.push({
        schoolId: schoolSummary.school.id,
        schoolName: schoolSummary.school.name,
        totalStudents: schoolSummary.rows.length,
        attendancePercentage: schoolTotal > 0 ? Number(((schoolPresent / schoolTotal) * 100).toFixed(2)) : 0,
        maleAttendancePercentage: maleTotal > 0 ? Number(((schoolMalePresent / maleTotal) * 100).toFixed(2)) : 0,
        femaleAttendancePercentage: femaleTotal > 0 ? Number(((schoolFemalePresent / femaleTotal) * 100).toFixed(2)) : 0,
      })
    })

    const dailyBreakdown = Array.from(dayMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((day) => {
        const total = day.present + day.absent
        return {
          ...day,
          total,
          rate: total > 0 ? Number(((day.present / total) * 100).toFixed(2)) : 0,
        }
      })

    const presentMarks = dailyBreakdown.reduce((sum, day) => sum + day.present, 0)
    const absentMarks = dailyBreakdown.reduce((sum, day) => sum + day.absent, 0)
    const totalMarks = presentMarks + absentMarks
    const overallRate = totalMarks > 0 ? Number(((presentMarks / totalMarks) * 100).toFixed(2)) : 0
    const genderTotal = totalMaleStudents + totalFemaleStudents
    const latestDay = dailyBreakdown[dailyBreakdown.length - 1] ?? null
    const recentTrend = dailyBreakdown.slice(-10)
    const sortedSchoolPerformance = schoolPerformance
      .filter((item) => item.present + item.absent > 0)
      .sort((left, right) => right.rate - left.rate)

    return {
      presentMarks,
      absentMarks,
      totalMarks,
      overallRate,
      latestDay,
      recentTrend,
      schoolDays: dailyBreakdown.length,
      totalStudents,
      totalMaleStudents,
      totalFemaleStudents,
      malePercentage: genderTotal > 0 ? Number(((totalMaleStudents / genderTotal) * 100).toFixed(2)) : 0,
      femalePercentage: genderTotal > 0 ? Number(((totalFemaleStudents / genderTotal) * 100).toFixed(2)) : 0,
      schoolsWithData: allSchoolSummaries.length,
      schoolSummaries,
      bestSchools: sortedSchoolPerformance.slice(0, 5),
      worstSchools: [...sortedSchoolPerformance].reverse().slice(0, 5),
    }
  }, [allSchoolSummaries, allSchoolGenderMaps])
  const dashboardMetrics = useMemo(() => {
    if (!summary) {
      return null
    }

    const classStats = new Map<string, { classId: string; className: string; present: number; absent: number }>()
    const totalMaleStudents = summary.rows.filter((row) => resolveGender(row, selectedSchoolGenderMap) === "male").length
    const totalFemaleStudents = summary.rows.filter((row) => resolveGender(row, selectedSchoolGenderMap) === "female").length

    const dailyBreakdown = visibleDays.map((day) => {
      let present = 0
      let absent = 0

      summary.rows.forEach((row) => {
        const status = row.statusByDate[day.date]
        if (status === "present") {
          present += 1
        } else if (status === "absent") {
          absent += 1
        }

        if (!row.classId) {
          return
        }

        if (!classStats.has(row.classId)) {
          classStats.set(row.classId, {
            classId: row.classId,
            className: row.classCode ?? row.className ?? row.classId,
            present: 0,
            absent: 0,
          })
        }

        const bucket = classStats.get(row.classId)
        if (!bucket) {
          return
        }

        if (status === "present") {
          bucket.present += 1
        } else if (status === "absent") {
          bucket.absent += 1
        }
      })

      const total = present + absent
      const rate = total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0

      return {
        ...day,
        present,
        absent,
        total,
        rate,
      }
    })

    const presentMarks = dailyBreakdown.reduce((sum, day) => sum + day.present, 0)
    const absentMarks = dailyBreakdown.reduce((sum, day) => sum + day.absent, 0)
    const totalMarks = presentMarks + absentMarks
    const overallRate = totalMarks > 0 ? Number(((presentMarks / totalMarks) * 100).toFixed(2)) : 0
    const genderTotal = totalMaleStudents + totalFemaleStudents
    const latestDay = dailyBreakdown[dailyBreakdown.length - 1] ?? null
    const recentTrend = dailyBreakdown.slice(-10)
    const classPerformance = Array.from(classStats.values())
      .map((item) => {
        const total = item.present + item.absent
        return {
          ...item,
          rate: total > 0 ? Number(((item.present / total) * 100).toFixed(2)) : 0,
          total,
        }
      })
      .filter((item) => item.total > 0)
      .sort((left, right) => right.rate - left.rate)

    return {
      presentMarks,
      absentMarks,
      totalMarks,
      overallRate,
      latestDay,
      recentTrend,
      schoolDays: dailyBreakdown.length,
      totalMaleStudents,
      totalFemaleStudents,
      malePercentage: genderTotal > 0 ? Number(((totalMaleStudents / genderTotal) * 100).toFixed(2)) : 0,
      femalePercentage: genderTotal > 0 ? Number(((totalFemaleStudents / genderTotal) * 100).toFixed(2)) : 0,
      bestClasses: classPerformance.slice(0, 5),
      worstClasses: [...classPerformance].reverse().slice(0, 5),
    }
  }, [summary, visibleDays, selectedSchoolGenderMap])
  const activeDashboardMetrics = selectedSchool ? dashboardMetrics : allSchoolsDashboardMetrics
  const studentsCardValue = selectedSchool
    ? activeCount
    : (allSchoolsDashboardMetrics?.totalStudents ?? 0)
  const bestSchools = !selectedSchool && activeDashboardMetrics && "bestSchools" in activeDashboardMetrics
    ? activeDashboardMetrics.bestSchools
    : []
  const worstSchools = !selectedSchool && activeDashboardMetrics && "worstSchools" in activeDashboardMetrics
    ? activeDashboardMetrics.worstSchools
    : []
  const schoolSummaries = !selectedSchool && activeDashboardMetrics && "schoolSummaries" in activeDashboardMetrics
    ? activeDashboardMetrics.schoolSummaries
    : []
  const bestClasses = selectedSchool && activeDashboardMetrics && "bestClasses" in activeDashboardMetrics
    ? activeDashboardMetrics.bestClasses
    : []
  const worstClasses = selectedSchool && activeDashboardMetrics && "worstClasses" in activeDashboardMetrics
    ? activeDashboardMetrics.worstClasses
    : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Attendance Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            All schools metrics by default. Select a school and class to drill down into the register.
          </p>
        </div>
        <div className="grid w-full gap-3 md:max-w-2xl md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="attendance-school" className="text-sm font-medium">
              School
            </label>
            <select
              id="attendance-school"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedSchool}
              onChange={(event) => {
                setSelectedSchool(event.target.value)
                setSelectedClassId("")
              }}
            >
              <option value="">All schools (dashboard)</option>
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
          <div className="space-y-1">
            <label htmlFor="attendance-class" className="text-sm font-medium">
              Class
            </label>
            <select
              id="attendance-class"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              disabled={!selectedSchool || classesLoading || schoolClasses.length === 0}
            >
              <option value="">All classes overview</option>
              {schoolClasses.map((classItem) => {
                const classId = classItem._id ?? classItem.id
                if (!classId) {
                  return null
                }

                return (
                  <option key={classId} value={classId}>
                    {classItem.code} • {classItem.name}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      <div className="border-b">
        <button className="border-b-2 border-primary px-1 py-2 text-sm font-medium text-foreground">
          {selectedClass ? `${selectedClass.code} Register` : selectedSchool ? "School Overview" : "All Schools Overview"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{studentsCardValue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Term</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">{selectedSchool ? (summary?.term.name ?? "-") : "Active terms"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold capitalize">
              {selectedSchool ? (summary?.term.resolvedScope ?? "-") : "all schools"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{selectedClass ? `${selectedClass.code} Attendance Register` : "Attendance Overview"}</CardTitle>
          {selectedSchool && summary ? (
            <p className="text-sm text-muted-foreground">
              {summary.term.name} • {new Date(summary.term.startDate).toLocaleDateString()} -{" "}
              {new Date(summary.term.endDate).toLocaleDateString()} ({summary.school.name})
              {selectedClass ? ` • ${selectedClass.name}` : ""}
            </p>
          ) : null}
          {!selectedSchool && allSchoolsDashboardMetrics ? (
            <p className="text-sm text-muted-foreground">
              Aggregated from {allSchoolsDashboardMetrics.schoolsWithData} schools with active attendance data.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && !loadError && selectedSchool && classesLoading ? (
            <p className="text-sm text-muted-foreground">Loading classes...</p>
          ) : null}
          {!loading && !loadError && selectedSchool && summary?.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records found for the active term.</p>
          ) : null}
          {!loading && !loadError && !selectedSchool && !activeDashboardMetrics ? (
            <p className="text-sm text-muted-foreground">No attendance records found across schools.</p>
          ) : null}
          {!loading && !loadError && activeDashboardMetrics && !selectedClass ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card className="border-0 bg-emerald-50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-900">Overall Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-emerald-950">{activeDashboardMetrics.overallRate}%</p>
                    <p className="text-sm text-emerald-800">Across {activeDashboardMetrics.schoolDays} school days</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-slate-50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-900">Present Marks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-950">{activeDashboardMetrics.presentMarks}</p>
                    <p className="text-sm text-slate-700">Successful attendance entries</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-rose-50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-rose-900">Absent Marks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-rose-950">{activeDashboardMetrics.absentMarks}</p>
                    <p className="text-sm text-rose-800">Absence records in term</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-amber-50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-amber-900">Latest Day Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-amber-950">
                      {activeDashboardMetrics.latestDay?.rate ?? 0}%
                    </p>
                    <p className="text-sm text-amber-800">
                      {activeDashboardMetrics.latestDay
                        ? `${activeDashboardMetrics.latestDay.present} present, ${activeDashboardMetrics.latestDay.absent} absent`
                        : "No recent day available"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-sky-50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-sky-900">Boys vs Girls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-sky-950">
                      {activeDashboardMetrics.malePercentage}% : {activeDashboardMetrics.femalePercentage}%
                    </p>
                    <p className="text-sm text-sky-800">
                      Boys {activeDashboardMetrics.totalMaleStudents} • Girls {activeDashboardMetrics.totalFemaleStudents}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {selectedSchool ? "Recent Attendance Trend" : "School Attendance Summaries"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedSchool ? (
                      <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">School</th>
                              <th className="px-3 py-2 text-right font-medium">Total Students</th>
                              <th className="px-3 py-2 text-right font-medium">Attendance %</th>
                              <th className="px-3 py-2 text-right font-medium">Boys %</th>
                              <th className="px-3 py-2 text-right font-medium">Girls %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schoolSummaries.map((item) => (
                              <tr key={item.schoolId} className="border-t">
                                <td className="px-3 py-2 font-medium">{item.schoolName}</td>
                                <td className="px-3 py-2 text-right">{item.totalStudents}</td>
                                <td className="px-3 py-2 text-right">{item.attendancePercentage}%</td>
                                <td className="px-3 py-2 text-right">{item.maleAttendancePercentage}%</td>
                                <td className="px-3 py-2 text-right">{item.femaleAttendancePercentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-10 items-end gap-2">
                        {activeDashboardMetrics.recentTrend.map((day) => (
                          <div key={day.date} className="space-y-2 text-center">
                            <div className="flex h-40 items-end justify-center rounded-md bg-muted/30 px-1 py-2">
                              <div
                                className="w-full rounded-t bg-emerald-500"
                                style={{ height: `${clampPercentage(day.rate)}%` }}
                                title={`${day.rate}% attendance`}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">{day.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Attendance Split</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div
                      className="flex size-40 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#16a34a 0deg ${clampPercentage(
                          activeDashboardMetrics.overallRate
                        ) * 3.6}deg, #ef4444 ${clampPercentage(activeDashboardMetrics.overallRate) * 3.6}deg 360deg)`,
                      }}
                    >
                      <div className="flex size-24 items-center justify-center rounded-full bg-background text-center">
                        <div>
                          <div className="text-2xl font-semibold">{activeDashboardMetrics.overallRate}%</div>
                          <div className="text-xs text-muted-foreground">present</div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full space-y-3 text-sm">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-emerald-700">Present</span>
                          <span>{activeDashboardMetrics.presentMarks}</span>
                        </div>
                        <div className="h-2 rounded-full bg-emerald-100">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{
                              width: `${clampPercentage(
                                activeDashboardMetrics.totalMarks > 0
                                  ? (activeDashboardMetrics.presentMarks / activeDashboardMetrics.totalMarks) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-rose-700">Absent</span>
                          <span>{activeDashboardMetrics.absentMarks}</span>
                        </div>
                        <div className="h-2 rounded-full bg-rose-100">
                          <div
                            className="h-2 rounded-full bg-rose-500"
                            style={{
                              width: `${clampPercentage(
                                activeDashboardMetrics.totalMarks > 0
                                  ? (activeDashboardMetrics.absentMarks / activeDashboardMetrics.totalMarks) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!selectedSchool ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Best Schools by Attendance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {bestSchools.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No school ranking data.</p>
                      ) : (
                        bestSchools.map((item, index) => (
                          <div key={item.schoolId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium">{index + 1}. {item.schoolName}</p>
                              <p className="text-muted-foreground">{item.present} present • {item.absent} absent</p>
                            </div>
                            <span className="font-semibold text-emerald-700">{item.rate}%</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Worst Schools by Attendance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {worstSchools.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No school ranking data.</p>
                      ) : (
                        worstSchools.map((item, index) => (
                          <div key={item.schoolId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium">{index + 1}. {item.schoolName}</p>
                              <p className="text-muted-foreground">{item.present} present • {item.absent} absent</p>
                            </div>
                            <span className="font-semibold text-rose-700">{item.rate}%</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {selectedSchool ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Best Classes by Attendance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {bestClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No class ranking data.</p>
                      ) : (
                        bestClasses.map((item, index) => (
                          <div key={item.classId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium">{index + 1}. {item.className}</p>
                              <p className="text-muted-foreground">{item.present} present • {item.absent} absent</p>
                            </div>
                            <span className="font-semibold text-emerald-700">{item.rate}%</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Worst Classes by Attendance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {worstClasses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No class ranking data.</p>
                      ) : (
                        worstClasses.map((item, index) => (
                          <div key={item.classId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium">{index + 1}. {item.className}</p>
                              <p className="text-muted-foreground">{item.present} present • {item.absent} absent</p>
                            </div>
                            <span className="font-semibold text-rose-700">{item.rate}%</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          ) : null}
          {!loading && !loadError && summary && summary.rows.length > 0 && selectedClass ? (
            <div className="overflow-x-auto rounded-md border bg-background">
              <table className="min-w-max border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="sticky left-0 z-30 isolate min-w-56 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-2 font-medium">Student</th>
                    <th className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-right font-medium">%</th>
                    {visibleDays.map((day) => (
                      <th key={day.date} className="border-b border-r border-border px-2 py-2 text-center font-medium">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={row.studentId}>
                      <td className="sticky left-0 z-20 min-w-56 border-b border-r border-border bg-background px-3 py-2">
                        <div className="font-medium">{row.studentName}</div>
                        <div className="text-xs text-muted-foreground">{row.regNumber}</div>
                      </td>
                      <td className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-right font-medium">{row.attendancePercentage}%</td>
                      {visibleDays.map((day) => {
                        const rawStatus = row.statusByDate[day.date] ?? "-"
                        const view = statusView[rawStatus] ?? statusView["-"]

                        return (
                          <td key={`${row.studentId}-${day.date}`} className="border-b border-r border-border px-2 py-2 text-center">
                            <span className={view.className}>{view.label}</span>
                          </td>
                        )
                      })}
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
