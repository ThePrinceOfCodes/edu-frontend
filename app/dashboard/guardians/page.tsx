"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

import type { GuardianAdminRecord, School, Student } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function GuardiansPage() {
  const authUser = useMemo(() => authService.getStoredUser(), [])

  const canManageGuardians =
    authUser?.accountType === "internal" ||
    authUser?.role === "school-board-admin" ||
    authUser?.role === "school-admin"

  const [students, setStudents] = useState<Student[]>([])
  const [guardians, setGuardians] = useState<GuardianAdminRecord[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [guardiansLoading, setGuardiansLoading] = useState(false)
  const [actionGuardianId, setActionGuardianId] = useState<string | null>(null)
  const [guardianSearch, setGuardianSearch] = useState("")
  const [selectedGuardianId, setSelectedGuardianId] = useState("")
  const [linkStudentIds, setLinkStudentIds] = useState<string[]>([])

  const schoolNameMap = useMemo(() => {
    return new Map(schools.map((item) => [item._id ?? item.id ?? "", item.name]))
  }, [schools])

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    if (!query) {
      return students
    }

    return students.filter((student) => {
      const fullName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`
        .replace(/\s+/g, " ")
        .toLowerCase()
      const regNumber = student.regNumber.toLowerCase()
      return fullName.includes(query) || regNumber.includes(query)
    })
  }, [studentSearch, students])

  const selectedStudents = useMemo(() => {
    const selectedSet = new Set(selectedStudentIds)
    return students.filter((item) => selectedSet.has(item._id ?? item.id ?? ""))
  }, [selectedStudentIds, students])

  async function loadMetadata() {
    setLoadError(null)
    setLoading(true)

    try {
      const schoolsResult = await resourceService.getSchools(
        authUser?.role === "school-board-admin"
          ? { schoolBoard: authUser.schoolBoardId || undefined, limit: 500, page: 1 }
          : { limit: 500, page: 1 }
      )
      setSchools(schoolsResult.results || [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load schools")
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
    setLoadingStudents(true)

    try {
      const result = await resourceService.getStudents({ limit: 500, page: 1 })
      setStudents(result.results || [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load students")
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  async function loadGuardians() {
    setGuardiansLoading(true)

    try {
      const result = await resourceService.getGuardians({ q: guardianSearch || undefined })
      setGuardians(result.results || [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load guardians")
      setGuardians([])
    } finally {
      setGuardiansLoading(false)
    }
  }

  useEffect(() => {
    if (!canManageGuardians) {
      setLoading(false)
      return
    }

    void loadMetadata()
    void loadStudents()
    void loadGuardians()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageGuardians])

  useEffect(() => {
    if (!canManageGuardians) {
      return
    }

    const timeout = setTimeout(() => {
      void loadGuardians()
    }, 250)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardianSearch, canManageGuardians])

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((item) => item !== studentId)
        : [...current, studentId]
    )
  }

  function resetForm() {
    setName("")
    setEmail("")
    setPhoneNumber("")
    setPassword("")
    setStudentSearch("")
    setSelectedStudentIds([])
  }

  function toggleLinkStudent(studentId: string) {
    setLinkStudentIds((current) =>
      current.includes(studentId) ? current.filter((item) => item !== studentId) : [...current, studentId]
    )
  }

  async function handleCreateGuardian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)
    setIsSubmitting(true)

    try {
      await resourceService.createGuardian({
        name,
        email,
        password,
        phoneNumber: phoneNumber || undefined,
        studentIds: selectedStudentIds,
      })

      setSubmitSuccess(`Guardian created and linked to ${selectedStudentIds.length} student(s).`)
      resetForm()
      await loadStudents()
      await loadGuardians()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create guardian")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLinkStudentsToGuardian() {
    if (!selectedGuardianId || linkStudentIds.length === 0) {
      return
    }

    setSubmitError(null)
    setSubmitSuccess(null)
    setActionGuardianId(selectedGuardianId)

    try {
      await resourceService.linkStudentsToGuardian(selectedGuardianId, linkStudentIds)
      setSubmitSuccess(`Linked ${linkStudentIds.length} student(s) to guardian.`)
      setLinkStudentIds([])
      setSelectedGuardianId("")
      await loadGuardians()
      await loadStudents()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to link students")
    } finally {
      setActionGuardianId(null)
    }
  }

  async function handleUnlinkStudent(guardianId: string, studentId: string) {
    setSubmitError(null)
    setSubmitSuccess(null)
    setActionGuardianId(guardianId)

    try {
      await resourceService.unlinkStudentsFromGuardian(guardianId, [studentId])
      setSubmitSuccess("Student unlinked from guardian.")
      await loadGuardians()
      await loadStudents()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to unlink student")
    } finally {
      setActionGuardianId(null)
    }
  }

  const availableStudentsForLinking = useMemo(() => {
    if (!selectedGuardianId) {
      return []
    }

    const selectedGuardian = guardians.find((item) => item.id === selectedGuardianId)
    const linkedSet = new Set((selectedGuardian?.linkedStudents || []).map((item) => item.id))
    return students.filter((item) => {
      const studentId = item._id ?? item.id
      if (!studentId) return false
      return !linkedSet.has(studentId)
    })
  }, [guardians, selectedGuardianId, students])

  if (!canManageGuardians) {
    return <div className="py-10 text-sm text-muted-foreground">You do not have access to manage guardians.</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Guardians</h2>
        <p className="text-sm text-muted-foreground">
          Create guardian accounts and link them to one or more students.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Guardian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

          {!loading ? (
            <form className="space-y-4" onSubmit={handleCreateGuardian}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardian-name">Full Name</Label>
                  <Input
                    id="guardian-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian-email">Email</Label>
                  <Input
                    id="guardian-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian-phone">Phone Number</Label>
                  <Input
                    id="guardian-phone"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian-password">Password</Label>
                  <Input
                    id="guardian-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-search">Search Students</Label>
                <Input
                  id="student-search"
                  placeholder="Search by name or registration number"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                />
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Select Students ({selectedStudentIds.length})</p>
                  {loadingStudents ? <p className="text-xs text-muted-foreground">Loading students...</p> : null}
                </div>
                <div className="max-h-72 space-y-2 overflow-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students found.</p>
                  ) : (
                    filteredStudents.map((student) => {
                      const studentId = student._id ?? student.id ?? ""
                      if (!studentId) return null

                      const schoolId = student.currentEnrollment?.school || student.school || ""
                      const schoolName = schoolNameMap.get(schoolId) || "Unknown school"
                      const fullName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.replace(
                        /\s+/g,
                        " "
                      )

                      return (
                        <label key={studentId} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(studentId)}
                            onChange={() => toggleStudent(studentId)}
                          />
                          <div>
                            <p className="font-medium">{fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              Reg: {student.regNumber} | {schoolName}
                            </p>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {selectedStudents.length > 0 ? (
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-medium">Linked Preview</p>
                  <div className="space-y-1 text-sm">
                    {selectedStudents.map((student) => {
                      const studentId = student._id ?? student.id ?? student.regNumber
                      const fullName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.replace(
                        /\s+/g,
                        " "
                      )
                      return (
                        <p key={studentId} className="text-muted-foreground">
                          {fullName} ({student.regNumber})
                        </p>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              {submitSuccess ? <p className="text-sm text-primary">{submitSuccess}</p> : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || selectedStudentIds.length === 0}>
                  {isSubmitting ? "Creating..." : "Create Guardian"}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Guardians</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              placeholder="Search guardians by name or email"
              value={guardianSearch}
              onChange={(event) => setGuardianSearch(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => void loadGuardians()}>
              Refresh
            </Button>
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Quick Reassign / Add Links</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target-guardian">Target Guardian</Label>
                <select
                  id="target-guardian"
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                  value={selectedGuardianId}
                  onChange={(event) => setSelectedGuardianId(event.target.value)}
                >
                  <option value="">Select guardian</option>
                  {guardians.map((guardian) => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.name} ({guardian.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Students to Link ({linkStudentIds.length})</Label>
                <div className="max-h-36 space-y-2 overflow-auto rounded-md border p-2">
                  {availableStudentsForLinking.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No available students for selected guardian.</p>
                  ) : (
                    availableStudentsForLinking.map((student) => {
                      const studentId = student._id ?? student.id ?? ""
                      if (!studentId) return null
                      const fullName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.replace(
                        /\s+/g,
                        " "
                      )
                      return (
                        <label key={studentId} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={linkStudentIds.includes(studentId)}
                            onChange={() => toggleLinkStudent(studentId)}
                          />
                          {fullName} ({student.regNumber})
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                onClick={() => void handleLinkStudentsToGuardian()}
                disabled={!selectedGuardianId || linkStudentIds.length === 0 || actionGuardianId === selectedGuardianId}
              >
                {actionGuardianId === selectedGuardianId ? "Saving..." : "Link Selected Students"}
              </Button>
            </div>
          </div>

          {guardiansLoading ? <p className="text-sm text-muted-foreground">Loading guardians...</p> : null}
          {!guardiansLoading && guardians.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guardians found.</p>
          ) : null}

          {!guardiansLoading && guardians.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Linked Students</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guardians.map((guardian) => (
                    <tr key={guardian.id} className="border-t align-top">
                      <td className="px-3 py-2">{guardian.name}</td>
                      <td className="px-3 py-2">{guardian.email}</td>
                      <td className="px-3 py-2">{guardian.phoneNumber || "-"}</td>
                      <td className="px-3 py-2">
                        <p className="mb-1 font-medium">{guardian.linkedStudentsCount}</p>
                        <div className="space-y-1">
                          {guardian.linkedStudents.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No linked students</p>
                          ) : (
                            guardian.linkedStudents.map((student) => (
                              <p key={`${guardian.id}-${student.id}`} className="text-xs text-muted-foreground">
                                {student.fullName} ({student.regNumber})
                              </p>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-2">
                          {guardian.linkedStudents.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No student to unlink</p>
                          ) : (
                            guardian.linkedStudents.map((student) => (
                              <Button
                                key={`${guardian.id}-${student.id}-unlink`}
                                type="button"
                                size="xs"
                                variant="outline"
                                className="w-full justify-start"
                                disabled={actionGuardianId === guardian.id}
                                onClick={() => void handleUnlinkStudent(guardian.id, student.id)}
                              >
                                {actionGuardianId === guardian.id ? "Updating..." : `Unlink ${student.fullName}`}
                              </Button>
                            ))
                          )}
                        </div>
                      </td>
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
