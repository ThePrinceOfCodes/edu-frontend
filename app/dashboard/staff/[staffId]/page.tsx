"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"

import type { School, Staff, UpdateStaffInput } from "@/interfaces/resource-interface"
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

function getUserName(staff: Staff | null) {
  if (!staff) {
    return "Unknown"
  }

  if (staff.user && typeof staff.user === "object") {
    return staff.user.name || "Unknown"
  }

  return "Unknown"
}

function getPlaceholderAvatar(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || "Staff")}`
}

function KeyValueItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-all">{value}</p>
    </div>
  )
}

export default function StaffProfilePage() {
  const params = useParams<{ staffId: string }>()
  const staffId = getSafeParam(params?.staffId)

  const [staff, setStaff] = useState<Staff | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [editDesignation, setEditDesignation] = useState("")
  const [editEmployeeId, setEditEmployeeId] = useState("")
  const [editEmploymentType, setEditEmploymentType] = useState<"teacher" | "staff">("staff")
  const [editSchool, setEditSchool] = useState("")
  const [editAvatar, setEditAvatar] = useState("")
  const [editGender, setEditGender] = useState<"" | "M" | "F">("")
  const [editAcademicQualification, setEditAcademicQualification] = useState<"" | "NCE" | "B.Ed" | "B.Sc" | "HND" | "PGDE" | "SSCE">("")
  const [editTrcnRegistered, setEditTrcnRegistered] = useState<"" | "yes" | "no">("")
  const [editSalarySource, setEditSalarySource] = useState<"" | "1-FTS" | "2-SUBEB" | "3-Private">("")
  const [editIsActive, setEditIsActive] = useState(true)

  const userName = useMemo(() => getUserName(staff), [staff])
  const placeholderAvatar = useMemo(() => getPlaceholderAvatar(userName), [userName])
  const avatarUrl = staff?.avatar || placeholderAvatar
  const userEmail =
    staff?.user && typeof staff.user === "object" ? (staff.user.email ?? "-") : "-"
  const staffType = staff?.employmentType || "staff"
  const isActive = staff?.isActive !== false
  const schoolNameMap = useMemo(
    () => new Map(schools.map((item) => [item._id ?? item.id ?? "", item.name])),
    [schools]
  )
  const schoolName = staff?.school ? (schoolNameMap.get(staff.school) ?? "Unknown school") : "-"

  async function loadStaffProfile() {
    if (!staffId) {
      setLoadError("Invalid staff id")
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    try {
      const [staffResult, schoolsResult] = await Promise.all([
        resourceService.getStaffById(staffId),
        resourceService.getSchools({ limit: 1000, page: 1 }),
      ])
      setStaff(staffResult)
      setSchools(schoolsResult.results)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load staff profile")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStaffProfile()
  }, [staffId])

  function openEditModal() {
    if (!staff) {
      return
    }

    setEditDesignation(staff.designation || "")
    setEditEmployeeId(staff.employeeId || "")
    setEditEmploymentType(staff.employmentType || "staff")
    setEditSchool(staff.school || "")
    setEditAvatar(staff.avatar || "")
    setEditGender(staff.gender || "")
    setEditAcademicQualification(staff.academicQualification || "")
    setEditTrcnRegistered(
      typeof staff.trcnRegistered === "boolean" ? (staff.trcnRegistered ? "yes" : "no") : ""
    )
    setEditSalarySource(staff.salarySource || "")
    setEditIsActive(staff.isActive !== false)
    setSaveError(null)
    setIsEditOpen(true)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!staffId) {
      return
    }

    setSaveError(null)
    setIsSaving(true)

    const payload: UpdateStaffInput = {
      designation: editDesignation,
      employeeId: editEmployeeId,
      employmentType: editEmploymentType,
      school: editSchool,
      isActive: editIsActive,
      avatar: editAvatar.trim() ? editAvatar.trim() : null,
      gender: editGender || null,
      academicQualification: editAcademicQualification || null,
      trcnRegistered: editTrcnRegistered === "" ? null : editTrcnRegistered === "yes",
      salarySource: editSalarySource || null,
    }

    try {
      const updated = await resourceService.updateStaff(staffId, payload)
      setStaff(updated)
      setIsEditOpen(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update staff profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Staff Profile</h2>
          <p className="text-sm text-muted-foreground">Review and update this staff record.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/staff" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
            Back to Staff
          </Link>
          <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
            <ModalTrigger render={<Button onClick={openEditModal}>Edit</Button>} />
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Edit Staff Profile</ModalTitle>
                <ModalDescription>Update staff details and avatar.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleEditSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-avatar">Avatar URL</Label>
                  <Input
                    id="edit-staff-avatar"
                    type="url"
                    value={editAvatar}
                    onChange={(event) => setEditAvatar(event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-designation">Designation</Label>
                  <Input
                    id="edit-staff-designation"
                    value={editDesignation}
                    onChange={(event) => setEditDesignation(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-employee-id">Employee ID</Label>
                  <Input
                    id="edit-staff-employee-id"
                    value={editEmployeeId}
                    onChange={(event) => setEditEmployeeId(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-type">Employment Type</Label>
                  <select
                    id="edit-staff-type"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editEmploymentType}
                    onChange={(event) => setEditEmploymentType(event.target.value as "teacher" | "staff")}
                  >
                    <option value="staff">Staff</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-gender">Gender</Label>
                  <select
                    id="edit-staff-gender"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editGender}
                    onChange={(event) => setEditGender(event.target.value as "" | "M" | "F")}
                  >
                    <option value="">Select gender</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-qualification">Academic Qualification</Label>
                  <select
                    id="edit-staff-qualification"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editAcademicQualification}
                    onChange={(event) =>
                      setEditAcademicQualification(
                        event.target.value as "" | "NCE" | "B.Ed" | "B.Sc" | "HND" | "PGDE" | "SSCE"
                      )
                    }
                  >
                    <option value="">Select qualification</option>
                    <option value="NCE">NCE</option>
                    <option value="B.Ed">B.Ed</option>
                    <option value="B.Sc">B.Sc</option>
                    <option value="HND">HND</option>
                    <option value="PGDE">PGDE</option>
                    <option value="SSCE">SSCE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-trcn">TRCN Registered</Label>
                  <select
                    id="edit-staff-trcn"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editTrcnRegistered}
                    onChange={(event) => setEditTrcnRegistered(event.target.value as "" | "yes" | "no")}
                  >
                    <option value="">Select option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-salary-source">Salary Source</Label>
                  <select
                    id="edit-staff-salary-source"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editSalarySource}
                    onChange={(event) =>
                      setEditSalarySource(event.target.value as "" | "1-FTS" | "2-SUBEB" | "3-Private")
                    }
                  >
                    <option value="">Select salary source</option>
                    <option value="1-FTS">1-FTS</option>
                    <option value="2-SUBEB">2-SUBEB</option>
                    <option value="3-Private">3-Private</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-school">School</Label>
                  <select
                    id="edit-staff-school"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editSchool}
                    onChange={(event) => setEditSchool(event.target.value)}
                  >
                    <option value="">Select school</option>
                    {schools.map((item) => {
                      const schoolId = item._id ?? item.id ?? ""
                      return (
                        <option key={schoolId} value={schoolId}>
                          {item.name}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-staff-status">Status</Label>
                  <select
                    id="edit-staff-status"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={editIsActive ? "active" : "inactive"}
                    onChange={(event) => setEditIsActive(event.target.value === "active")}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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

      {!loading && staff ? (
        <div className="space-y-4">
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="bg-gradient-to-r from-primary/10 via-background to-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl}
                    alt={`${userName} avatar`}
                    className="h-24 w-24 rounded-full border-2 border-primary/20 object-cover"
                    onError={(event) => {
                      event.currentTarget.src = placeholderAvatar
                    }}
                  />
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Staff Overview</p>
                    <h3 className="text-xl font-semibold leading-tight">{userName}</h3>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium capitalize">
                        {staffType}
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
                  <KeyValueItem label="Employee ID" value={staff.employeeId || "-"} />
                  <KeyValueItem label="Designation" value={staff.designation || "-"} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organization</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-1">
                <KeyValueItem label="School" value={schoolName} />
                <KeyValueItem label="Gender" value={staff.gender || "N/A"} />
                <KeyValueItem label="Qualification" value={staff.academicQualification || "N/A"} />
                <KeyValueItem
                  label="TRCN Registered"
                  value={typeof staff.trcnRegistered === "boolean" ? (staff.trcnRegistered ? "Yes" : "No") : "N/A"}
                />
                <KeyValueItem label="Salary Source" value={staff.salarySource || "N/A"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Metadata</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-1">
                <KeyValueItem label="Avatar Source" value={staff.avatar ? "Custom URL" : "Placeholder"} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
