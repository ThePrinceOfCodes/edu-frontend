"use client"

import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { Class, School, Staff, Student } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LoadState = {
  schools: School[]
  classes: Class[]
  students: Student[]
  teachers: Staff[]
}

function asIdentifier(value?: string | { id?: string; _id?: string } | null) {
  if (!value) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  return value.id ?? value._id ?? ""
}

export default function AscReportsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [data, setData] = useState<LoadState>({
    schools: [],
    classes: [],
    students: [],
    teachers: [],
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const authUser = authService.getStoredUser()
        const schoolBoardId = authUser?.schoolBoardId ?? undefined

        const [schoolsResult, classesResult, studentsResult, staffResult] = await Promise.all([
          resourceService.getSchools({ limit: 1000, page: 1, schoolBoard: schoolBoardId }),
          resourceService.getClasses({ limit: 1000, page: 1 }),
          resourceService.getStudents({ limit: 5000, page: 1 }),
          resourceService.getStaff({ limit: 3000, page: 1, schoolBoard: schoolBoardId, employmentType: "teacher" }),
        ])

        setData({
          schools: schoolsResult.results,
          classes: classesResult.results,
          students: studentsResult.results,
          teachers: staffResult.results,
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

  function handleExport() {
    const workbook = XLSX.utils.book_new()

    const schoolRows = data.schools.map((school) => ({
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

    const classRows = data.classes.map((item) => ({
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

    const studentRows = data.students.map((student) => ({
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

    const teacherRows = data.teachers.map((teacher) => ({
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
              <Button type="button" onClick={handleExport}>
                Generate ASC Workbook
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
