"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"

import type { School, SchoolBoard, SchoolType } from "@/interfaces/resource-interface"
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
  const params = useParams<{ schoolId: string }>()
  const searchParams = useSearchParams()
  const schoolId = typeof params.schoolId === "string" ? params.schoolId : ""

  const [school, setSchool] = useState<School | null>(null)
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([])
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isActionOpen, setIsActionOpen] = useState(false)
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

  const [adminUserId, setAdminUserId] = useState("")

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

  function syncEditFields(record: School) {
    setName(record.name)
    setAddress(record.address ?? "")
    setState(record.state ?? "")
    setLocalGovernment(record.localGovernment ?? "")
    setDistrict(record.district ?? "")
    setLongitude(record.longitude === undefined || record.longitude === null ? "" : String(record.longitude))
    setLatitude(record.latitude === undefined || record.latitude === null ? "" : String(record.latitude))
    setStatus(record.status ?? "active")
    setAdminUserId(record.adminUser ?? "")
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
      const [schoolResult, schoolBoardsResult, schoolTypesResult] = await Promise.all([
        resourceService.getSchoolById(schoolId),
        resourceService.getSchoolBoards(),
        resourceService.getSchoolTypes({ limit: 200, page: 1 }),
      ])

      setSchool(schoolResult)
      setSchoolBoards(schoolBoardsResult.results)
      setSchoolTypes(schoolTypesResult.results)
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
        adminUser: adminUserId || null,
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

    if (!adminUserId) {
      setSubmitError("Enter a school admin user ID.")
      return
    }

    setIsSubmitting(true)

    try {
      const updated = await resourceService.updateSchool(currentSchoolId, { adminUser: adminUserId })
      setSchool(updated)
      syncEditFields(updated)
      setSubmitSuccess("School admin assigned.")
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

          <Modal open={isActionOpen} onOpenChange={setIsActionOpen}>
            <ModalTrigger render={<Button variant="outline" />}>Actions</ModalTrigger>
            <ModalContent className="max-w-2xl">
              <ModalHeader>
                <ModalTitle>School Actions</ModalTitle>
                <ModalDescription>Create staff, class, and school admin from this dashboard.</ModalDescription>
              </ModalHeader>

              <div className="space-y-5">
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

                <form className="space-y-3 rounded-md border p-3" onSubmit={handleAssignSchoolAdmin}>
                  <p className="text-sm font-medium">Create/Assign School Admin</p>
                  <div className="space-y-2">
                    <Label htmlFor="school-admin-user-id">School Admin User ID</Label>
                    <Input
                      id="school-admin-user-id"
                      value={adminUserId}
                      onChange={(event) => setAdminUserId(event.target.value)}
                      placeholder="Enter existing user ID"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Assigning..." : "Assign School Admin"}
                  </Button>
                </form>
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
                  <span className="font-medium">School Admin User ID:</span> {school.adminUser || "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
