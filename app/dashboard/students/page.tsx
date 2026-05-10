"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { AcademicSession, Class, School, Student } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal"

type ExcelRow = Record<string, string | number | undefined>

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [regNumber, setRegNumber] = useState("")
  const [stateOfOrigin, setStateOfOrigin] = useState("")
  const [localGovernment, setLocalGovernment] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [school, setSchool] = useState("")
  const [classId, setClassId] = useState("")

  const [filterGender, setFilterGender] = useState("")
  const [filterSchool, setFilterSchool] = useState("")
  const [filterAcademicSessionId, setFilterAcademicSessionId] = useState("")
  const [filterClassId, setFilterClassId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const authUser = useMemo(() => authService.getStoredUser(), [])
  const isSchoolBoardAdmin = authUser?.role === "school-board-admin"
  const schoolBoardId = authUser?.schoolBoardId ?? undefined

  const availableClassesForSelectedSchool = useMemo(() => {
    const selectedSchool = schools.find((item) => (item._id ?? item.id) === school)
    if (!selectedSchool?.classes?.length) {
      return classes
    }

    return classes.filter((item) => selectedSchool.classes?.includes(item._id ?? item.id ?? ""))
  }, [classes, school, schools])

  const filteredClasses = useMemo(() => {
    if (!filterSchool) {
      return classes
    }

    const selectedSchool = schools.find((item) => (item._id ?? item.id) === filterSchool)
    if (!selectedSchool?.classes?.length) {
      return classes
    }

    return classes.filter((item) => selectedSchool.classes?.includes(item._id ?? item.id ?? ""))
  }, [classes, filterSchool, schools])

  const schoolNameMap = useMemo(
    () =>
      new Map(
        schools.map((item) => [item._id ?? item.id ?? item.name, item.name])
      ),
    [schools]
  )

  const classLabelMap = useMemo(
    () =>
      new Map(
        classes.map((item) => [item._id ?? item.id ?? item.code, `${item.code} - ${item.name}`])
      ),
    [classes]
  )

  async function loadMetadata() {
    setLoadError(null)

    try {
      const [schoolsResult, sessionsResult] = await Promise.all([
        resourceService.getSchools(
          isSchoolBoardAdmin ? { schoolBoard: schoolBoardId, limit: 500, page: 1 } : { limit: 500, page: 1 }
        ),
        resourceService.getAcademicSessions(
          isSchoolBoardAdmin ? { schoolBoard: schoolBoardId, limit: 200, page: 1 } : { limit: 200, page: 1 }
        ),
      ])

      setSchools(schoolsResult.results)
      setAcademicSessions(sessionsResult.results)

      const schoolIds = schoolsResult.results.map((item) => item._id ?? item.id ?? "").filter(Boolean)

      if (schoolIds.length === 0) {
        setClasses([])
        return
      }

      if (isSchoolBoardAdmin) {
        const classResults = await Promise.all(
          schoolIds.map((schoolIdValue) =>
            resourceService.getClasses({ schoolId: schoolIdValue, limit: 500, page: 1 })
          )
        )

        const uniqueClasses = new Map<string, Class>()
        classResults.forEach((result) => {
          result.results.forEach((classItem) => {
            uniqueClasses.set(classItem._id ?? classItem.id ?? classItem.code, classItem)
          })
        })

        setClasses(Array.from(uniqueClasses.values()))
        return
      }

      const classesResult = await resourceService.getClasses({ limit: 500, page: 1 })
      setClasses(classesResult.results)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load students.")
    }
  }

  async function loadStudents(nextPage = page) {
    setLoadError(null)
    setLoading(true)

    try {
      const result = await resourceService.getStudents({
        page: nextPage,
        limit,
        q: debouncedSearchQuery || undefined,
        gender: filterGender ? (filterGender as "male" | "female") : undefined,
        school: filterSchool || undefined,
        academicSessionId: filterAcademicSessionId || undefined,
        classId: filterClassId || undefined,
      })

      setStudents(result.results)
      setTotalResults(result.totalResults)
      setTotalPages(result.totalPages)
      setPage(result.page)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load students.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMetadata()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery])

  useEffect(() => {
    void loadStudents(page)
  }, [page, limit, debouncedSearchQuery, filterGender, filterSchool, filterAcademicSessionId, filterClassId])

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await resourceService.createStudent({
        firstName,
        middleName: middleName || undefined,
        lastName,
        regNumber,
        stateOfOrigin,
        localGovernment,
        gender,
        dateOfBirth,
        school,
        classId,
      })

      setFirstName("")
      setMiddleName("")
      setLastName("")
      setRegNumber("")
      setStateOfOrigin("")
      setLocalGovernment("")
      setGender("male")
      setDateOfBirth("")
      setSchool("")
      setClassId("")
      setIsCreateOpen(false)
      await loadStudents(1)
      setPage(1)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create student")
    } finally {
      setIsSubmitting(false)
    }
  }

  function extractCell(row: ExcelRow, keys: string[]) {
    for (const key of keys) {
      const value = row[key]
      if (value !== undefined && value !== null && `${value}`.trim() !== "") {
        return `${value}`.trim()
      }
    }

    return ""
  }

  async function handleExcelImport(file: File) {
    setImportError(null)
    setImportSummary(null)
    setIsImporting(true)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]

      if (!sheetName) {
        throw new Error("No worksheet found in the file.")
      }

      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet)

      if (!rows.length) {
        throw new Error("Excel file is empty.")
      }

      const payloadStudents = rows.map((row, index) => {
        const firstNameValue = extractCell(row, ["firstName", "FirstName", "First Name"])
        const middleNameValue = extractCell(row, ["middleName", "MiddleName", "Middle Name"])
        const lastNameValue = extractCell(row, ["lastName", "LastName", "Last Name"])
        const studentReg = extractCell(row, ["regNumber", "RegNumber", "reg_number", "Reg Number"])
        const stateOfOriginValue = extractCell(row, ["stateOfOrigin", "StateOfOrigin", "State Of Origin"])
        const localGovernmentValue = extractCell(row, ["localGovernment", "LocalGovernment", "Local Government"])
        const genderValue = extractCell(row, ["gender", "Gender"]).toLowerCase()
        const dateOfBirthValue = extractCell(row, ["dateOfBirth", "DateOfBirth", "Date Of Birth", "dob", "DOB"])
        const schoolIdValue = extractCell(row, ["school", "schoolId", "School ID"])
        const schoolNameValue = extractCell(row, ["schoolName", "School Name"])
        const classIdValue = extractCell(row, ["classId", "class", "Class ID"])
        const classCodeValue = extractCell(row, ["classCode", "Class Code", "code"])

        const resolvedSchoolId =
          schoolIdValue ||
          schools.find((item) => item.name.toLowerCase() === schoolNameValue.toLowerCase())?._id ||
          schools.find((item) => item.name.toLowerCase() === schoolNameValue.toLowerCase())?.id ||
          ""

        const resolvedClassId =
          classIdValue ||
          classes.find((item) => item.code.toLowerCase() === classCodeValue.toLowerCase())?._id ||
          classes.find((item) => item.code.toLowerCase() === classCodeValue.toLowerCase())?.id ||
          ""

        if (
          !firstNameValue ||
          !lastNameValue ||
          !studentReg ||
          !stateOfOriginValue ||
          !localGovernmentValue ||
          !dateOfBirthValue ||
          !resolvedSchoolId ||
          !resolvedClassId ||
          (genderValue !== "male" && genderValue !== "female")
        ) {
          throw new Error(
            `Invalid row ${index + 1}. Required columns: firstName,lastName,regNumber,stateOfOrigin,localGovernment,gender,dateOfBirth,school|schoolName,classId|classCode`
          )
        }

        return {
          firstName: firstNameValue,
          middleName: middleNameValue || undefined,
          lastName: lastNameValue,
          regNumber: studentReg,
          stateOfOrigin: stateOfOriginValue,
          localGovernment: localGovernmentValue,
          gender: genderValue as "male" | "female",
          dateOfBirth: dateOfBirthValue,
          school: resolvedSchoolId,
          classId: resolvedClassId,
        }
      })

      const result = await resourceService.bulkCreateStudents({ students: payloadStudents })

      setImportSummary(`Imported ${result.createdCount}/${result.total}. Failed: ${result.failedCount}`)
      await loadStudents(1)
      setPage(1)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import Excel")
    } finally {
      setIsImporting(false)
    }
  }

  function formatAcademicSession(session: AcademicSession) {
    return session.name || `${session.startYear}/${session.endYear}`
  }

  function clearFilters() {
    setFilterGender("")
    setFilterSchool("")
    setFilterAcademicSessionId("")
    setFilterClassId("")
    setPage(1)
  }

  function clearSearch() {
    setSearchQuery("")
  }

  function clearAllControls() {
    clearFilters()
    clearSearch()
  }

  const activeCount = students.filter((item) => item.status !== "inactive").length
  const withCurrentEnrollmentCount = students.filter((item) => Boolean(item.currentEnrollment?.school)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Students</h2>
        <div className="flex gap-2">
          <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ModalTrigger render={<Button />}>Create Student</ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Create Student</ModalTitle>
                <ModalDescription>Create student biodata and assign an initial enrollment.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleCreateStudent}>
                <div className="space-y-2">
                  <Label htmlFor="student-first-name">First Name</Label>
                  <Input id="student-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-middle-name">Middle Name</Label>
                  <Input id="student-middle-name" value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-last-name">Last Name</Label>
                  <Input id="student-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-reg">Reg Number</Label>
                  <Input id="student-reg" value={regNumber} onChange={(event) => setRegNumber(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-state">State of Origin</Label>
                  <Input id="student-state" value={stateOfOrigin} onChange={(event) => setStateOfOrigin(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-lga">Local Government</Label>
                  <Input id="student-lga" value={localGovernment} onChange={(event) => setLocalGovernment(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-gender">Gender</Label>
                  <select
                    id="student-gender"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={gender}
                    onChange={(event) => setGender(event.target.value as "male" | "female")}
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-dob">Date of Birth</Label>
                  <Input id="student-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-school">Initial School</Label>
                  <select
                    id="student-school"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={school}
                    onChange={(event) => {
                      setSchool(event.target.value)
                      setClassId("")
                    }}
                    required
                  >
                    <option value="">Select school</option>
                    {schools.map((item) => {
                      const itemId = item._id ?? item.id ?? ""
                      return (
                        <option key={itemId} value={itemId}>
                          {item.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-class">Initial Class</Label>
                  <select
                    id="student-class"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    required
                  >
                    <option value="">Select class</option>
                    {availableClassesForSelectedSchool.map((item) => {
                      const itemId = item._id ?? item.id ?? item.code
                      return (
                        <option key={itemId} value={itemId}>
                          {item.code} - {item.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Student"}
                </Button>
              </form>
            </ModalContent>
          </Modal>

          <Modal open={isImportOpen} onOpenChange={setIsImportOpen}>
            <ModalTrigger render={<Button variant="outline" />}>Import Excel</ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Import Students from Excel</ModalTitle>
                <ModalDescription>
                  Upload .xlsx/.xls with student biodata plus initial enrollment columns: firstName,middleName,lastName,regNumber,stateOfOrigin,localGovernment,gender,dateOfBirth,school|schoolName,classId|classCode
                </ModalDescription>
              </ModalHeader>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void handleExcelImport(file)
                    }
                  }}
                />
                {isImporting ? <p className="text-sm text-muted-foreground">Importing...</p> : null}
                {importSummary ? <p className="text-sm text-foreground">{importSummary}</p> : null}
                {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
              </div>
            </ModalContent>
          </Modal>
        </div>
      </div>

      <div className="border-b">
        <button className="border-b-2 border-primary px-1 py-2 text-sm font-medium text-foreground">
          Statistics
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalResults}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active On Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">With Current Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{withCurrentEnrollmentCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
              <div className="space-y-2">
                <Label htmlFor="students-search">Search Students</Label>
                <Input
                  id="students-search"
                  placeholder="Search name, reg number, school, or class"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Search runs on the server across student records.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-gender">Gender</Label>
                  <select
                    id="filter-gender"
                    className="h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm"
                    value={filterGender}
                    onChange={(event) => {
                      setFilterGender(event.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">All genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-school">School</Label>
                  <select
                    id="filter-school"
                    className="h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm"
                    value={filterSchool}
                    onChange={(event) => {
                      setFilterSchool(event.target.value)
                      setFilterClassId("")
                      setPage(1)
                    }}
                  >
                    <option value="">All schools</option>
                    {schools.map((item) => {
                      const itemId = item._id ?? item.id ?? ""
                      return (
                        <option key={itemId} value={itemId}>
                          {item.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-session">Session</Label>
                  <select
                    id="filter-session"
                    className="h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm"
                    value={filterAcademicSessionId}
                    onChange={(event) => {
                      setFilterAcademicSessionId(event.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">All sessions</option>
                    {academicSessions.map((item) => {
                      const itemId = item._id ?? item.id ?? ""
                      return (
                        <option key={itemId} value={itemId}>
                          {formatAcademicSession(item)}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-class">Class</Label>
                  <select
                    id="filter-class"
                    className="h-8 w-full rounded-md border bg-background px-2.5 py-1 text-sm"
                    value={filterClassId}
                    onChange={(event) => {
                      setFilterClassId(event.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">All classes</option>
                    {filteredClasses.map((item) => {
                      const itemId = item._id ?? item.id ?? item.code
                      return (
                        <option key={itemId} value={itemId}>
                          {item.code} - {item.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={clearSearch} disabled={!searchQuery.trim()}>
                Clear Search
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <Button type="button" variant="outline" onClick={clearAllControls}>
                Reset All
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">Showing {students.length} of {totalResults} students</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Rows per page"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={String(limit)}
                onChange={(event) => {
                  setLimit(Number(event.target.value))
                  setPage(1)
                }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>

          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && students.length === 0 ? <p className="text-sm text-muted-foreground">No students found.</p> : null}
          {!loading && students.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">First Name</th>
                    <th className="px-3 py-2 font-medium">Middle Name</th>
                    <th className="px-3 py-2 font-medium">Last Name</th>
                    <th className="px-3 py-2 font-medium">Reg Number</th>
                    <th className="px-3 py-2 font-medium">School</th>
                    <th className="px-3 py-2 font-medium">Academic Session</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">LGA</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">DOB</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((item) => (
                    <tr key={item._id ?? item.id ?? item.regNumber} className="border-t">
                      <td className="px-3 py-2">{item.firstName}</td>
                      <td className="px-3 py-2">{item.middleName || "-"}</td>
                      <td className="px-3 py-2">{item.lastName}</td>
                      <td className="px-3 py-2">{item.regNumber}</td>
                      <td className="px-3 py-2">{schoolNameMap.get(item.currentEnrollment?.school || "") || "-"}</td>
                      <td className="px-3 py-2">{item.currentEnrollment?.academicSession || "-"}</td>
                      <td className="px-3 py-2">{classLabelMap.get(item.currentEnrollment?.classId || "") || "-"}</td>
                      <td className="px-3 py-2">{item.stateOfOrigin}</td>
                      <td className="px-3 py-2">{item.localGovernment}</td>
                      <td className="px-3 py-2">{item.gender}</td>
                      <td className="px-3 py-2">{new Date(item.dateOfBirth).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{item.status || "active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loading && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
