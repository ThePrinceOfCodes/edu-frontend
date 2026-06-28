"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { AcademicSession, Class, School, Staff, Student } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoadState = {
  schools: School[]
  classes: Class[]
  students: Student[]
  teachers: Staff[]
  sessions: AcademicSession[]
}

type PeriodMode = "session" | "dateRange"
type ClassScope = "all" | "selected"

function asIdentifier(value?: string | { id?: string; _id?: string } | null) {
  if (!value) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  return value.id ?? value._id ?? ""
}

function asClassId(value: Class) {
  return value.id ?? value._id ?? value.code
}

function asSessionId(value: AcademicSession) {
  return value.id ?? value._id ?? ""
}

function formatAcademicSession(session: AcademicSession) {
  if (session.name && session.name.trim()) {
    return session.name
  }

  return `${session.startYear}/${session.endYear}`
}

function parseDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function toDateTimeBounds(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return null
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)

  if (!start || !end) {
    return null
  }

  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function isWithinRange(value: string | undefined, range: { start: Date; end: Date } | null) {
  if (!range) {
    return true
  }

  if (!value) {
    return true
  }

  const parsed = parseDate(value)
  if (!parsed) {
    return true
  }

  return parsed >= range.start && parsed <= range.end
}

export default function AscReportsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [data, setData] = useState<LoadState>({
    schools: [],
    classes: [],
    students: [],
    teachers: [],
    sessions: [],
  })
  const [periodMode, setPeriodMode] = useState<PeriodMode>("session")
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [classScope, setClassScope] = useState<ClassScope>("all")
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined

        const [schoolsResult, classesResult, studentsResult, staffResult, sessionsResult] = await Promise.all([
          resourceService.getSchools({ limit: 1000, page: 1, schoolBoard: schoolBoardId }),
          resourceService.getClasses({ limit: 1000, page: 1 }),
          resourceService.getStudents({ limit: 5000, page: 1 }),
          resourceService.getStaff({ limit: 3000, page: 1, schoolBoard: schoolBoardId, employmentType: "teacher" }),
          resourceService.getAcademicSessions({ limit: 200, page: 1, schoolBoard: schoolBoardId }),
        ])

        setData({
          schools: schoolsResult.results,
          classes: classesResult.results,
          students: studentsResult.results,
          teachers: staffResult.results,
          sessions: sessionsResult.results,
        })
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load ASC report data")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const summary = useMemo(() => {
    return {
      schools: data.schools.length,
      classes: data.classes.length,
      students: data.students.length,
      teachers: data.teachers.length,
    }
  }, [data])

  const dateRange = useMemo(() => toDateTimeBounds(startDate, endDate), [startDate, endDate])

  const filteredClassIds = useMemo(() => {
    if (classScope === "all") {
      return new Set(data.classes.map((item) => asClassId(item)))
    }

    return new Set(selectedClassIds)
  }, [classScope, data.classes, selectedClassIds])

  const filteredClasses = useMemo(() => {
    return data.classes.filter((item) => filteredClassIds.has(asClassId(item)))
  }, [data.classes, filteredClassIds])

  const filteredStudents = useMemo(() => {
    return data.students.filter((student) => {
      const studentClassId = student.currentEnrollment?.classId ?? student.classId ?? ""

      if (!filteredClassIds.has(studentClassId)) {
        return false
      }

      if (periodMode === "session" && selectedSessionId) {
        const sessionId = student.currentEnrollment?.academicSessionId ?? student.currentEnrollment?.academicSession ?? ""
        if (sessionId !== selectedSessionId) {
          return false
        }
      }

      if (periodMode === "dateRange") {
        const datedStudent = student as Student & { createdAt?: string; updatedAt?: string }
        const candidateDate = datedStudent.createdAt ?? datedStudent.updatedAt
        if (!isWithinRange(candidateDate, dateRange)) {
          return false
        }
      }

      return true
    })
  }, [data.students, dateRange, filteredClassIds, periodMode, selectedSessionId])

  const filteredTeachers = useMemo(() => {
    return data.teachers.filter((teacher) => {
      if (classScope === "selected") {
        const teacherClassIds = (teacher.teachingClassIds ?? []).filter(Boolean)
        if (teacherClassIds.length > 0) {
          const teachesSelectedClass = teacherClassIds.some((classId) => filteredClassIds.has(classId))
          if (!teachesSelectedClass) {
            return false
          }
        }
      }

      if (periodMode === "dateRange") {
        const datedTeacher = teacher as Staff & { createdAt?: string; updatedAt?: string }
        const candidateDate = datedTeacher.createdAt ?? datedTeacher.updatedAt ?? teacher.longTermAbsenceStartDate ?? undefined
        if (!isWithinRange(candidateDate, dateRange)) {
          return false
        }
      }

      return true
    })
  }, [classScope, data.teachers, dateRange, filteredClassIds, periodMode])

  const filteredSchoolIds = useMemo(() => {
    const ids = new Set<string>()

    filteredStudents.forEach((student) => {
      const schoolId = student.currentEnrollment?.school ?? student.school ?? ""
      if (schoolId) {
        ids.add(schoolId)
      }
    })

    filteredTeachers.forEach((teacher) => {
      if (teacher.school) {
        ids.add(teacher.school)
      }
    })

    return ids
  }, [filteredStudents, filteredTeachers])

  const filteredSchools = useMemo(() => {
    if (filteredSchoolIds.size === 0) {
      return data.schools
    }

    return data.schools.filter((school) => filteredSchoolIds.has(school.id ?? school._id ?? ""))
  }, [data.schools, filteredSchoolIds])

  const filteredSummary = useMemo(() => {
    return {
      schools: filteredSchools.length,
      classes: filteredClasses.length,
      students: filteredStudents.length,
      teachers: filteredTeachers.length,
    }
  }, [filteredSchools.length, filteredClasses.length, filteredStudents.length, filteredTeachers.length])

  const canExport = useMemo(() => {
    if (periodMode === "session") {
      return Boolean(selectedSessionId)
    }

    if (!startDate || !endDate) {
      return false
    }

    return startDate <= endDate
  }, [periodMode, selectedSessionId, startDate, endDate])

  const selectedClassCount = classScope === "all" ? data.classes.length : selectedClassIds.length

  function handleClassSelectionChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value)
    setSelectedClassIds(values)
  }

  function handleExport() {
    if (!canExport) {
      return
    }

    const workbook = XLSX.utils.book_new()

    const selectedSession = data.sessions.find((session) => asSessionId(session) === selectedSessionId)

    const filterRows = [
      {
        periodMode: periodMode === "session" ? "Session" : "Date Range",
        session: selectedSession ? formatAcademicSession(selectedSession) : "",
        startDate: periodMode === "dateRange" ? startDate : "",
        endDate: periodMode === "dateRange" ? endDate : "",
        classScope: classScope === "all" ? "All Classes" : "Selected Classes",
        selectedClassesCount: selectedClassCount,
      },
    ]

    const schoolRows = filteredSchools.map((school) => ({
      schoolId: school.id ?? school._id ?? "",
      schoolName: school.name,
      schoolBoardId: asIdentifier(school.schoolBoard),
      lga: school.localGovernment ?? "",
      ward: school.ward ?? "",
      categoryOfSchool: school.categoryOfSchool ?? "",
      typeOfSchool: school.typeOfSchool ?? "",
      schoolLocation: school.schoolLocation ?? "",
      totalEnrolledStudents: school.totalEnrolledStudents ?? "",
      numberOfAcademicStaff: school.numberOfAcademicStaff ?? "",
      numberOfClassroomsAvailable: school.numberOfClassroomsAvailable ?? "",
      status: school.status ?? "",
    }))

    const classRows = filteredClasses.map((item) => ({
      classId: item.id ?? item._id ?? "",
      className: item.name,
      classCode: item.code,
      schoolTypeId: item.schoolTypeId,
      educationLevel: (item as { educationLevel?: string }).educationLevel ?? "",
      ascLevelCode: (item as { ascLevelCode?: string }).ascLevelCode ?? "",
      levelOrder: (item as { levelOrder?: number }).levelOrder ?? "",
      ageRangeMin: (item as { ageRangeMin?: number }).ageRangeMin ?? "",
      ageRangeMax: (item as { ageRangeMax?: number }).ageRangeMax ?? "",
    }))

    const studentRows = filteredStudents.map((student) => ({
      studentId: student.id ?? student._id ?? "",
      regNumber: student.regNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      schoolId: student.currentEnrollment?.school ?? student.school ?? "",
      classId: student.currentEnrollment?.classId ?? student.classId ?? "",
      hasSpecialNeeds: (student as { hasSpecialNeeds?: boolean }).hasSpecialNeeds ?? "",
      specialNeedsCategory: (student as { specialNeedsCategory?: string }).specialNeedsCategory ?? "",
      isRepeater: (student as { isRepeater?: boolean }).isRepeater ?? "",
      isNewEntrant: (student as { isNewEntrant?: boolean }).isNewEntrant ?? "",
      entrantAgeYears: (student as { entrantAgeYears?: number }).entrantAgeYears ?? "",
      educationTrack: (student as { educationTrack?: string }).educationTrack ?? "",
      status: student.status ?? "",
    }))

    const teacherRows = filteredTeachers.map((teacher) => ({
      staffId: teacher.id ?? teacher._id ?? "",
      userId: typeof teacher.user === "string" ? teacher.user : (teacher.user?.id ?? teacher.user?._id ?? ""),
      schoolId: teacher.school ?? "",
      employmentType: teacher.employmentType ?? "",
      gender: teacher.gender ?? "",
      academicQualification: teacher.academicQualification ?? "",
      salarySource: teacher.salarySource ?? "",
      isLongTermAbsent: (teacher as { isLongTermAbsent?: boolean }).isLongTermAbsent ?? "",
      longTermAbsenceReason: (teacher as { longTermAbsenceReason?: string }).longTermAbsenceReason ?? "",
      longTermAbsenceStartDate: (teacher as { longTermAbsenceStartDate?: string }).longTermAbsenceStartDate ?? "",
      teachingLevels: ((teacher as { teachingLevels?: string[] }).teachingLevels ?? []).join(", "),
      teachingClassIds: ((teacher as { teachingClassIds?: string[] }).teachingClassIds ?? []).join(", "),
      isActive: teacher.isActive ?? "",
    }))

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(filterRows), "Filters")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(schoolRows), "Schools")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(classRows), "Classes")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentRows), "Students")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(teacherRows), "Teachers")

    XLSX.writeFile(workbook, `asc-report-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">ASC School Reports</h2>
        <p className="text-sm text-muted-foreground">
          Generate ASC-aligned datasets for school board reporting.
        </p>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading ASC data...</p> : null}

      {!loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Schools</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.schools}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Classes</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.classes}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Students</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.students}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Teachers</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.teachers}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ASC Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Export Schools, Classes, Students, and Teachers sheets for ASC pivot reporting.
              </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="asc-period-mode">Period Type</Label>
                    <select
                      id="asc-period-mode"
                      value={periodMode}
                      onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      <option value="session">Academic Session</option>
                      <option value="dateRange">Date Range</option>
                    </select>
                  </div>

                  {periodMode === "session" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="asc-session">Session</Label>
                      <select
                        id="asc-session"
                        value={selectedSessionId}
                        onChange={(event) => setSelectedSessionId(event.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      >
                        <option value="">Select a session</option>
                        {data.sessions.map((session) => {
                          const sessionId = asSessionId(session)
                          if (!sessionId) {
                            return null
                          }

                          return (
                            <option key={sessionId} value={sessionId}>
                              {formatAcademicSession(session)}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  ) : null}

                  {periodMode === "dateRange" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="asc-start-date">Start Date</Label>
                        <Input
                          id="asc-start-date"
                          type="date"
                          value={startDate}
                          onChange={(event) => setStartDate(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="asc-end-date">End Date</Label>
                        <Input
                          id="asc-end-date"
                          type="date"
                          value={endDate}
                          onChange={(event) => setEndDate(event.target.value)}
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="asc-class-scope">Class Scope</Label>
                    <select
                      id="asc-class-scope"
                      value={classScope}
                      onChange={(event) => setClassScope(event.target.value as ClassScope)}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      <option value="all">All Classes</option>
                      <option value="selected">Selected Classes</option>
                    </select>
                  </div>

                  {classScope === "selected" ? (
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="asc-classes">Select Classes ({selectedClassIds.length} selected)</Label>
                      <select
                        id="asc-classes"
                        multiple
                        value={selectedClassIds}
                        onChange={handleClassSelectionChange}
                        className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm"
                      >
                        {data.classes.map((item) => {
                          const classId = asClassId(item)

                          return (
                            <option key={classId} value={classId}>
                              {item.code} - {item.name}
                            </option>
                          )
                        })}
                      </select>
                      <p className="text-xs text-muted-foreground">Hold Command (Mac) or Ctrl (Windows) to select multiple classes.</p>
                    </div>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground">
                  Workbook preview: {filteredSummary.schools} schools, {filteredSummary.classes} classes, {filteredSummary.students} students, {filteredSummary.teachers} teachers.
                </p>

                <Button type="button" onClick={handleExport} disabled={!canExport || (classScope === "selected" && selectedClassIds.length === 0)}>
                Generate ASC Workbook
              </Button>

                {!canExport ? (
                  <p className="text-xs text-destructive">
                    {periodMode === "session"
                      ? "Select an academic session to continue."
                      : "Choose a valid start and end date to continue."}
                  </p>
                ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
