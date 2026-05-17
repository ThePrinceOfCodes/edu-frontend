"use client"

import { useEffect, useState } from "react"
import { ShieldOff, Users, UserCheck } from "lucide-react"

import type { Class, Student } from "@/interfaces/resource-interface"
import type { AuthUser } from "@/interfaces/auth-interface"
import { resourceService } from "@/services/resource-service"
import { authService } from "@/services/auth-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ClassStats {
  total: number
  boys: number
  girls: number
  attendanceAvg: number | null
}

const SCHOOL_SCOPE_ROLES = new Set(["school-admin", "teacher", "staff"])

export default function ClassesPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [classes, setClasses] = useState<Class[]>([])
  const [statsByClassId, setStatsByClassId] = useState<Record<string, ClassStats>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isInternalAdmin = authUser?.accountType === "internal"
  const isSchoolScope = SCHOOL_SCOPE_ROLES.has(authUser?.role ?? "")

  useEffect(() => {
    setAuthUser(authService.getStoredUser())
    setHasHydrated(true)
  }, [])

  async function loadData() {
    setLoadError(null)
    setLoading(true)

    try {
      const classesResult = await resourceService.getClasses({ limit: 100 })
      setClasses(classesResult.results)

      // Fetch students per class in parallel — backend auto-scopes to the user's school/board
      const perClassData = await Promise.all(
        classesResult.results.map(async (cls: Class) => {
          const classId = cls._id ?? cls.id ?? ""
          try {
            const res = await resourceService.getStudents({ classId, limit: 1000 })
            return { classId, total: res.totalResults, students: res.results }
          } catch {
            return { classId, total: 0, students: [] as Student[] }
          }
        })
      )

      // Build stats map and studentId→classId lookup (needed for attendance join)
      const statsMap: Record<string, ClassStats> = {}
      const studentClassMap: Record<string, string> = {}

      for (const { classId, total, students } of perClassData) {
        if (!classId) continue
        const boys = students.filter((s: Student) => s.gender === "male").length
        const girls = students.filter((s: Student) => s.gender === "female").length
        statsMap[classId] = { total, boys, girls, attendanceAvg: null }
        for (const s of students) {
          const sid = s._id ?? s.id ?? ""
          if (sid) studentClassMap[sid] = classId
        }
      }

      // For school-scoped roles: fetch attendance summary and compute per-class average
      if (isSchoolScope) {
        try {
          const attendance = await resourceService.getAttendanceSummary()
          const classPcts: Record<string, number[]> = {}

          for (const row of attendance.rows) {
            const cid = studentClassMap[row.studentId]
            if (!cid || !statsMap[cid]) continue
            ;(classPcts[cid] ??= []).push(row.attendancePercentage)
          }

          for (const [cid, pcts] of Object.entries(classPcts)) {
            if (!statsMap[cid] || !pcts.length) continue
            statsMap[cid].attendanceAvg = Math.round(
              pcts.reduce((a, b) => a + b, 0) / pcts.length
            )
          }
        } catch {
          // No active term or attendance unavailable — keep attendanceAvg as null
        }
      }

      setStatsByClassId(statsMap)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load classes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    if (!isInternalAdmin) {
      void loadData()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isInternalAdmin])

  if (!hasHydrated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Classes</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isInternalAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
        <ShieldOff className="h-10 w-10" />
        <p className="text-base font-medium">Classes are not available at the global admin level.</p>
        <p className="text-sm">Select a school board or a school to view class details.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Classes</h2>
        {!isSchoolScope && !loading && (
          <p className="text-xs text-muted-foreground">Showing data across all schools in your board</p>
        )}
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {classes.map((cls) => {
            const id = cls._id ?? cls.id ?? ""
            const stats = statsByClassId[id] ?? { total: 0, boys: 0, girls: 0, attendanceAvg: null }

            return (
              <Card key={id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{cls.name}</CardTitle>
                  <p className="font-mono text-xs text-muted-foreground">{cls.code}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Total Students
                    </span>
                    <span className="font-semibold">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Boys</span>
                    <span>{stats.boys}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Girls</span>
                    <span>{stats.girls}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5" />
                      Attendance Avg
                    </span>
                    <span
                      className={
                        stats.attendanceAvg !== null
                          ? stats.attendanceAvg >= 75
                            ? "font-semibold text-green-600"
                            : "font-semibold text-amber-600"
                          : "text-muted-foreground"
                      }
                    >
                      {stats.attendanceAvg !== null ? `${stats.attendanceAvg}%` : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
