"use client"

import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { resourceService } from "@/services/resource-service"

export default function DashboardPage() {
  const [staffCount, setStaffCount] = useState<number | null>(null)
  const [schoolCount, setSchoolCount] = useState<number | null>(null)
  const [schoolBoardCount, setSchoolBoardCount] = useState<number | null>(null)

  useEffect(() => {
    async function loadCounts() {
      try {
        const [staff, schools, schoolBoards] = await Promise.all([
          resourceService.getStaff(),
          resourceService.getSchools(),
          resourceService.getSchoolBoards(),
        ])

        setStaffCount(staff.totalResults)
        setSchoolCount(schools.totalResults)
        setSchoolBoardCount(schoolBoards.totalResults)
      } catch {
        setStaffCount(0)
        setSchoolCount(0)
        setSchoolBoardCount(0)
      }
    }

    void loadCounts()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Here is a snapshot of your education platform today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{staffCount ?? "..."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{schoolCount ?? "..."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">School Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{schoolBoardCount ?? "..."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">API Version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">v1</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• School Boards module connected</li>
            <li>• Schools module connected</li>
            <li>• Staff module connected</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
