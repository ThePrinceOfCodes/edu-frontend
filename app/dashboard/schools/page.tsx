"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"

import type { Class, School, SchoolBoard, SchoolType } from "@/interfaces/resource-interface"
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

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([])
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [name, setName] = useState("")
  const [schoolBoard, setSchoolBoard] = useState("")
  const [selectedSchoolTypes, setSelectedSchoolTypes] = useState<string[]>([])
  const [address, setAddress] = useState("")
  const [state, setState] = useState("")
  const [localGovernment, setLocalGovernment] = useState("")
  const [district, setDistrict] = useState("")
  const [longitude, setLongitude] = useState("")
  const [latitude, setLatitude] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [isDeactivatingId, setIsDeactivatingId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const activeCount = schools.filter((item) => item.status !== "inactive").length
  const inactiveCount = schools.filter((item) => item.status === "inactive").length
  const independentCount = schools.filter((item) => !item.schoolBoard).length
  const derivedClasses = classes.filter((item) => selectedSchoolTypes.includes(item.schoolTypeId))

  async function loadSchools() {
    setLoadError(null)
    setLoading(true)

    try {
      const [schoolResult, schoolBoardResult, schoolTypeResult, classResult] = await Promise.all([
        resourceService.getSchools(),
        resourceService.getSchoolBoards(),
        resourceService.getSchoolTypes({ limit: 100, page: 1 }),
        resourceService.getClasses({ limit: 100, page: 1 }),
      ])

      setSchools(schoolResult.results)
      setSchoolBoards(schoolBoardResult.results)
      setSchoolTypes(schoolTypeResult.results)
      setClasses(classResult.results)
    } catch (loadError) {
      setLoadError(loadError instanceof Error ? loadError.message : "Unable to load schools.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSchools()
  }, [])

  function getSchoolId(school: School) {
    return school._id ?? school.id ?? ""
  }

  function getBoardNameById(boardId: string | null | undefined) {
    if (!boardId) {
      return "Independent"
    }

    const board = schoolBoards.find((item) => (item._id ?? item.id) === boardId)
    return board?.name ?? boardId
  }

  function getSchoolBoardName(school: School) {
    if (!school.schoolBoard) {
      return "Independent"
    }

    if (typeof school.schoolBoard === "string") {
      return getBoardNameById(school.schoolBoard)
    }

    return school.schoolBoard.name ?? getBoardNameById(school.schoolBoard._id ?? school.schoolBoard.id)
  }

  async function handleDeleteSchool(school: School) {
    const schoolId = getSchoolId(school)
    if (!schoolId) {
      return
    }

    if (!window.confirm(`Delete ${school.name}?`)) {
      return
    }

    try {
      setIsDeletingId(schoolId)
      await resourceService.deleteSchool(schoolId)
      await loadSchools()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to delete school.")
    } finally {
      setIsDeletingId(null)
    }
  }

  async function handleDeactivateSchool(school: School) {
    const schoolId = getSchoolId(school)
    if (!schoolId) {
      return
    }

    if ((school.status ?? "active") === "inactive") {
      return
    }

    if (!window.confirm(`Deactivate ${school.name}?`)) {
      return
    }

    try {
      setIsDeactivatingId(schoolId)
      await resourceService.deactivateSchool(schoolId)
      await loadSchools()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to deactivate school.")
    } finally {
      setIsDeactivatingId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    if (selectedSchoolTypes.length === 0) {
      setSubmitError("Select at least one school type.")
      return
    }

    setIsSubmitting(true)

    try {
      await resourceService.createSchool({
        name,
        schoolBoard: schoolBoard || undefined,
        schoolTypes: selectedSchoolTypes,
        address: address || undefined,
        state: state || undefined,
        localGovernment: localGovernment || undefined,
        district: district || undefined,
        longitude: longitude ? Number(longitude) : undefined,
        latitude: latitude ? Number(latitude) : undefined,
      })

      setName("")
      setSchoolBoard("")
      setSelectedSchoolTypes([])
      setAddress("")
      setState("")
      setLocalGovernment("")
      setDistrict("")
      setLongitude("")
      setLatitude("")
      setIsCreateOpen(false)
      await loadSchools()
    } catch (submitError) {
      setSubmitError(
        submitError instanceof Error ? submitError.message : "Unable to create school."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schools</h2>
        <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <ModalTrigger render={<Button />}>Create School</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Create School</ModalTitle>
              <ModalDescription>Add a school record.</ModalDescription>
            </ModalHeader>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="school-name">Name</Label>
                <Input id="school-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-board">School Board ID (optional)</Label>
                <Input
                  id="school-board"
                  value={schoolBoard}
                  onChange={(event) => setSchoolBoard(event.target.value)}
                  placeholder="Leave blank for independent school"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">Address</Label>
                <Input
                  id="school-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-state">State</Label>
                <Input
                  id="school-state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-lga">Local Government</Label>
                <Input
                  id="school-lga"
                  value={localGovernment}
                  onChange={(event) => setLocalGovernment(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-district">District</Label>
                <Input
                  id="school-district"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="school-longitude">Longitude</Label>
                  <Input
                    id="school-longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-latitude">Latitude</Label>
                  <Input
                    id="school-latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>School Types (select one or more)</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {schoolTypes.map((schoolType) => {
                    const id = schoolType._id ?? schoolType.id ?? schoolType.name
                    const isChecked = selectedSchoolTypes.includes(id)

                    return (
                      <label key={id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedSchoolTypes((current) => [...new Set([...current, id])])
                              return
                            }

                            setSelectedSchoolTypes((current) => current.filter((item) => item !== id))
                          }}
                        />
                        <span>{schoolType.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Derived Classes</Label>
                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  {derivedClasses.length > 0
                    ? derivedClasses.map((item) => `${item.name} (${item.code})`).join(", ")
                    : "Select school type(s) to see classes"}
                </div>
              </div>
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create School"}
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
            <p className="text-2xl font-semibold">{schools.length}</p>
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
            <CardTitle className="text-sm">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{inactiveCount}</p>
            <p className="text-xs text-muted-foreground">Independent: {independentCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schools Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && schools.length === 0 ? (
            <p className="text-sm text-muted-foreground">No schools found.</p>
          ) : null}
          {!loading && schools.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">School Board</th>
                    <th className="px-3 py-2 font-medium">School Types</th>
                    <th className="px-3 py-2 font-medium">Classes</th>
                    <th className="px-3 py-2 font-medium">Address</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">LGA</th>
                    <th className="px-3 py-2 font-medium">District</th>
                    <th className="px-3 py-2 font-medium">Longitude</th>
                    <th className="px-3 py-2 font-medium">Latitude</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((item) => (
                    <tr key={getSchoolId(item) || item.name} className="border-t">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{getSchoolBoardName(item)}</td>
                      <td className="px-3 py-2">{item.schoolTypes?.length ?? 0}</td>
                      <td className="px-3 py-2">{item.classes?.length ?? 0}</td>
                      <td className="px-3 py-2">{item.address || "-"}</td>
                      <td className="px-3 py-2">{item.state || "-"}</td>
                      <td className="px-3 py-2">{item.localGovernment || "-"}</td>
                      <td className="px-3 py-2">{item.district || "-"}</td>
                      <td className="px-3 py-2">{item.longitude ?? "-"}</td>
                      <td className="px-3 py-2">{item.latitude ?? "-"}</td>
                      <td className="px-3 py-2">{item.status || "active"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {getSchoolId(item) ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                nativeButton={false}
                                render={<Link href={`/dashboard/schools/${getSchoolId(item)}`} />}
                              >
                                View
                              </Button>
                            </>
                          ) : null}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDeleteSchool(item)}
                            disabled={isDeletingId === getSchoolId(item)}
                          >
                            {isDeletingId === getSchoolId(item) ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDeactivateSchool(item)}
                            disabled={isDeactivatingId === getSchoolId(item) || (item.status ?? "active") === "inactive"}
                          >
                            {isDeactivatingId === getSchoolId(item) ? "Deactivating..." : "Deactivate"}
                          </Button>
                          {getSchoolId(item) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              nativeButton={false}
                              render={<Link href={`/dashboard/schools/${getSchoolId(item)}?mode=edit`} />}
                            >
                              Edit
                            </Button>
                          ) : null}
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