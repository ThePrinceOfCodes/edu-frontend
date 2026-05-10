"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { Class, School, Student } from "@/interfaces/resource-interface"
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

  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const availableClassesForSelectedSchool = useMemo(() => {
    const selectedSchool = schools.find((item) => (item._id ?? item.id) === school)
    if (!selectedSchool || !selectedSchool.classes || selectedSchool.classes.length === 0) {
      return classes
    }

    return classes.filter((item) => selectedSchool.classes?.includes(item._id ?? item.id ?? ""))
  }, [classes, school, schools])

  async function loadData() {
    setLoadError(null)
    setLoading(true)

    try {
      const [studentsResult, schoolsResult, classesResult] = await Promise.all([
        resourceService.getStudents({ limit: 100, page: 1 }),
        resourceService.getSchools(),
        resourceService.getClasses({ limit: 100, page: 1 }),
      ])

      setStudents(studentsResult.results)
      setSchools(schoolsResult.results)
      setClasses(classesResult.results)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load students.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

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
      await loadData()
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
        const schoolId = extractCell(row, ["school", "schoolId", "School ID"])
        const schoolName = extractCell(row, ["schoolName", "School Name"])
        const classIdValue = extractCell(row, ["classId", "class", "Class ID"])
        const classCode = extractCell(row, ["classCode", "Class Code", "code"])

        const resolvedSchoolId =
          schoolId ||
          schools.find((item) => item.name.toLowerCase() === schoolName.toLowerCase())?._id ||
          schools.find((item) => item.name.toLowerCase() === schoolName.toLowerCase())?.id ||
          ""

        const resolvedClassId =
          classIdValue ||
          classes.find((item) => item.code.toLowerCase() === classCode.toLowerCase())?._id ||
          classes.find((item) => item.code.toLowerCase() === classCode.toLowerCase())?.id ||
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

      setImportSummary(
        `Imported ${result.createdCount}/${result.total}. Failed: ${result.failedCount}`
      )

      await loadData()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import Excel")
    } finally {
      setIsImporting(false)
    }
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
                  <Input
                    id="student-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-middle-name">Middle Name</Label>
                  <Input
                    id="student-middle-name"
                    value={middleName}
                    onChange={(event) => setMiddleName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-last-name">Last Name</Label>
                  <Input
                    id="student-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-reg">Reg Number</Label>
                  <Input
                    id="student-reg"
                    value={regNumber}
                    onChange={(event) => setRegNumber(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-state">State of Origin</Label>
                  <Input
                    id="student-state"
                    value={stateOfOrigin}
                    onChange={(event) => setStateOfOrigin(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-lga">Local Government</Label>
                  <Input
                    id="student-lga"
                    value={localGovernment}
                    onChange={(event) => setLocalGovernment(event.target.value)}
                    required
                  />
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
                  <Input
                    id="student-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-school">Initial School ID</Label>
                  <Input
                    id="student-school"
                    value={school}
                    onChange={(event) => {
                      setSchool(event.target.value)
                      setClassId("")
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-class">Initial Class ID</Label>
                  <Input
                    id="student-class"
                    value={classId}
                    onChange={(event) => setClassId(event.target.value)}
                    required
                  />
                  {availableClassesForSelectedSchool.length ? (
                    <p className="text-xs text-muted-foreground">
                      Allowed class IDs for selected school: {availableClassesForSelectedSchool
                        .map((item) => item._id ?? item.id)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}
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
            <p className="text-2xl font-semibold">{students.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active</CardTitle>
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
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : null}
          {!loading && students.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">First Name</th>
                    <th className="px-3 py-2 font-medium">Middle Name</th>
                    <th className="px-3 py-2 font-medium">Last Name</th>
                    <th className="px-3 py-2 font-medium">Reg Number</th>
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
        </CardContent>
      </Card>
    </div>
  )
}
