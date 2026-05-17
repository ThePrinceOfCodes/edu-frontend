"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"

import type { Student, UpdateStudentInput } from "@/interfaces/resource-interface"
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

function getSafeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || ""
  }

  return value || ""
}

function toDateInputValue(value?: string) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toISOString().split("T")[0] || ""
}

function getPlaceholderAvatar(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || "Student")}`
}

function KeyValueItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-all">{value}</p>
    </div>
  )
}

export default function StudentProfilePage() {
  const params = useParams<{ studentId: string }>()
  const studentId = getSafeParam(params?.studentId)

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [editFirstName, setEditFirstName] = useState("")
  const [editMiddleName, setEditMiddleName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editAvatar, setEditAvatar] = useState("")
  const [editStateOfOrigin, setEditStateOfOrigin] = useState("")
  const [editLocalGovernment, setEditLocalGovernment] = useState("")
  const [editGender, setEditGender] = useState<"male" | "female">("male")
  const [editDateOfBirth, setEditDateOfBirth] = useState("")
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active")

  const [enrollmentData, setEnrollmentData] = useState<{
    schoolName?: string
    className?: string
    sessionName?: string
  }>({})

  const fullName = useMemo(() => {
    if (!student) {
      return "Student"
    }

    return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")
  }, [student])

  const placeholderAvatar = useMemo(() => getPlaceholderAvatar(fullName), [fullName])
  const avatarUrl = student?.avatar || placeholderAvatar
  const isActive = (student?.status || "active") === "active"

  async function loadStudentProfile() {
    if (!studentId) {
      setLoadError("Invalid student id")
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    try {
      const result = await resourceService.getStudentById(studentId)
      setStudent(result)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load student profile")
    } finally {
      setLoading(false)
    }
  }

  async function loadEnrollmentData() {
    if (!student?.currentEnrollment) {
      setEnrollmentData({})
      return
    }

    try {
      const [schools, classes, sessions] = await Promise.all([
        resourceService.getSchools(),
        resourceService.getClasses(),
        resourceService.getAcademicSessions(),
      ])

      const schoolName = schools.results?.find(
        (s) => s.id === student.currentEnrollment?.school || s._id === student.currentEnrollment?.school
      )?.name

      const className = classes.results?.find(
        (c) => c.id === student.currentEnrollment?.classId || c._id === student.currentEnrollment?.classId
      )?.name

      const sessionName = sessions.results?.find(
        (s) =>
          s.id === student.currentEnrollment?.academicSessionId ||
          s._id === student.currentEnrollment?.academicSessionId
      )?.name

      setEnrollmentData({ schoolName, className, sessionName })
    } catch (error) {
      console.error("Failed to load enrollment data", error)
    }
  }

  useEffect(() => {
    void loadStudentProfile()
  }, [studentId])

  useEffect(() => {
    if (student) {
      void loadEnrollmentData()
    }
  }, [student])

  function openEditModal() {
    if (!student) {
      return
    }

    setEditFirstName(student.firstName)
    setEditMiddleName(student.middleName || "")
    setEditLastName(student.lastName)
    setEditAvatar(student.avatar || "")
    setEditStateOfOrigin(student.stateOfOrigin)
    setEditLocalGovernment(student.localGovernment)
    setEditGender(student.gender)
    setEditDateOfBirth(toDateInputValue(student.dateOfBirth))
    setEditStatus(student.status || "active")
    setSaveError(null)
    setIsEditOpen(true)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentId) {
      return
    }

    setSaveError(null)
    setIsSaving(true)

    const payload: UpdateStudentInput = {
      firstName: editFirstName,
      middleName: editMiddleName.trim() ? editMiddleName.trim() : null,
      lastName: editLastName,
      avatar: editAvatar.trim() ? editAvatar.trim() : null,
      stateOfOrigin: editStateOfOrigin,
      localGovernment: editLocalGovernment,
      gender: editGender,
      dateOfBirth: editDateOfBirth,
      status: editStatus,
    }

    try {
      const updated = await resourceService.updateStudent(studentId, payload)
      setStudent(updated)
      setIsEditOpen(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update student profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Student Profile</h2>
          <p className="text-sm text-muted-foreground">Review and update student biodata.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/students" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            Back to Students
          </Link>
          <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
            <ModalTrigger render={<Button onClick={openEditModal}>Edit</Button>} />
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Edit Student Profile</ModalTitle>
                <ModalDescription>Update student details and avatar.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleEditSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="edit-student-avatar">Avatar URL</Label>
                  <Input
                    id="edit-student-avatar"
                    type="url"
                    value={editAvatar}
                    onChange={(event) => setEditAvatar(event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-first-name">First Name</Label>
                    <Input
                      id="edit-student-first-name"
                      value={editFirstName}
                      onChange={(event) => setEditFirstName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-middle-name">Middle Name</Label>
                    <Input
                      id="edit-student-middle-name"
                      value={editMiddleName}
                      onChange={(event) => setEditMiddleName(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-student-last-name">Last Name</Label>
                  <Input
                    id="edit-student-last-name"
                    value={editLastName}
                    onChange={(event) => setEditLastName(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-state">State of Origin</Label>
                    <Input
                      id="edit-student-state"
                      value={editStateOfOrigin}
                      onChange={(event) => setEditStateOfOrigin(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-lga">Local Government</Label>
                    <Input
                      id="edit-student-lga"
                      value={editLocalGovernment}
                      onChange={(event) => setEditLocalGovernment(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-gender">Gender</Label>
                    <select
                      id="edit-student-gender"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editGender}
                      onChange={(event) => setEditGender(event.target.value as "male" | "female")}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-dob">Date of Birth</Label>
                    <Input
                      id="edit-student-dob"
                      type="date"
                      value={editDateOfBirth}
                      onChange={(event) => setEditDateOfBirth(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-student-status">Status</Label>
                    <select
                      id="edit-student-status"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value as "active" | "inactive")}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </form>
            </ModalContent>
          </Modal>
        </div>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading profile...</p> : null}

      {!loading && student ? (
        <div className="space-y-4">
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="bg-gradient-to-r from-primary/10 via-background to-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl}
                    alt={`${fullName} avatar`}
                    className="h-24 w-24 rounded-full border-2 border-primary/20 object-cover"
                    onError={(event) => {
                      event.currentTarget.src = placeholderAvatar
                    }}
                  />
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Student Overview</p>
                    <h3 className="text-xl font-semibold leading-tight">{fullName}</h3>
                    <p className="text-sm text-muted-foreground">Reg No: {student.regNumber}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium capitalize">
                        {student.gender}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          isActive
                            ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                            : "border border-rose-200 bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-64">
                  <KeyValueItem label="State" value={student.stateOfOrigin} />
                  <KeyValueItem label="LGA" value={student.localGovernment} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Identity</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <KeyValueItem label="Date of Birth" value={new Date(student.dateOfBirth).toLocaleDateString()} />
                <KeyValueItem label="Status" value={student.status || "active"} />
                <KeyValueItem label="Avatar Source" value={student.avatar ? "Custom URL" : "Placeholder"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <KeyValueItem label="School" value={enrollmentData.schoolName || student.currentEnrollment?.school || "-"} />
                <KeyValueItem label="Class" value={enrollmentData.className || student.currentEnrollment?.classId || "-"} />
                <KeyValueItem label="Academic Session" value={enrollmentData.sessionName || "-"} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
