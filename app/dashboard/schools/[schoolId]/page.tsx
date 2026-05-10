"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"

import type { School, SchoolBoard, SchoolType, Staff, Student } from "@/interfaces/resource-interface"
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

function getSchoolId(school: School | null) {
  if (!school) {
    return ""
  }

  return school._id ?? school.id ?? ""
}

export default function SchoolViewPage() {
  const PAGE_SIZE = 10
  const params = useParams<{ schoolId: string }>()
  const searchParams = useSearchParams()
  const schoolId = typeof params.schoolId === "string" ? params.schoolId : ""

  const [school, setSchool] = useState<School | null>(null)
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([])
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [studentList, setStudentList] = useState<Student[]>([])
  const [studentLoadError, setStudentLoadError] = useState<string | null>(null)
  const [staffPage, setStaffPage] = useState(1)
  const [studentPage, setStudentPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isActionOpen, setIsActionOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<"staff" | "class" | "admin" | "">("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [state, setState] = useState("")
  const [localGovernment, setLocalGovernment] = useState("")
  const [district, setDistrict] = useState("")
  const [longitude, setLongitude] = useState("")
  const [latitude, setLatitude] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  const [staffName, setStaffName] = useState("")
  const [staffEmail, setStaffEmail] = useState("")
  const [staffPassword, setStaffPassword] = useState("")
  const [staffPhone, setStaffPhone] = useState("")
  const [staffDesignation, setStaffDesignation] = useState("")
  const [staffEmployeeId, setStaffEmployeeId] = useState("")
  const [staffEmploymentType, setStaffEmploymentType] = useState<"teacher" | "staff">("staff")

  const [className, setClassName] = useState("")
  const [classCode, setClassCode] = useState("")
  const [classSchoolTypeId, setClassSchoolTypeId] = useState("")

  const [selectedAdminUserIds, setSelectedAdminUserIds] = useState<string[]>([])

  const schoolBoardName = useMemo(() => {
    if (!school?.schoolBoard) {
      return "Independent"
    }

    if (typeof school.schoolBoard === "string") {
      const board = schoolBoards.find((item) => (item._id ?? item.id) === school.schoolBoard)
      return board?.name ?? school.schoolBoard
    }

    return school.schoolBoard.name ?? "-"
  }, [school, schoolBoards])

  const schoolTypeNames = useMemo(() => {
    const ids = school?.schoolTypes ?? []

    return ids.map((schoolTypeId) => {
      const match = schoolTypes.find((item) => (item._id ?? item.id) === schoolTypeId)
      return match?.name ?? schoolTypeId
    })
  }, [school?.schoolTypes, schoolTypes])

  const eligibleSchoolTypes = useMemo(() => {
    const allowedIds = new Set(school?.schoolTypes ?? [])
    return schoolTypes.filter((item) => allowedIds.has(item._id ?? item.id ?? ""))
  }, [school?.schoolTypes, schoolTypes])

  const staffTotalPages = useMemo(
    () => Math.max(1, Math.ceil(staffList.length / PAGE_SIZE)),
    [staffList.length]
  )

  const studentTotalPages = useMemo(
    () => Math.max(1, Math.ceil(studentList.length / PAGE_SIZE)),
    [studentList.length]
  )

  const paginatedStaffList = useMemo(() => {
    const start = (staffPage - 1) * PAGE_SIZE
    return staffList.slice(start, start + PAGE_SIZE)
  }, [staffList, staffPage])

  const paginatedStudentList = useMemo(() => {
    const start = (studentPage - 1) * PAGE_SIZE
    return studentList.slice(start, start + PAGE_SIZE)
  }, [studentList, studentPage])

  const existingSchoolUsers = useMemo(() => {
    const users = staffList
      .map((staff) => {
        if (!staff.user) {
          return null
        }

        if (typeof staff.user === "string") {
          return { id: staff.user, name: staff.user, email: "" }
        }

        const id = staff.user._id ?? staff.user.id
        if (!id) {
          return null
        }

        return {
          id,
          name: staff.user.name ?? id,
          email: staff.user.email ?? "",
        }
      })
      .filter((item): item is { id: string; name: string; email: string } => Boolean(item))

    const uniqueById = new Map<string, { id: string; name: string; email: string }>()
    users.forEach((user) => uniqueById.set(user.id, user))

    return [...uniqueById.values()]
  }, [staffList])

  function syncEditFields(record: School) {
    setName(record.name)
    setAddress(record.address ?? "")
    setState(record.state ?? "")
    setLocalGovernment(record.localGovernment ?? "")
    setDistrict(record.district ?? "")
    setLongitude(record.longitude === undefined || record.longitude === null ? "" : String(record.longitude))
    setLatitude(record.latitude === undefined || record.latitude === null ? "" : String(record.latitude))
    setStatus(record.status ?? "active")
    setSelectedAdminUserIds(
      record.adminUsers && record.adminUsers.length > 0
        ? record.adminUsers
        : record.adminUser
          ? [record.adminUser]
          : []
    )
  }

  async function loadData() {
    if (!schoolId) {
      setError("Invalid school identifier.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [schoolResult, schoolBoardsResult, schoolTypesResult, staffResult] = await Promise.all([
        resourceService.getSchoolById(schoolId),
        resourceService.getSchoolBoards(),
        resourceService.getSchoolTypes({ limit: 200, page: 1 }),
        resourceService.getStaff({ school: schoolId, limit: 200, page: 1 }),
      ])

      setSchool(schoolResult)
      setSchoolBoards(schoolBoardsResult.results)
      setSchoolTypes(schoolTypesResult.results)
      setStaffList(staffResult.results)
      setStaffPage(1)
      setStudentLoadError(null)

      try {
        const studentsResult = await resourceService.getStudents({ school: schoolId, limit: 200, page: 1 })
        setStudentList(studentsResult.results)
        setStudentPage(1)
      } catch (studentLoadError) {
        setStudentList([])
        setStudentPage(1)
        setStudentLoadError(
          studentLoadError instanceof Error
            ? studentLoadError.message
            : "Unable to load students for this school."
        )
      }

      syncEditFields(schoolResult)

      if (searchParams.get("mode") === "edit") {
        setIsEditOpen(true)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load school.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId])

  async function handleUpdateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const currentSchoolId = getSchoolId(school)
    if (!currentSchoolId) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        name,
        status,
        adminUsers: selectedAdminUserIds,
        adminUser: selectedAdminUserIds[0] || null,
      }

      payload.address = address || null
      payload.state = state || null
      payload.localGovernment = localGovernment || null
      payload.district = district || null

      if (longitude) {
        payload.longitude = Number(longitude)
      }

      if (latitude) {
        payload.latitude = Number(latitude)
      }

      const updated = await resourceService.updateSchool(currentSchoolId, payload)
      setSchool(updated)
      syncEditFields(updated)
      setIsEditOpen(false)
      setSubmitSuccess("School details updated.")
    } catch (updateError) {
      setSubmitError(updateError instanceof Error ? updateError.message : "Unable to update school.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const currentSchoolId = getSchoolId(school)
    if (!currentSchoolId) {
      return
    }

    setIsSubmitting(true)

    try {
      await resourceService.createStaff({
        school: currentSchoolId,
        employeeId: staffEmployeeId || undefined,
        designation: staffDesignation || undefined,
        employmentType: staffEmploymentType,
        user: {
          name: staffName,
          email: staffEmail,
          password: staffPassword,
          phoneNumber: staffPhone || undefined,
          role: staffEmploymentType,
        },
      })

      setStaffName("")
      setStaffEmail("")
      setStaffPassword("")
      setStaffPhone("")
      setStaffDesignation("")
      setStaffEmployeeId("")
      setStaffEmploymentType("staff")
      await loadData()
      setSubmitSuccess("Staff created successfully.")
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : "Unable to create staff.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCreateClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!classSchoolTypeId) {
      setSubmitError("Select a school type for the class.")
      return
    }

    setIsSubmitting(true)

    try {
      await resourceService.createClass({
        name: className,
        code: classCode,
        schoolTypeId: classSchoolTypeId,
      })

      setClassName("")
      setClassCode("")
      setClassSchoolTypeId("")
      setSubmitSuccess("Class created successfully.")
      await loadData()
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : "Unable to create class.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAssignSchoolAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const currentSchoolId = getSchoolId(school)
    if (!currentSchoolId) {
      return
    }

    if (selectedAdminUserIds.length === 0) {
      setSubmitError("Select at least one school admin.")
      return
    }

    setIsSubmitting(true)

    try {
      const updated = await resourceService.updateSchool(currentSchoolId, {
        adminUsers: selectedAdminUserIds,
        adminUser: selectedAdminUserIds[0],
      })
      setSchool(updated)
      syncEditFields(updated)
      await loadData()
      setSubmitSuccess("School admins assigned.")
    } catch (assignError) {
      setSubmitError(assignError instanceof Error ? assignError.message : "Unable to assign school admin.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">School Dashboard</h2>
        <div className="flex items-center gap-2">
          <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
            <ModalTrigger render={<Button />}>Edit School</ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Edit School</ModalTitle>
                <ModalDescription>Update school details.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleUpdateSchool}>
                <div className="space-y-2">
                  <Label htmlFor="edit-school-name">Name</Label>
                  <Input
                    id="edit-school-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-school-address">Address</Label>
                  <Input
                    id="edit-school-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-school-state">State</Label>
                    <Input id="edit-school-state" value={state} onChange={(event) => setState(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-school-lga">Local Government</Label>
                    <Input
                      id="edit-school-lga"
                      value={localGovernment}
                      onChange={(event) => setLocalGovernment(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-school-district">District</Label>
                    <Input
                      id="edit-school-district"
                      value={district}
                      onChange={(event) => setDistrict(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-school-status">Status</Label>
                    <select
                      id="edit-school-status"
                      className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as "active" | "inactive")}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-school-longitude">Longitude</Label>
                    <Input
                      id="edit-school-longitude"
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-school-latitude">Latitude</Label>
                    <Input
                      id="edit-school-latitude"
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                    />
                  </div>
                </div>
                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </ModalContent>
          </Modal>

          <div className="flex items-center gap-2">
            <Label htmlFor="school-action" className="text-sm">
              Actions
            </Label>
            <select
              id="school-action"
              className="h-9 rounded-md border bg-transparent px-3 py-1 text-sm"
              value={selectedAction}
              onChange={(event) => {
                const action = event.target.value as "staff" | "class" | "admin" | ""
                setSelectedAction(action)
                if (action) {
                  setIsActionOpen(true)
                }
              }}
            >
              <option value="">Select action</option>
              <option value="staff">Create Staff</option>
              <option value="class">Create Class</option>
              <option value="admin">Assign School Admin</option>
            </select>
          </div>

          <Modal
            open={isActionOpen}
            onOpenChange={(open) => {
              setIsActionOpen(open)
              if (!open) {
                setSelectedAction("")
              }
            }}
          >
            <ModalTrigger render={<button className="hidden" />} />
            <ModalContent className="max-w-2xl">
              <ModalHeader>
                <ModalTitle>School Actions</ModalTitle>
                <ModalDescription>
                  {selectedAction === "staff"
                    ? "Create staff from this school dashboard."
                    : selectedAction === "class"
                      ? "Create class from this school dashboard."
                      : "Assign school admin from this school dashboard."}
                </ModalDescription>
              </ModalHeader>

              <div className="space-y-5">
                {selectedAction === "staff" ? (
                <form className="space-y-3 rounded-md border p-3" onSubmit={handleCreateStaff}>
                  <p className="text-sm font-medium">Create Staff</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="staff-name">Full Name</Label>
                      <Input
                        id="staff-name"
                        value={staffName}
                        onChange={(event) => setStaffName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-email">Email</Label>
                      <Input
                        id="staff-email"
                        type="email"
                        value={staffEmail}
                        onChange={(event) => setStaffEmail(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="staff-password">Password</Label>
                      <Input
                        id="staff-password"
                        type="password"
                        value={staffPassword}
                        onChange={(event) => setStaffPassword(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-phone">Phone Number</Label>
                      <Input
                        id="staff-phone"
                        value={staffPhone}
                        onChange={(event) => setStaffPhone(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="staff-employee-id">Employee ID</Label>
                      <Input
                        id="staff-employee-id"
                        value={staffEmployeeId}
                        onChange={(event) => setStaffEmployeeId(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-designation">Designation</Label>
                      <Input
                        id="staff-designation"
                        value={staffDesignation}
                        onChange={(event) => setStaffDesignation(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-role">Role</Label>
                      <select
                        id="staff-role"
                        className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                        value={staffEmploymentType}
                        onChange={(event) =>
                          setStaffEmploymentType(event.target.value as "teacher" | "staff")
                        }
                      >
                        <option value="staff">staff</option>
                        <option value="teacher">teacher</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Staff"}
                  </Button>
                </form>
                ) : null}

                {selectedAction === "class" ? (
                <form className="space-y-3 rounded-md border p-3" onSubmit={handleCreateClass}>
                  <p className="text-sm font-medium">Create Class</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="class-name">Class Name</Label>
                      <Input
                        id="class-name"
                        value={className}
                        onChange={(event) => setClassName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class-code">Class Code</Label>
                      <Input
                        id="class-code"
                        value={classCode}
                        onChange={(event) => setClassCode(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class-school-type">School Type</Label>
                      <select
                        id="class-school-type"
                        className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                        value={classSchoolTypeId}
                        onChange={(event) => setClassSchoolTypeId(event.target.value)}
                        required
                      >
                        <option value="">Select</option>
                        {eligibleSchoolTypes.map((item) => {
                          const value = item._id ?? item.id ?? item.name
                          return (
                            <option key={value} value={value}>
                              {item.name}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Class"}
                  </Button>
                </form>
                ) : null}

                {selectedAction === "admin" ? (
                <form className="space-y-3 rounded-md border p-3" onSubmit={handleAssignSchoolAdmin}>
                  <p className="text-sm font-medium">Assign School Admin(s)</p>
                  <div className="space-y-2">
                    <Label>Existing Users</Label>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                      {existingSchoolUsers.length > 0 ? (
                        existingSchoolUsers.map((user) => (
                          <label key={user.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedAdminUserIds.includes(user.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedAdminUserIds((current) => [...new Set([...current, user.id])])
                                  return
                                }

                                setSelectedAdminUserIds((current) => current.filter((id) => id !== user.id))
                              }}
                            />
                            <span>
                              {user.name}
                              {user.email ? ` (${user.email})` : ""}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No existing users found for this school.</p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Assigning..." : "Assign School Admin"}
                  </Button>
                </form>
                ) : null}
              </div>
            </ModalContent>
          </Modal>

          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/schools" />}>
            Back to Schools
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {submitSuccess ? <p className="text-sm text-green-700">{submitSuccess}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading && school ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{school.classes?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">School Types</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{school.schoolTypes?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{school.status ?? "active"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>School Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-medium">Name:</span> {school.name}
                </p>
                <p>
                  <span className="font-medium">School Board:</span> {schoolBoardName}
                </p>
                <p>
                  <span className="font-medium">Address:</span> {school.address || "-"}
                </p>
                <p>
                  <span className="font-medium">State:</span> {school.state || "-"}
                </p>
                <p>
                  <span className="font-medium">LGA:</span> {school.localGovernment || "-"}
                </p>
                <p>
                  <span className="font-medium">District:</span> {school.district || "-"}
                </p>
                <p>
                  <span className="font-medium">Longitude:</span> {school.longitude ?? "-"}
                </p>
                <p>
                  <span className="font-medium">Latitude:</span> {school.latitude ?? "-"}
                </p>
                <p className="md:col-span-2">
                  <span className="font-medium">School Types:</span>{" "}
                  {schoolTypeNames.length > 0 ? schoolTypeNames.join(", ") : "-"}
                </p>
                <p className="md:col-span-2">
                  <span className="font-medium">School Admin User IDs:</span>{" "}
                  {school.adminUsers && school.adminUsers.length > 0
                    ? school.adminUsers.join(", ")
                    : school.adminUser || "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff records found.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Showing {paginatedStaffList.length} of {staffList.length} staff records
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Staff ID</th>
                          <th className="px-3 py-2 font-medium">Employment Type</th>
                          <th className="px-3 py-2 font-medium">Employee ID</th>
                          <th className="px-3 py-2 font-medium">Designation</th>
                          <th className="px-3 py-2 font-medium">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStaffList.map((staff) => {
                          const id = staff._id ?? staff.id ?? "-"
                          return (
                            <tr key={id} className="border-t">
                              <td className="px-3 py-2">{id}</td>
                              <td className="px-3 py-2">{staff.employmentType ?? "-"}</td>
                              <td className="px-3 py-2">{staff.employeeId ?? "-"}</td>
                              <td className="px-3 py-2">{staff.designation ?? "-"}</td>
                              <td className="px-3 py-2">{staff.isActive ? "Yes" : "No"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {staffTotalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Page {staffPage} of {staffTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={staffPage <= 1}
                          onClick={() => setStaffPage((current) => current - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={staffPage >= staffTotalPages}
                          onClick={() => setStaffPage((current) => current + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Students Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentLoadError ? <p className="text-sm text-destructive">{studentLoadError}</p> : null}
              {studentList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {studentLoadError ? "Unable to display students." : "No students found."}
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Showing {paginatedStudentList.length} of {studentList.length} students
                  </p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Reg Number</th>
                          <th className="px-3 py-2 font-medium">First Name</th>
                          <th className="px-3 py-2 font-medium">Last Name</th>
                          <th className="px-3 py-2 font-medium">Gender</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudentList.map((student) => {
                          const id = student._id ?? student.id ?? student.regNumber
                          return (
                            <tr key={id} className="border-t">
                              <td className="px-3 py-2">{student.regNumber}</td>
                              <td className="px-3 py-2">{student.firstName}</td>
                              <td className="px-3 py-2">{student.lastName}</td>
                              <td className="px-3 py-2">{student.gender}</td>
                              <td className="px-3 py-2">{student.status ?? "active"}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {studentTotalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Page {studentPage} of {studentTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={studentPage <= 1}
                          onClick={() => setStudentPage((current) => current - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={studentPage >= studentTotalPages}
                          onClick={() => setStudentPage((current) => current + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
