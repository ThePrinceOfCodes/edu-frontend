"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"

import type { School, Staff } from "@/interfaces/resource-interface"
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

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [schoolBoard, setSchoolBoard] = useState("")
  const [school, setSchool] = useState("")
  const [designation, setDesignation] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [gender, setGender] = useState<"" | "M" | "F">("")
  const [academicQualification, setAcademicQualification] = useState<"" | "NCE" | "B.Ed" | "B.Sc" | "HND" | "PGDE" | "SSCE">("")
  const [trcnRegistered, setTrcnRegistered] = useState<"" | "yes" | "no">("")
  const [salarySource, setSalarySource] = useState<"" | "1-FTS" | "2-SUBEB" | "3-Private">("")
  const [isLongTermAbsent, setIsLongTermAbsent] = useState<"" | "yes" | "no">("")
  const [longTermAbsenceReason, setLongTermAbsenceReason] = useState("")
  const [longTermAbsenceStartDate, setLongTermAbsenceStartDate] = useState("")
  const [teachingLevels, setTeachingLevels] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const activeCount = staffList.filter((item) => item.isActive !== false).length
  const inactiveCount = staffList.filter((item) => item.isActive === false).length
  const teacherCount = staffList.filter((item) => item.employmentType === "teacher").length
  const independentSchoolCount = staffList.filter((item) => item.school && !item.schoolBoard).length

  const schoolNameMap = useMemo(
    () =>
      new Map(
        schools.map((item) => [item._id ?? item.id ?? "", item.name])
      ),
    [schools]
  )

  function toSurnameFirst(name?: string) {
    if (!name) {
      return "N/A"
    }

    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length <= 1) {
      return name.trim()
    }

    const surname = parts[parts.length - 1]
    const otherNames = parts.slice(0, -1).join(" ")
    return `${surname} ${otherNames}`
  }

  function resolveStaffType(item: Staff) {
    const designation = (item.designation || "").toLowerCase()

    if (designation.includes("head")) {
      return "1-Head"
    }

    if (designation.includes("vice") || designation.includes("vprincipal")) {
      return "2-VPrincipal"
    }

    if (item.employmentType === "teacher") {
      return "3-Teacher"
    }

    return "4-NonTeaching"
  }

  function resolveCurrentStatus(item: Staff) {
    if (item.isActive === false) {
      return "N/A"
    }

    return "1-Present"
  }

  async function loadStaff() {
    setLoadError(null)
    setLoading(true)

    try {
      const [staffResult, schoolsResult] = await Promise.all([
        resourceService.getStaff(),
        resourceService.getSchools({ limit: 1000, page: 1 }),
      ])
      setStaffList(staffResult.results)
      setSchools(schoolsResult.results)
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : "Unable to load staff.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStaff()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await resourceService.createStaff({
        schoolBoard: schoolBoard || undefined,
        school: school || undefined,
        designation: designation || undefined,
        employeeId: employeeId || undefined,
        gender: gender || undefined,
        academicQualification: academicQualification || undefined,
        trcnRegistered: trcnRegistered === "" ? undefined : trcnRegistered === "yes",
        salarySource: salarySource || undefined,
        isLongTermAbsent: isLongTermAbsent === "" ? undefined : isLongTermAbsent === "yes",
        longTermAbsenceReason: longTermAbsenceReason || undefined,
        longTermAbsenceStartDate: longTermAbsenceStartDate || undefined,
        teachingLevels: teachingLevels
          ? teachingLevels
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean) as Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
          : undefined,
        user: {
          name: userName,
          email: userEmail,
          password: userPassword,
        },
      })

      setUserName("")
      setUserEmail("")
      setUserPassword("")
      setSchoolBoard("")
      setSchool("")
      setDesignation("")
      setEmployeeId("")
      setGender("")
      setAcademicQualification("")
      setTrcnRegistered("")
      setSalarySource("")
      setIsLongTermAbsent("")
      setLongTermAbsenceReason("")
      setLongTermAbsenceStartDate("")
      setTeachingLevels("")
      setIsCreateOpen(false)
      await loadStaff()
    } catch (submitError) {
      setSubmitError(
        submitError instanceof Error ? submitError.message : "Unable to create staff."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Staff</h2>
        <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <ModalTrigger render={<Button />}>Create Staff</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Create Staff</ModalTitle>
              <ModalDescription>Add a staff account and assignment.</ModalDescription>
            </ModalHeader>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="user-name">User Name</Label>
                <Input
                  id="user-name"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">User Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userEmail}
                  onChange={(event) => setUserEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">User Password</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={userPassword}
                  onChange={(event) => setUserPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-school-board">School Board ID (optional)</Label>
                <Input
                  id="staff-school-board"
                  value={schoolBoard}
                  onChange={(event) => setSchoolBoard(event.target.value)}
                  placeholder="Use for school-board-level staff"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-school">School (optional)</Label>
                <select
                  id="staff-school"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
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
                <Label htmlFor="staff-designation">Designation</Label>
                <Input
                  id="staff-designation"
                  value={designation}
                  onChange={(event) => setDesignation(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-gender">Gender</Label>
                <select
                  id="staff-gender"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={gender}
                  onChange={(event) => setGender(event.target.value as "" | "M" | "F")}
                >
                  <option value="">Select gender</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-qualification">Academic Qualification</Label>
                <select
                  id="staff-qualification"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={academicQualification}
                  onChange={(event) =>
                    setAcademicQualification(
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
                <Label htmlFor="staff-trcn">TRCN Registered</Label>
                <select
                  id="staff-trcn"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={trcnRegistered}
                  onChange={(event) => setTrcnRegistered(event.target.value as "" | "yes" | "no")}
                >
                  <option value="">Select option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-salary-source">Salary Source</Label>
                <select
                  id="staff-salary-source"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={salarySource}
                  onChange={(event) => setSalarySource(event.target.value as "" | "1-FTS" | "2-SUBEB" | "3-Private")}
                >
                  <option value="">Select salary source</option>
                  <option value="1-FTS">1-FTS</option>
                  <option value="2-SUBEB">2-SUBEB</option>
                  <option value="3-Private">3-Private</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-employee-id">Employee ID</Label>
                <Input
                  id="staff-employee-id"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-long-term-absent">Long-Term Absent</Label>
                <select
                  id="staff-long-term-absent"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={isLongTermAbsent}
                  onChange={(event) => setIsLongTermAbsent(event.target.value as "" | "yes" | "no")}
                >
                  <option value="">Not specified</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-absence-reason">Absence Reason</Label>
                <Input
                  id="staff-absence-reason"
                  value={longTermAbsenceReason}
                  onChange={(event) => setLongTermAbsenceReason(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-absence-start-date">Absence Start Date</Label>
                <Input
                  id="staff-absence-start-date"
                  type="date"
                  value={longTermAbsenceStartDate}
                  onChange={(event) => setLongTermAbsenceStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-teaching-levels">Teaching Levels (comma separated)</Label>
                <Input
                  id="staff-teaching-levels"
                  value={teachingLevels}
                  onChange={(event) => setTeachingLevels(event.target.value)}
                  placeholder="pre-primary, primary, jss"
                />
              </div>
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Staff"}
              </Button>
            </form>
          </ModalContent>
        </Modal>
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
            <p className="text-2xl font-semibold">{staffList.length}</p>
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
            <CardTitle className="text-sm">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{teacherCount}</p>
            <p className="text-xs text-muted-foreground">Inactive: {inactiveCount}</p>
            <p className="text-xs text-muted-foreground">Independent school staff: {independentSchoolCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personnel (Staff) Audit Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && staffList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff records found.</p>
          ) : null}
          {!loading && staffList.length > 0 ? (
            <div className="overflow-hidden rounded-md border">
              <div className="max-h-[28rem] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Staff_Full_Name</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">Staff_Type</th>
                    <th className="px-3 py-2 font-medium">Academic_Qualification</th>
                    <th className="px-3 py-2 font-medium">TRCN_Registered</th>
                    <th className="px-3 py-2 font-medium">Salary_Source</th>
                    <th className="px-3 py-2 font-medium">Subject_Specialization</th>
                    <th className="px-3 py-2 font-medium">Current_Status</th>
                    <th className="px-3 py-2 font-medium">School</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((item) => {
                    const itemId = item._id ?? item.id ?? ""
                    const fullName = item.user && typeof item.user === "object" ? item.user.name : undefined

                    return (
                    <tr
                      key={itemId || `${item.schoolBoard}-${item.employeeId}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">{toSurnameFirst(fullName)}</td>
                      <td className="px-3 py-2">{item.gender || "N/A"}</td>
                      <td className="px-3 py-2">{resolveStaffType(item)}</td>
                      <td className="px-3 py-2">{item.academicQualification || "N/A"}</td>
                      <td className="px-3 py-2">{typeof item.trcnRegistered === "boolean" ? (item.trcnRegistered ? "Yes" : "No") : "N/A"}</td>
                      <td className="px-3 py-2">{item.salarySource || "N/A"}</td>
                      <td className="px-3 py-2">{item.designation || "N/A"}</td>
                      <td className="px-3 py-2">{resolveCurrentStatus(item)}</td>
                      <td className="px-3 py-2">{item.school ? (schoolNameMap.get(item.school) ?? "Unknown school") : "-"}</td>
                      <td className="px-3 py-2">
                        {itemId ? (
                          <Link
                            href={`/dashboard/staff/${itemId}`}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          >
                            View Profile
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}