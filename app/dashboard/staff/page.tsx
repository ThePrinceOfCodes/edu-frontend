"use client"

import { FormEvent, useEffect, useState } from "react"

import type { Staff } from "@/interfaces/resource-interface"
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
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [schoolBoard, setSchoolBoard] = useState("")
  const [school, setSchool] = useState("")
  const [designation, setDesignation] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const activeCount = staffList.filter((item) => item.isActive !== false).length
  const inactiveCount = staffList.filter((item) => item.isActive === false).length
  const teacherCount = staffList.filter((item) => item.employmentType === "teacher").length
  const independentSchoolCount = staffList.filter((item) => item.school && !item.schoolBoard).length

  async function loadStaff() {
    setLoadError(null)
    setLoading(true)

    try {
      const result = await resourceService.getStaff()
      setStaffList(result.results)
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
                <Label htmlFor="staff-school">School ID (optional)</Label>
                <Input
                  id="staff-school"
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
                  placeholder="Use for school-level staff, including independent schools"
                />
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
                <Label htmlFor="staff-employee-id">Employee ID</Label>
                <Input
                  id="staff-employee-id"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
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
          <CardTitle>Staff Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && staffList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff records found.</p>
          ) : null}
          {!loading && staffList.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Designation</th>
                    <th className="px-3 py-2 font-medium">Employee ID</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">School Board</th>
                    <th className="px-3 py-2 font-medium">School</th>
                    <th className="px-3 py-2 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((item) => (
                    <tr
                      key={item._id ?? item.id ?? `${item.schoolBoard}-${item.employeeId}`}
                      className="border-t"
                    >
                      <td className="px-3 py-2">{item.designation || "-"}</td>
                      <td className="px-3 py-2">{item.employeeId || "-"}</td>
                      <td className="px-3 py-2">{item.employmentType || "staff"}</td>
                      <td className="px-3 py-2">{item.isActive === false ? "inactive" : "active"}</td>
                      <td className="px-3 py-2">{item.schoolBoard || "Independent school"}</td>
                      <td className="px-3 py-2">{item.school || "-"}</td>
                      <td className="px-3 py-2">{item._id ?? item.id ?? "-"}</td>
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