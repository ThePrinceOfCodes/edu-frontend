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

function getDayOfWeekName(dateKey: string) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const date = new Date(`${dateKey}T00:00:00Z`)
  return days[date.getUTCDay()]
}

function getMonthName(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function getHeatmapTone(rate: number) {
  if (rate >= 90) {
    return {
      barClass: "bg-emerald-600",
      textClass: "text-emerald-700",
      panelClass: "from-emerald-100/80 to-transparent",
    }
  }

  if (rate >= 80) {
    return {
      barClass: "bg-lime-500",
      textClass: "text-lime-700",
      panelClass: "from-lime-100/80 to-transparent",
    }
  }

  if (rate >= 70) {
    return {
      barClass: "bg-amber-500",
      textClass: "text-amber-700",
      panelClass: "from-amber-100/80 to-transparent",
    }
  }

  if (rate >= 60) {
    return {
      barClass: "bg-orange-500",
      textClass: "text-orange-700",
      panelClass: "from-orange-100/80 to-transparent",
    }
  }

  return {
    barClass: "bg-rose-600",
    textClass: "text-rose-700",
    panelClass: "from-rose-100/80 to-transparent",
  }
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
  const [trendView, setTrendView] = useState<"weekly" | "monthly">("weekly")

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
          resourceService.getClasses({ limit: 500, page: 1, schoolId: selectedSchool }),
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

    // Build weekly trend (all days)
    const weeklyTrend = dailyBreakdown.map((day) => ({
      date: day.date,
      label: day.label,
      rate: day.rate,
      present: day.present,
      absent: day.absent,
    }))

    // Build monthly trend data
    const monthlyMap = new Map<string, { month: string; present: number; absent: number }>()
    dailyBreakdown.forEach((day) => {
      const month = getMonthName(day.date)
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { month, present: 0, absent: 0 })
      }
      const bucket = monthlyMap.get(month)!
      bucket.present += day.present
      bucket.absent += day.absent
    })
    const monthlyTrend = Array.from(monthlyMap.values()).map((item) => {
      const total = item.present + item.absent
      return {
        ...item,
        rate: total > 0 ? Number(((item.present / total) * 100).toFixed(2)) : 0,
        total,
      }
    })

    // Build day-of-week heatmap data
    const dayOfWeekStats = new Map<number, { dayName: string; dayOfWeek: number; present: number; absent: number }>()
    dailyBreakdown.forEach((day) => {
      const date = new Date(`${day.date}T00:00:00Z`)
      const dayOfWeek = date.getUTCDay()
      const dayName = getDayOfWeekName(day.date)
      
      if (!dayOfWeekStats.has(dayOfWeek)) {
        dayOfWeekStats.set(dayOfWeek, { dayName, dayOfWeek, present: 0, absent: 0 })
      }
      const bucket = dayOfWeekStats.get(dayOfWeek)!
      bucket.present += day.present
      bucket.absent += day.absent
    })
    const heatmapData = Array.from(dayOfWeekStats.values())
      .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
      .map((item) => {
        const total = item.present + item.absent
        return {
          ...item,
          rate: total > 0 ? Number(((item.present / total) * 100).toFixed(2)) : 0,
          total,
        }
      })

    return {
      presentMarks,
      absentMarks,
      totalMarks,
      overallRate,
      latestDay,
      recentTrend,
      weeklyTrend,
      monthlyTrend,
      heatmapData,
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
    <div className="space-y-6 pb-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-900 via-cyan-950 to-teal-900 text-white shadow-lg">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1.2fr_1fr] md:p-6">
          <div className="space-y-3">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white/90">
              Attendance Intelligence
            </p>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Attendance Dashboard</h2>
              <p className="mt-1 text-sm text-white/80">
                Review school-wide trends, compare performance, and drill into class-level attendance in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                {selectedClass ? `${selectedClass.code} Register` : selectedSchool ? "School Overview" : "All Schools Overview"}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                Students: {studentsCardValue}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 capitalize">
                Scope: {selectedSchool ? (summary?.term.resolvedScope ?? "-") : "all schools"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <div className="space-y-1">
              <label htmlFor="attendance-school" className="text-xs font-semibold uppercase tracking-wide text-white/85">
                School
              </label>
              <select
                id="attendance-school"
                className="w-full rounded-md border border-white/25 bg-black/15 px-3 py-2 text-sm text-white outline-none transition focus:border-white/50"
                value={selectedSchool}
                onChange={(event) => {
                  setSelectedSchool(event.target.value)
                  setSelectedClassId("")
                }}
              >
                <option value="" className="text-foreground">All schools (dashboard)</option>
                {schools.map((school) => {
                  const schoolId = school._id ?? school.id
                  if (!schoolId) {
                    return null
                  }

                  return (
                    <option key={schoolId} value={schoolId} className="text-foreground">
                      {school.name}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="attendance-class" className="text-xs font-semibold uppercase tracking-wide text-white/85">
                Class
              </label>
              <select
                id="attendance-class"
                className="w-full rounded-md border border-white/25 bg-black/15 px-3 py-2 text-sm text-white outline-none transition focus:border-white/50"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                disabled={!selectedSchool || classesLoading || schoolClasses.length === 0}
              >
                <option value="" className="text-foreground">All classes overview</option>
                {schoolClasses.map((classItem) => {
                  const classId = classItem._id ?? classItem.id
                  if (!classId) {
                    return null
                  }

                  return (
                    <option key={classId} value={classId} className="text-foreground">
                      {classItem.code} • {classItem.name}
                    </option>
                  )
                })}
              </select>
            </div>

            <p className="text-xs text-white/75">
              Term: {selectedSchool ? (summary?.term.name ?? "-") : "Active terms"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-white to-slate-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{studentsCardValue}</p>
            <p className="text-xs text-muted-foreground">Covered in the current dashboard scope</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-white to-cyan-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Term</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tracking-tight">{selectedSchool ? (summary?.term.name ?? "-") : "Active terms"}</p>
            <p className="text-xs text-muted-foreground">Source term used for analytics</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-white to-emerald-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize tracking-tight">
              {selectedSchool ? (summary?.term.resolvedScope ?? "-") : "all schools"}
            </p>
            <p className="text-xs text-muted-foreground">Current visibility context</p>
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
                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/60 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-900">Overall Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-emerald-950">{activeDashboardMetrics.overallRate}%</p>
                    <p className="text-sm text-emerald-800">Across {activeDashboardMetrics.schoolDays} school days</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100/70 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-900">Present Marks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-950">{activeDashboardMetrics.presentMarks}</p>
                    <p className="text-sm text-slate-700">Successful attendance entries</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-rose-50 to-rose-100/60 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-rose-900">Absent Marks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-rose-950">{activeDashboardMetrics.absentMarks}</p>
                    <p className="text-sm text-rose-800">Absence records in term</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-none">
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
                <Card className="border-0 bg-gradient-to-br from-sky-50 to-cyan-100/60 shadow-none">
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
                  <CardHeader className="pb-3">
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
                            <div className="flex h-40 items-end justify-center rounded-md bg-slate-100/80 px-1 py-2">
                              <div
                                className="w-full rounded-t bg-gradient-to-b from-cyan-400 to-cyan-600"
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Attendance Split</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <div
                      className="flex size-40 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#0284c7 0deg ${clampPercentage(
                          activeDashboardMetrics.overallRate
                        ) * 3.6}deg, #f43f5e ${clampPercentage(activeDashboardMetrics.overallRate) * 3.6}deg 360deg)`,
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

              {selectedSchool && activeDashboardMetrics && "weeklyTrend" in activeDashboardMetrics ? (
                <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
                  <Card className="shadow-none">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">Attendance Trend</CardTitle>
                        <div className="inline-flex rounded-md border bg-muted/20 p-1 text-xs">
                          <button
                            type="button"
                            className={`rounded px-2 py-1 transition ${
                              trendView === "weekly"
                                ? "bg-cyan-600 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                            onClick={() => setTrendView("weekly")}
                          >
                            Weekly
                          </button>
                          <button
                            type="button"
                            className={`rounded px-2 py-1 transition ${
                              trendView === "monthly"
                                ? "bg-cyan-600 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                            onClick={() => setTrendView("monthly")}
                          >
                            Monthly
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {trendView === "weekly"
                          ? "Attendance by school day in the selected term"
                          : "Term-level trend by calendar month"}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {trendView === "weekly" ? (
                        activeDashboardMetrics.weeklyTrend.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No weekly trend data available.</p>
                        ) : (
                          (() => {
                            const chartData = activeDashboardMetrics.weeklyTrend
                            const chartWidth = Math.max(640, chartData.length * 56)
                            const chartHeight = 220
                            const padding = { top: 18, right: 18, bottom: 32, left: 38 }
                            const innerWidth = chartWidth - padding.left - padding.right
                            const innerHeight = chartHeight - padding.top - padding.bottom
                            const denominator = Math.max(chartData.length - 1, 1)

                            const points = chartData.map((day, index) => {
                              const x = padding.left + (index / denominator) * innerWidth
                              const y = padding.top + ((100 - clampPercentage(day.rate)) / 100) * innerHeight
                              return { x, y, day }
                            })

                            const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
                            const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding.left} ${padding.top + innerHeight} L ${points[0]?.x ?? padding.left} ${padding.top + innerHeight} Z`
                            const yTicks = [0, 25, 50, 75, 100]

                            return (
                              <div className="space-y-3 overflow-x-auto pb-2">
                                <svg
                                  width={chartWidth}
                                  height={chartHeight}
                                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                  className="rounded-md border bg-slate-50"
                                  role="img"
                                  aria-label="Weekly attendance line chart"
                                >
                                  {yTicks.map((tick) => {
                                    const y = padding.top + ((100 - tick) / 100) * innerHeight
                                    return (
                                      <g key={tick}>
                                        <line
                                          x1={padding.left}
                                          y1={y}
                                          x2={padding.left + innerWidth}
                                          y2={y}
                                          stroke="currentColor"
                                          className="text-slate-200"
                                          strokeWidth="1"
                                        />
                                        <text
                                          x={padding.left - 8}
                                          y={y + 4}
                                          textAnchor="end"
                                          className="fill-slate-500 text-[10px]"
                                        >
                                          {tick}%
                                        </text>
                                      </g>
                                    )
                                  })}

                                  <path d={areaPath} fill="url(#weeklyTrendAreaGradient)" opacity="0.35" />
                                  <path
                                    d={linePath}
                                    fill="none"
                                    stroke="url(#weeklyTrendLineGradient)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />

                                  {points.map((point) => (
                                    <g key={point.day.date}>
                                      <circle cx={point.x} cy={point.y} r="4" className="fill-cyan-600" />
                                      <circle cx={point.x} cy={point.y} r="7" className="fill-cyan-500/20" />
                                      <title>{`${point.day.date}: ${point.day.rate}%`}</title>
                                    </g>
                                  ))}

                                  <defs>
                                    <linearGradient id="weeklyTrendLineGradient" x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#06b6d4" />
                                      <stop offset="100%" stopColor="#2563eb" />
                                    </linearGradient>
                                    <linearGradient id="weeklyTrendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#22d3ee" />
                                      <stop offset="100%" stopColor="#ffffff" />
                                    </linearGradient>
                                  </defs>
                                </svg>

                                <div className="flex min-w-max justify-between gap-4 px-1 text-[10px] text-muted-foreground">
                                  {chartData.map((day) => (
                                    <span key={day.date} className="w-8 text-center">
                                      {day.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })()
                        )
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {activeDashboardMetrics.monthlyTrend.map((month) => (
                            <div key={month.month} className="space-y-1 rounded-md border bg-slate-50/60 p-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{month.month}</span>
                                <span className="font-semibold text-cyan-700">{month.rate}%</span>
                              </div>
                              <div className="flex h-6 items-center rounded-full bg-muted/40">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-all"
                                  style={{ width: `${clampPercentage(month.rate)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">{month.present} present • {month.absent} absent</p>
                            </div>
                          ))}
                          {activeDashboardMetrics.monthlyTrend.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No monthly trend data available.</p>
                          ) : null}
                        </div>
                      )}
                      <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground">
                          {trendView === "weekly" ? (
                            <>
                              Showing {activeDashboardMetrics.weeklyTrend.length} days • Average:{" "}
                              {(
                                activeDashboardMetrics.weeklyTrend.reduce((sum, d) => sum + d.rate, 0) /
                                Math.max(activeDashboardMetrics.weeklyTrend.length, 1)
                              ).toFixed(1)}%
                            </>
                          ) : (
                            <>
                              Showing {activeDashboardMetrics.monthlyTrend.length} months • Average:{" "}
                              {(
                                activeDashboardMetrics.monthlyTrend.reduce((sum, d) => sum + d.rate, 0) /
                                Math.max(activeDashboardMetrics.monthlyTrend.length, 1)
                              ).toFixed(1)}%
                            </>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader>
                      <CardTitle className="text-base">Day of Week Analysis</CardTitle>
                      <p className="text-sm text-muted-foreground">Heatmap for day-level absence pressure</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {activeDashboardMetrics.heatmapData.map((day) => {
                        const isMonday = day.dayOfWeek === 1
                        const tone = getHeatmapTone(day.rate)

                        return (
                          <div
                            key={day.dayOfWeek}
                            className={`rounded-md bg-gradient-to-r p-3 ${tone.panelClass} ${isMonday ? "ring-2 ring-cyan-400/70" : ""}`}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="font-medium">
                                {day.dayName}
                                {isMonday ? " (high-risk)" : ""}
                              </span>
                              <span className={`font-semibold ${tone.textClass}`}>{day.rate}%</span>
                            </div>
                            <div className="mb-2 h-2 rounded-full bg-background/70">
                              <div className={`h-2 rounded-full ${tone.barClass}`} style={{ width: `${clampPercentage(day.rate)}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground">{day.present} present • {day.absent} absent</p>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>
              ) : null}

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
