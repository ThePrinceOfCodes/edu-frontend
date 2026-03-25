"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import type { School, SchoolBoard } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import * as XLSX from "xlsx"

import type {
  BulkCreateSchoolInput,
  BulkImportSchoolsResult,
  School,
  SchoolBoard,
  SchoolType,
} from "@/interfaces/resource-interface"
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
function getContactInfo(board: SchoolBoard | null) {
  if (!board?.superAdminUser || typeof board.superAdminUser === "string") {
    return {
      name: "-",
      email: "-",
      phoneNumber: "-",
    }
  }

  return {
    name: board.superAdminUser.name ?? "-",
    email: board.superAdminUser.email ?? "-",
    phoneNumber: board.superAdminUser.phoneNumber ?? "-",
  }
}

export default function SchoolBoardViewPage() {
  const params = useParams<{ schoolBoardId: string }>()
  const schoolBoardId = typeof params.schoolBoardId === "string" ? params.schoolBoardId : ""

  const [schoolBoard, setSchoolBoard] = useState<SchoolBoard | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!schoolBoardId) {
      setError("Invalid school board identifier.")
      setLoading(false)
      return
    }

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [boardResult, schoolsResult] = await Promise.all([
          resourceService.getSchoolBoardById(schoolBoardId),
          resourceService.getSchools({ schoolBoard: schoolBoardId, limit: 200 }),
        ])

        setSchoolBoard(boardResult)
        setSchools(schoolsResult.results)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load school board.")
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [schoolBoardId])

  const contact = useMemo(() => getContactInfo(schoolBoard), [schoolBoard])
  const activeSchools = schools.filter((school) => school.status !== "inactive").length
  const inactiveSchools = schools.filter((school) => school.status === "inactive").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">School Board View</h2>
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/school-boards" />}>
          Back to School Boards
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {!loading && schoolBoard ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Top-Level Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-medium">Name:</span> {schoolBoard.name}
                </p>
                <p>
                  <span className="font-medium">Code:</span> {schoolBoard.code || "-"}
                </p>
                <p>
                  <span className="font-medium">Status:</span> {schoolBoard.status || "active"}
                </p>
                <p>
                  <span className="font-medium">Contact Person:</span> {contact.name}
                </p>
                <p>
                  <span className="font-medium">Contact Email:</span> {contact.email}
                </p>
                <p>
                  <span className="font-medium">Contact Number:</span> {contact.phoneNumber}
                </p>
                <p className="md:col-span-2">
                  <span className="font-medium">Description:</span> {schoolBoard.description || "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Schools</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{schools.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Schools</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{activeSchools}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Inactive Schools</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{inactiveSchools}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Schools Under This Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {schools.length === 0 ? (
                <p className="text-sm text-muted-foreground">No schools found for this school board.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">State</th>
                        <th className="px-3 py-2 font-medium">Local Government</th>
                        <th className="px-3 py-2 font-medium">District</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((school) => (
                        <tr key={school._id ?? school.id ?? school.name} className="border-t">
                          <td className="px-3 py-2">{school.name}</td>
                          <td className="px-3 py-2">{school.state || "-"}</td>
                          <td className="px-3 py-2">{school.localGovernment || "-"}</td>
                          <td className="px-3 py-2">{school.district || "-"}</td>
                          <td className="px-3 py-2">{school.status || "active"}</td>
                          <td className="px-3 py-2">{school._id ?? school.id ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
