"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

import type { AcademicSession, Class, ResultRecord, School, Student, Subject, Term } from "@/interfaces/resource-interface"
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

export default function ResultsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([])
  const [results, setResults] = useState<ResultRecord[]>([])

  const [selectedSchool, setSelectedSchool] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedTermId, setSelectedTermId] = useState("")
  const [selectedAcademicSessionId, setSelectedAcademicSessionId] = useState("")
  const [subject, setSubject] = useState("")
  const [testScore, setTestScore] = useState("")
  const [examScore, setExamScore] = useState("")
  const [remark, setRemark] = useState("")
  const [assessmentDate, setAssessmentDate] = useState("")

  const [filterSchool, setFilterSchool] = useState("")
  const [filterClassId, setFilterClassId] = useState("")
  const [filterStudent, setFilterStudent] = useState("")
  const [filterTermId, setFilterTermId] = useState("")
  const [filterAcademicSessionId, setFilterAcademicSessionId] = useState("")
  const [filterSubject, setFilterSubject] = useState("")

  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const authUser = useMemo(() => authService.getStoredUser(), [])
  const isSchoolScopedRole = authUser?.role === "school-admin" || authUser?.role === "teacher" || authUser?.role === "staff"
  const scopedSchoolId = isSchoolScopedRole ? authUser?.schoolId ?? "" : ""

  const schoolNameMap = useMemo(
    () => new Map(schools.map((item) => [item._id ?? item.id ?? item.name, item.name])),
    [schools]
  )
  const classNameMap = useMemo(
    () => new Map(classes.map((item) => [item._id ?? item.id ?? item.code, `${item.code} - ${item.name}`])),
    [classes]
  )
  const studentNameMap = useMemo(
    () =>
      new Map(
        students.map((item) => {
          const id = item._id ?? item.id ?? ""
          const fullName = `${item.firstName} ${item.middleName ?? ""} ${item.lastName}`.replace(/\s+/g, " ").trim()
          return [id, `${fullName} (${item.regNumber})`]
        })
      ),
    [students]
  )
  const termNameMap = useMemo(
    () => new Map(terms.map((item) => [item._id ?? item.id ?? item.name, item.name])),
    [terms]
  )
  const sessionNameMap = useMemo(
    () =>
      new Map(
        academicSessions.map((item) => {
          const id = item._id ?? item.id ?? ""
          const name = item.name || `${item.startYear}/${item.endYear}`
          return [id, name]
        })
      ),
    [academicSessions]
  )

  const availableClasses = useMemo(() => {
    if (!selectedSchool) {
      return classes
    }

    const school = schools.find((item) => (item._id ?? item.id) === selectedSchool)
    if (!school?.classes?.length) {
      return classes
    }

    const classIds = new Set(school.classes)
    return classes.filter((item) => classIds.has(item._id ?? item.id ?? ""))
  }, [classes, schools, selectedSchool])

  const availableStudents = useMemo(() => {
    return students.filter((item) => {
      const itemSchool = item.currentEnrollment?.school ?? item.school
      const itemClass = item.currentEnrollment?.classId ?? item.classId

      if (selectedSchool && itemSchool !== selectedSchool) {
        return false
      }

      if (selectedClassId && itemClass !== selectedClassId) {
        return false
      }

      return true
    })
  }, [students, selectedSchool, selectedClassId])

  async function loadLookups() {
    try {
      const schoolBoardId = authUser?.schoolBoardId ?? undefined
      const schoolQuery = isSchoolScopedRole ? scopedSchoolId || undefined : undefined

      const [schoolResult, classResult, subjectResult, termResult, sessionResult, studentResult] = await Promise.all([
        resourceService.getSchools({ limit: 500, page: 1, schoolBoard: schoolBoardId }),
        resourceService.getClasses({ limit: 500, page: 1, schoolId: schoolQuery }),
        resourceService.getSubjects({ limit: 500, page: 1 }),
        resourceService.getTerms({
          limit: 200,
          page: 1,
          schoolBoard: schoolBoardId,
          school: isSchoolScopedRole ? schoolQuery : undefined,
        }),
        resourceService.getAcademicSessions({ limit: 200, page: 1, schoolBoard: schoolBoardId }),
        resourceService.getStudents({
          limit: 1000,
          page: 1,
          school: isSchoolScopedRole ? schoolQuery : undefined,
        }),
      ])

      const resolvedSchools = isSchoolScopedRole
        ? schoolResult.results.filter((item: School) => (item._id ?? item.id) === scopedSchoolId)
        : schoolResult.results

      setSchools(resolvedSchools)
      setClasses(classResult.results)
      setSubjects(subjectResult.results)
      setTerms(termResult.results)
      setAcademicSessions(sessionResult.results)
      setStudents(studentResult.results)

      if (isSchoolScopedRole && scopedSchoolId) {
        setSelectedSchool(scopedSchoolId)
        setFilterSchool(scopedSchoolId)
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load result form data")
    }
  }

  async function loadResults() {
    setLoading(true)
    setLoadError(null)

    try {
      const result = await resourceService.getResults({
        limit: 100,
        page: 1,
        school: filterSchool || (isSchoolScopedRole ? scopedSchoolId || undefined : undefined),
        classId: filterClassId || undefined,
        student: filterStudent || undefined,
        termId: filterTermId || undefined,
        academicSessionId: filterAcademicSessionId || undefined,
        subject: filterSubject || undefined,
      })
      setResults(result.results)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load results")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLookups()
  }, [])

  useEffect(() => {
    void loadResults()
  }, [filterSchool, filterClassId, filterStudent, filterTermId, filterAcademicSessionId, filterSubject])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitting(true)

    try {
      await resourceService.createResult({
        student: selectedStudent,
        school: selectedSchool,
        classId: selectedClassId,
        termId: selectedTermId,
        academicSessionId: selectedAcademicSessionId,
        subject,
        testScore: Number(testScore),
        examScore: Number(examScore),
        remark: remark || undefined,
        assessmentDate: assessmentDate || undefined,
      })

      setSubject("")
      setTestScore("")
      setExamScore("")
      setRemark("")
      setAssessmentDate("")

      await loadResults()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save result")
    } finally {
      setSubmitting(false)
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

      const payloadResults = rows.map((row, index) => {
        const studentIdValue = extractCell(row, ["student", "studentId", "Student ID"])
        const schoolIdValue = extractCell(row, ["school", "schoolId", "School ID"])
        const classIdValue = extractCell(row, ["classId", "class", "Class ID"])
        const termIdValue = extractCell(row, ["termId", "term", "Term ID"])
        const academicSessionIdValue = extractCell(row, ["academicSessionId", "sessionId", "Academic Session ID"])
        const subjectValue = extractCell(row, ["subject", "Subject", "subjectCode", "Subject Code"])
        const testScoreValue = extractCell(row, ["testScore", "Test Score"])
        const examScoreValue = extractCell(row, ["examScore", "Exam Score"])
        const remarkValue = extractCell(row, ["remark", "Remark"])
        const assessmentDateValue = extractCell(row, ["assessmentDate", "Assessment Date", "date"])

        const testScoreNumber = Number(testScoreValue)
        const examScoreNumber = Number(examScoreValue)

        if (
          !studentIdValue ||
          !schoolIdValue ||
          !classIdValue ||
          !termIdValue ||
          !academicSessionIdValue ||
          !subjectValue ||
          Number.isNaN(testScoreNumber) ||
          Number.isNaN(examScoreNumber)
        ) {
          throw new Error(
            `Invalid row ${index + 1}. Required columns: student,school,classId,termId,academicSessionId,subject,testScore,examScore`
          )
        }

        return {
          student: studentIdValue,
          school: schoolIdValue,
          classId: classIdValue,
          termId: termIdValue,
          academicSessionId: academicSessionIdValue,
          subject: subjectValue,
          testScore: testScoreNumber,
          examScore: examScoreNumber,
          remark: remarkValue || undefined,
          assessmentDate: assessmentDateValue || undefined,
        }
      })

      const result = await resourceService.bulkCreateResults({ results: payloadResults })
      setImportSummary(`Imported ${result.createdCount}/${result.total}. Failed: ${result.failedCount}`)
      await loadResults()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import Excel")
    } finally {
      setIsImporting(false)
    }
  }

  function handleDownloadSample() {
    const sampleRows = [
      {
        student: "STUDENT_UUID",
        school: "SCHOOL_UUID",
        classId: "CLASS_UUID",
        termId: "TERM_UUID",
        academicSessionId: "ACADEMIC_SESSION_UUID",
        subject: "MTH",
        testScore: 24,
        examScore: 63,
        remark: "Good performance",
        assessmentDate: "2026-05-11",
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results")
    XLSX.writeFile(workbook, "results-import-sample.xlsx")
  }

  async function handleDelete(resultId: string) {
    const confirmed = window.confirm("Delete this result record?")
    if (!confirmed) {
      return
    }

    setDeletingId(resultId)

    try {
      await resourceService.deleteResult(resultId)
      await loadResults()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to delete result")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Results</h2>
        <p className="text-sm text-muted-foreground">
          Save test and exam scores per student, class, term, subject, and academic session.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={handleDownloadSample}>
          Download Sample File
        </Button>
        <Modal open={isImportOpen} onOpenChange={setIsImportOpen}>
          <ModalTrigger render={<Button variant="outline" />}>Import Excel</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Import Results from Excel</ModalTitle>
              <ModalDescription>
                Upload .xlsx/.xls with columns: student,school,classId,termId,academicSessionId,subject,testScore,examScore,remark,assessmentDate
              </ModalDescription>
            </ModalHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleDownloadSample}>
                  Download Sample
                </Button>
                <span className="text-xs text-muted-foreground">Use IDs for student/school/class/term/session</span>
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Add Result Record</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="result-school">School</Label>
                <select
                  id="result-school"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedSchool}
                  onChange={(event) => {
                    setSelectedSchool(event.target.value)
                    setSelectedClassId("")
                    setSelectedStudent("")
                  }}
                  disabled={Boolean(isSchoolScopedRole && scopedSchoolId)}
                  required
                >
                  <option value="">Select school</option>
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
                <Label htmlFor="result-class">Class</Label>
                <select
                  id="result-class"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value)
                    setSelectedStudent("")
                  }}
                  required
                >
                  <option value="">Select class</option>
                  {availableClasses.map((classItem) => {
                    const classId = classItem._id ?? classItem.id
                    if (!classId) {
                      return null
                    }

                    return (
                      <option key={classId} value={classId}>
                        {classItem.code} - {classItem.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-student">Student</Label>
                <select
                  id="result-student"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedStudent}
                  onChange={(event) => setSelectedStudent(event.target.value)}
                  required
                >
                  <option value="">Select student</option>
                  {availableStudents.map((student) => {
                    const studentId = student._id ?? student.id
                    if (!studentId) {
                      return null
                    }

                    return (
                      <option key={studentId} value={studentId}>
                        {`${student.firstName} ${student.lastName}`} ({student.regNumber})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-term">Term</Label>
                <select
                  id="result-term"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedTermId}
                  onChange={(event) => setSelectedTermId(event.target.value)}
                  required
                >
                  <option value="">Select term</option>
                  {terms.map((term) => {
                    const termId = term._id ?? term.id
                    if (!termId) {
                      return null
                    }

                    return (
                      <option key={termId} value={termId}>
                        {term.name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-session">Academic Session</Label>
                <select
                  id="result-session"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedAcademicSessionId}
                  onChange={(event) => setSelectedAcademicSessionId(event.target.value)}
                  required
                >
                  <option value="">Select session</option>
                  {academicSessions.map((session) => {
                    const sessionId = session._id ?? session.id
                    if (!sessionId) {
                      return null
                    }

                    return (
                      <option key={sessionId} value={sessionId}>
                        {session.name || `${session.startYear}/${session.endYear}`}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-subject">Subject</Label>
                <select
                  id="result-subject"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                >
                  <option value="">Select subject</option>
                  {subjects.map((item) => {
                    const subjectId = item._id ?? item.id
                    if (!subjectId) {
                      return null
                    }

                    return (
                      <option key={subjectId} value={item.name}>
                        {item.name} ({item.code})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-test-score">Test Score</Label>
                <Input
                  id="result-test-score"
                  type="number"
                  min={0}
                  max={100}
                  value={testScore}
                  onChange={(event) => setTestScore(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-exam-score">Exam Score</Label>
                <Input
                  id="result-exam-score"
                  type="number"
                  min={0}
                  max={100}
                  value={examScore}
                  onChange={(event) => setExamScore(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="result-assessment-date">Assessment Date</Label>
                <Input
                  id="result-assessment-date"
                  type="date"
                  value={assessmentDate}
                  onChange={(event) => setAssessmentDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="result-remark">Remark</Label>
              <Input
                id="result-remark"
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder="Optional comment"
              />
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Result"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterSchool}
              onChange={(event) => setFilterSchool(event.target.value)}
              disabled={Boolean(isSchoolScopedRole && scopedSchoolId)}
            >
              <option value="">All schools</option>
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

            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterClassId}
              onChange={(event) => setFilterClassId(event.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((classItem) => {
                const classId = classItem._id ?? classItem.id
                if (!classId) {
                  return null
                }

                return (
                  <option key={classId} value={classId}>
                    {classItem.code}
                  </option>
                )
              })}
            </select>

            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterStudent}
              onChange={(event) => setFilterStudent(event.target.value)}
            >
              <option value="">All students</option>
              {students.map((student) => {
                const studentId = student._id ?? student.id
                if (!studentId) {
                  return null
                }

                return (
                  <option key={studentId} value={studentId}>
                    {student.firstName} {student.lastName}
                  </option>
                )
              })}
            </select>

            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterTermId}
              onChange={(event) => setFilterTermId(event.target.value)}
            >
              <option value="">All terms</option>
              {terms.map((term) => {
                const termId = term._id ?? term.id
                if (!termId) {
                  return null
                }

                return (
                  <option key={termId} value={termId}>
                    {term.termName}
                  </option>
                )
              })}
            </select>

            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterAcademicSessionId}
              onChange={(event) => setFilterAcademicSessionId(event.target.value)}
            >
              <option value="">All sessions</option>
              {academicSessions.map((session) => {
                const sessionId = session._id ?? session.id
                if (!sessionId) {
                  return null
                }

                return (
                  <option key={sessionId} value={sessionId}>
                    {session.name || `${session.startYear}/${session.endYear}`}
                  </option>
                )
              })}
            </select>

            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value)}
            >
              <option value="">All subjects</option>
              {subjects.map((item) => {
                const subjectId = item._id ?? item.id
                if (!subjectId) {
                  return null
                }

                return (
                  <option key={subjectId} value={item.name}>
                    {item.name} ({item.code})
                  </option>
                )
              })}
            </select>
          </div>

          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

          {!loading && results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No result records found.</p>
          ) : null}

          {!loading && results.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Test</th>
                    <th className="px-3 py-2 font-medium">Exam</th>
                    <th className="px-3 py-2 font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Term</th>
                    <th className="px-3 py-2 font-medium">Session</th>
                    <th className="px-3 py-2 font-medium">School</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => {
                    const resultId = item._id ?? item.id ?? ""
                    const canDelete = Boolean(resultId)

                    return (
                      <tr key={resultId || `${item.student}-${item.subject}-${item.createdAt ?? ""}`} className="border-t">
                        <td className="px-3 py-2">{studentNameMap.get(item.student) ?? item.student}</td>
                        <td className="px-3 py-2">{item.subject}</td>
                        <td className="px-3 py-2">{item.testScore}</td>
                        <td className="px-3 py-2">{item.examScore}</td>
                        <td className="px-3 py-2 font-semibold">{item.totalScore}</td>
                        <td className="px-3 py-2">{classNameMap.get(item.classId) ?? item.classId}</td>
                        <td className="px-3 py-2">{termNameMap.get(item.termId) ?? item.termId}</td>
                        <td className="px-3 py-2">{sessionNameMap.get(item.academicSessionId) ?? item.academicSessionId}</td>
                        <td className="px-3 py-2">{schoolNameMap.get(item.school) ?? item.school}</td>
                        <td className="px-3 py-2">
                          {item.assessmentDate ? new Date(item.assessmentDate).toISOString().slice(0, 10) : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canDelete || deletingId === resultId}
                            onClick={() => {
                              if (resultId) {
                                void handleDelete(resultId)
                              }
                            }}
                          >
                            {deletingId === resultId ? "Deleting..." : "Delete"}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
