"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"

import type { Class, School, SchoolBoard, SchoolType } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
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
  const authUser = authService.getStoredUser()
  const canSetSchoolBoard = authUser?.accountType === "internal"

  const [schools, setSchools] = useState<School[]>([])
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([])
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [name, setName] = useState("")
  const [schoolBoard, setSchoolBoard] = useState("")
  const [selectedSchoolTypes, setSelectedSchoolTypes] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [address, setAddress] = useState("")
  const [schoolCode, setSchoolCode] = useState("")
  const [state, setState] = useState("")
  const [localGovernment, setLocalGovernment] = useState("")
  const [district, setDistrict] = useState("")
  const [ward, setWard] = useState("")
  const [schoolLocation, setSchoolLocation] = useState("")
  const [categoryOfSchool, setCategoryOfSchool] = useState("")
  const [accessRoadCondition, setAccessRoadCondition] = useState("")
  const [typeOfSchool, setTypeOfSchool] = useState("")
  const [shiftSystem, setShiftSystem] = useState("")
  const [numberOfClasses, setNumberOfClasses] = useState("")
  const [numberOfClassroomsAvailable, setNumberOfClassroomsAvailable] = useState("")
  const [facilitiesAvailable, setFacilitiesAvailable] = useState("")
  const [headTeacherName, setHeadTeacherName] = useState("")
  const [headTeacherPhoneNumber, setHeadTeacherPhoneNumber] = useState("")
  const [assistantHeadTeacherName, setAssistantHeadTeacherName] = useState("")
  const [assistantHeadTeacherPhoneNumber, setAssistantHeadTeacherPhoneNumber] = useState("")
  const [numberOfAcademicStaff, setNumberOfAcademicStaff] = useState("")
  const [numberOfNonAcademicStaff, setNumberOfNonAcademicStaff] = useState("")
  const [totalEnrolledStudents, setTotalEnrolledStudents] = useState("")
  const [gallery, setGallery] = useState("")
  const [longitude, setLongitude] = useState("")
  const [latitude, setLatitude] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [isDeactivatingId, setIsDeactivatingId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)

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
        resourceService.getSchoolTypes({ limit: 1000, page: 1 }),
        resourceService.getClasses({ limit: 1000, page: 1 }),
      ])

      setSchools(schoolResult.results || [])
      setSchoolBoards(schoolBoardResult.results || [])
      setSchoolTypes(schoolTypeResult.results || [])
      setClasses(classResult.results || [])
    } catch (loadError) {
      const errorMsg = loadError instanceof Error ? loadError.message : "Unable to load schools."
      setLoadError(errorMsg)
      console.error("Error loading schools:", errorMsg, loadError)
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

    if (selectedClasses.length === 0) {
      setSubmitError("Select at least one class.")
      return
    }

    setIsSubmitting(true)

    try {
      await resourceService.createSchool({
        name,
        schoolBoard: canSetSchoolBoard && schoolBoard ? schoolBoard : undefined,
        schoolTypes: selectedSchoolTypes,
        classes: selectedClasses.length > 0 ? selectedClasses : undefined,
        address: address || undefined,
        schoolCode: schoolCode || undefined,
        state: state || undefined,
        localGovernment: localGovernment || undefined,
        district: district || undefined,
        ward: ward || undefined,
        schoolLocation: schoolLocation || undefined,
        categoryOfSchool: categoryOfSchool || undefined,
        accessRoadCondition: accessRoadCondition || undefined,
        typeOfSchool: typeOfSchool || undefined,
        shiftSystem: shiftSystem || undefined,
        numberOfClasses: numberOfClasses ? Number(numberOfClasses) : undefined,
        numberOfClassroomsAvailable: numberOfClassroomsAvailable ? Number(numberOfClassroomsAvailable) : undefined,
        facilitiesAvailable: facilitiesAvailable || undefined,
        headTeacherName: headTeacherName || undefined,
        headTeacherPhoneNumber: headTeacherPhoneNumber || undefined,
        assistantHeadTeacherName: assistantHeadTeacherName || undefined,
        assistantHeadTeacherPhoneNumber: assistantHeadTeacherPhoneNumber || undefined,
        numberOfAcademicStaff: numberOfAcademicStaff ? Number(numberOfAcademicStaff) : undefined,
        numberOfNonAcademicStaff: numberOfNonAcademicStaff ? Number(numberOfNonAcademicStaff) : undefined,
        totalEnrolledStudents: totalEnrolledStudents ? Number(totalEnrolledStudents) : undefined,
        gallery: gallery || undefined,
        longitude: longitude ? Number(longitude) : undefined,
        latitude: latitude ? Number(latitude) : undefined,
      })

      setName("")
      setSchoolBoard("")
      setSelectedSchoolTypes([])
      setSelectedClasses([])
      setAddress("")
      setSchoolCode("")
      setState("")
      setLocalGovernment("")
      setDistrict("")
      setWard("")
      setSchoolLocation("")
      setCategoryOfSchool("")
      setAccessRoadCondition("")
      setTypeOfSchool("")
      setShiftSystem("")
      setNumberOfClasses("")
      setNumberOfClassroomsAvailable("")
      setFacilitiesAvailable("")
      setHeadTeacherName("")
      setHeadTeacherPhoneNumber("")
      setAssistantHeadTeacherName("")
      setAssistantHeadTeacherPhoneNumber("")
      setNumberOfAcademicStaff("")
      setNumberOfNonAcademicStaff("")
      setTotalEnrolledStudents("")
      setGallery("")
      setLongitude("")
      setLatitude("")
      setIsCreateOpen(false)
      setCreateStep(1)
      await loadSchools()
    } catch (submitError) {
      setSubmitError(
        submitError instanceof Error ? submitError.message : "Unable to create school."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSchoolTypeChange(nextSchoolTypeIds: string[]) {
    setSelectedSchoolTypes(nextSchoolTypeIds)

    const autoSelectedClasses = classes
      .filter((item) => nextSchoolTypeIds.includes(item.schoolTypeId))
      .map((item) => item._id ?? item.id ?? "")
      .filter(Boolean)

    setSelectedClasses([...new Set(autoSelectedClasses)])
  }

  function handleCreateOpenChange(open: boolean) {
    setIsCreateOpen(open)

    if (!open) {
      setCreateStep(1)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schools</h2>
        <Modal open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
          <ModalTrigger render={<Button />}>Create School</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Create School</ModalTitle>
              <ModalDescription>Add a school record.</ModalDescription>
            </ModalHeader>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <p className="text-xs text-muted-foreground">Step {createStep} of 2</p>

              {createStep === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="school-name">Name</Label>
                    <Input id="school-name" value={name} onChange={(event) => setName(event.target.value)} required />
                  </div>
                  {canSetSchoolBoard ? (
                    <div className="space-y-2">
                      <Label htmlFor="school-board">School Board ID (optional)</Label>
                      <Input
                        id="school-board"
                        value={schoolBoard}
                        onChange={(event) => setSchoolBoard(event.target.value)}
                        placeholder="Leave blank for independent school"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      School board is automatically set from your account.
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="school-address">Address</Label>
                    <Input
                      id="school-address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-code">School Code</Label>
                    <Input
                      id="school-code"
                      value={schoolCode}
                      onChange={(event) => setSchoolCode(event.target.value)}
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
                      <Label htmlFor="school-ward">Ward</Label>
                      <Input
                        id="school-ward"
                        value={ward}
                        onChange={(event) => setWard(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-location">School Location</Label>
                      <Input
                        id="school-location"
                        value={schoolLocation}
                        onChange={(event) => setSchoolLocation(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="school-category">Category of School</Label>
                      <Input
                        id="school-category"
                        value={categoryOfSchool}
                        onChange={(event) => setCategoryOfSchool(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-road-condition">Access Road Condition</Label>
                      <Input
                        id="school-road-condition"
                        value={accessRoadCondition}
                        onChange={(event) => setAccessRoadCondition(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="school-type-text">Type of School</Label>
                      <Input
                        id="school-type-text"
                        value={typeOfSchool}
                        onChange={(event) => setTypeOfSchool(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-shift-system">Shift System</Label>
                      <Input
                        id="school-shift-system"
                        value={shiftSystem}
                        onChange={(event) => setShiftSystem(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="school-number-of-classes">Number of Classes</Label>
                      <Input
                        id="school-number-of-classes"
                        type="number"
                        min="0"
                        value={numberOfClasses}
                        onChange={(event) => setNumberOfClasses(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-number-of-classrooms">Number of Classrooms Available</Label>
                      <Input
                        id="school-number-of-classrooms"
                        type="number"
                        min="0"
                        value={numberOfClassroomsAvailable}
                        onChange={(event) => setNumberOfClassroomsAvailable(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-facilities-available">Facilities Available</Label>
                    <Input
                      id="school-facilities-available"
                      value={facilitiesAvailable}
                      onChange={(event) => setFacilitiesAvailable(event.target.value)}
                      placeholder="e.g labs, computers, library"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="school-head-teacher-name">Head Teacher Name</Label>
                      <Input
                        id="school-head-teacher-name"
                        value={headTeacherName}
                        onChange={(event) => setHeadTeacherName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-head-teacher-phone">Head Teacher Phone</Label>
                      <Input
                        id="school-head-teacher-phone"
                        value={headTeacherPhoneNumber}
                        onChange={(event) => setHeadTeacherPhoneNumber(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="school-assistant-head-teacher-name">Asst. Head Teacher Name</Label>
                      <Input
                        id="school-assistant-head-teacher-name"
                        value={assistantHeadTeacherName}
                        onChange={(event) => setAssistantHeadTeacherName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-assistant-head-teacher-phone">Asst. Head Teacher Phone</Label>
                      <Input
                        id="school-assistant-head-teacher-phone"
                        value={assistantHeadTeacherPhoneNumber}
                        onChange={(event) => setAssistantHeadTeacherPhoneNumber(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="school-academic-staff-count">No. of Academic Staff</Label>
                      <Input
                        id="school-academic-staff-count"
                        type="number"
                        min="0"
                        value={numberOfAcademicStaff}
                        onChange={(event) => setNumberOfAcademicStaff(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-non-academic-staff-count">No. of Non-Academic Staff</Label>
                      <Input
                        id="school-non-academic-staff-count"
                        type="number"
                        min="0"
                        value={numberOfNonAcademicStaff}
                        onChange={(event) => setNumberOfNonAcademicStaff(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-total-enrolled-students">Total Enrolled Students</Label>
                      <Input
                        id="school-total-enrolled-students"
                        type="number"
                        min="0"
                        value={totalEnrolledStudents}
                        onChange={(event) => setTotalEnrolledStudents(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-gallery">Gallery</Label>
                    <Input
                      id="school-gallery"
                      value={gallery}
                      onChange={(event) => setGallery(event.target.value)}
                      placeholder="Image URL or reference"
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

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!name.trim()) {
                          setSubmitError("School name is required.")
                          return
                        }
                        setSubmitError(null)
                        setCreateStep(2)
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="school-types">School Types (select one or more)</Label>
                    {schoolTypes.length === 0 && !loading ? (
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                        <p className="font-medium">No school types available</p>
                        <p className="text-xs mt-1">Please create school types before creating a school.</p>
                      </div>
                    ) : (
                      <select
                        id="school-types"
                        multiple
                        value={selectedSchoolTypes}
                        onChange={(event) => {
                          const selected = Array.from(event.target.selectedOptions, (option) => option.value)
                          handleSchoolTypeChange(selected)
                        }}
                        className="h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                        disabled={schoolTypes.length === 0}
                      >
                        {schoolTypes.map((schoolType) => {
                          const id = schoolType._id ?? schoolType.id ?? schoolType.name
                          return (
                            <option key={id} value={id}>
                              {schoolType.name}
                            </option>
                          )
                        })}
                      </select>
                    )}
                    <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Classes (auto-selected, click X to remove)</Label>
                    <div className="rounded-md border p-3">
                      {derivedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {derivedClasses.map((classItem) => {
                            const classId = classItem._id ?? classItem.id ?? ""
                            const isSelected = selectedClasses.includes(classId)

                            return (
                              <div
                                key={classId}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                }`}
                              >
                                <span>
                                  {classItem.name} ({classItem.code})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClasses((current) =>
                                      current.includes(classId)
                                        ? current.filter((id) => id !== classId)
                                        : [...current, classId]
                                    )
                                  }}
                                  className="flex items-center justify-center rounded-full text-xs font-bold hover:opacity-70"
                                  title="Toggle class"
                                >
                                  {isSelected ? "✕" : "+"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Select school type(s) to see available classes</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting || selectedClasses.length === 0}>
                      {isSubmitting ? "Creating..." : "Create School"}
                    </Button>
                  </div>
                </>
              )}

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
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