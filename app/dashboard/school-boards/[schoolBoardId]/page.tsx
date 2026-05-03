"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import * as XLSX from "xlsx"

import type { BulkCreateSchoolInput, BulkImportSchoolsResult, School, SchoolBoard } from "@/interfaces/resource-interface"
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
    return { name: "-", email: "-", phoneNumber: "-" }
  }

  return {
    name: board.superAdminUser.name ?? "-",
    email: board.superAdminUser.email ?? "-",
    phoneNumber: board.superAdminUser.phoneNumber ?? "-",
  }
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseText(value: unknown) {
  if (value === null || value === undefined) {
    return undefined
  }

  const trimmed = String(value).trim()
  return trimmed || undefined
}

function normalizeHeaderKey(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "")
}

function getRowValue(row: Record<string, unknown>, keys: string[]) {
  const rowEntries = Object.entries(row)

  for (const key of keys) {
    const expected = normalizeHeaderKey(key)
    const match = rowEntries.find(([entryKey]) => normalizeHeaderKey(entryKey) === expected)
    if (match) {
      return match[1]
    }
  }

  return undefined
}

function toBulkSchoolPayload(row: Record<string, unknown>, schoolBoardId: string): BulkCreateSchoolInput | null {
  const nameValue = getRowValue(row, ["name", "school name"])
  const name = typeof nameValue === "string" ? nameValue.trim() : ""

  if (!name) {
    return null
  }

  const statusValue = String(getRowValue(row, ["status"]) ?? "").trim().toLowerCase()
  const status = statusValue === "inactive" ? "inactive" : statusValue === "active" ? "active" : undefined

  return {
    name,
    schoolBoard: schoolBoardId,
    address: parseText(getRowValue(row, ["address", "school address"])),
    schoolCode: parseText(getRowValue(row, ["school code", "code"])),
    state: parseText(getRowValue(row, ["state"])),
    localGovernment: parseText(getRowValue(row, ["localGovernment", "local government", "lga"])),
    district: parseText(getRowValue(row, ["district"])),
    ward: parseText(getRowValue(row, ["ward"])),
    schoolLocation: parseText(getRowValue(row, ["school location", "location"])),
    categoryOfSchool: parseText(getRowValue(row, ["category of school", "school category"])),
    accessRoadCondition: parseText(getRowValue(row, ["access road condition", "road condition"])),
    typeOfSchool: parseText(getRowValue(row, ["type of school", "school type"])),
    shiftSystem: parseText(getRowValue(row, ["shift system", "shieft system"])),
    facilitiesAvailable: parseText(
      getRowValue(row, [
        "facilities available",
        "facilities available (e.g labs, computers, library, staff room, etc)",
      ])
    ),
    headTeacherName: parseText(getRowValue(row, ["name of head teacher", "head teacher name"])),
    headTeacherPhoneNumber: parseText(
      getRowValue(row, ["phone number of head teacher", "head teacher phone number"])
    ),
    assistantHeadTeacherName: parseText(
      getRowValue(row, ["name of asst head teacher", "name of asst. head teacher", "assistant head teacher name"])
    ),
    assistantHeadTeacherPhoneNumber: parseText(
      getRowValue(row, [
        "phone number of asst head teacher",
        "phone number of asst. head teacher",
        "assistant head teacher phone number",
      ])
    ),
    longitude: parseNumber(getRowValue(row, ["longitude", "long", "longitue"])),
    latitude: parseNumber(getRowValue(row, ["latitude", "lat", "latiude"])),
    numberOfClasses: parseNumber(getRowValue(row, ["number of classes"])),
    numberOfClassroomsAvailable: parseNumber(getRowValue(row, ["number of classrooms available"])),
    numberOfAcademicStaff: parseNumber(getRowValue(row, ["number of academic staff", "number of accademic staff"])),
    numberOfNonAcademicStaff: parseNumber(
      getRowValue(row, ["number of non academic staff", "number of non accademic staff"])
    ),
    totalEnrolledStudents: parseNumber(
      getRowValue(row, ["what is the total number of students currently enrolled in the school", "total enrolled students"])
    ),
    gallery: parseText(getRowValue(row, ["gallery", "gallary"])),
    status,
  }
}

export default function SchoolBoardViewPage() {
  const params = useParams<{ schoolBoardId: string }>()
  const schoolBoardId = typeof params.schoolBoardId === "string" ? params.schoolBoardId : ""

  const [schoolBoard, setSchoolBoard] = useState<SchoolBoard | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createAddress, setCreateAddress] = useState("")
  const [createSchoolCode, setCreateSchoolCode] = useState("")
  const [createState, setCreateState] = useState("")
  const [createLocalGovernment, setCreateLocalGovernment] = useState("")
  const [createDistrict, setCreateDistrict] = useState("")
  const [createWard, setCreateWard] = useState("")
  const [createSchoolLocation, setCreateSchoolLocation] = useState("")
  const [createCategoryOfSchool, setCreateCategoryOfSchool] = useState("")
  const [createAccessRoadCondition, setCreateAccessRoadCondition] = useState("")
  const [createTypeOfSchool, setCreateTypeOfSchool] = useState("")
  const [createShiftSystem, setCreateShiftSystem] = useState("")
  const [createNumberOfClasses, setCreateNumberOfClasses] = useState("")
  const [createNumberOfClassroomsAvailable, setCreateNumberOfClassroomsAvailable] = useState("")
  const [createFacilitiesAvailable, setCreateFacilitiesAvailable] = useState("")
  const [createHeadTeacherName, setCreateHeadTeacherName] = useState("")
  const [createHeadTeacherPhoneNumber, setCreateHeadTeacherPhoneNumber] = useState("")
  const [createAssistantHeadTeacherName, setCreateAssistantHeadTeacherName] = useState("")
  const [createAssistantHeadTeacherPhoneNumber, setCreateAssistantHeadTeacherPhoneNumber] = useState("")
  const [createNumberOfAcademicStaff, setCreateNumberOfAcademicStaff] = useState("")
  const [createNumberOfNonAcademicStaff, setCreateNumberOfNonAcademicStaff] = useState("")
  const [createTotalEnrolledStudents, setCreateTotalEnrolledStudents] = useState("")
  const [createGallery, setCreateGallery] = useState("")
  const [createLongitude, setCreateLongitude] = useState("")
  const [createLatitude, setCreateLatitude] = useState("")
  const [createStatus, setCreateStatus] = useState<"active" | "inactive">("active")
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportSchoolsResult | null>(null)
  const importFileRef = useRef<HTMLInputElement | null>(null)

  async function loadData() {
    if (!schoolBoardId) {
      setError("Invalid school board identifier.")
      setLoading(false)
      return
    }

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

  useEffect(() => {
    void loadData()
  }, [schoolBoardId])

  async function handleCreateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setIsCreating(true)

    try {
      await resourceService.createSchool({
        name: createName,
        schoolBoard: schoolBoardId,
        address: createAddress || undefined,
        schoolCode: createSchoolCode || undefined,
        state: createState || undefined,
        localGovernment: createLocalGovernment || undefined,
        district: createDistrict || undefined,
        ward: createWard || undefined,
        schoolLocation: createSchoolLocation || undefined,
        categoryOfSchool: createCategoryOfSchool || undefined,
        accessRoadCondition: createAccessRoadCondition || undefined,
        typeOfSchool: createTypeOfSchool || undefined,
        shiftSystem: createShiftSystem || undefined,
        numberOfClasses: createNumberOfClasses ? Number(createNumberOfClasses) : undefined,
        numberOfClassroomsAvailable: createNumberOfClassroomsAvailable
          ? Number(createNumberOfClassroomsAvailable)
          : undefined,
        facilitiesAvailable: createFacilitiesAvailable || undefined,
        headTeacherName: createHeadTeacherName || undefined,
        headTeacherPhoneNumber: createHeadTeacherPhoneNumber || undefined,
        assistantHeadTeacherName: createAssistantHeadTeacherName || undefined,
        assistantHeadTeacherPhoneNumber: createAssistantHeadTeacherPhoneNumber || undefined,
        numberOfAcademicStaff: createNumberOfAcademicStaff ? Number(createNumberOfAcademicStaff) : undefined,
        numberOfNonAcademicStaff: createNumberOfNonAcademicStaff ? Number(createNumberOfNonAcademicStaff) : undefined,
        totalEnrolledStudents: createTotalEnrolledStudents ? Number(createTotalEnrolledStudents) : undefined,
        gallery: createGallery || undefined,
        longitude: createLongitude ? Number(createLongitude) : undefined,
        latitude: createLatitude ? Number(createLatitude) : undefined,
        status: createStatus,
      })

      setCreateName("")
      setCreateAddress("")
      setCreateSchoolCode("")
      setCreateState("")
      setCreateLocalGovernment("")
      setCreateDistrict("")
      setCreateWard("")
      setCreateSchoolLocation("")
      setCreateCategoryOfSchool("")
      setCreateAccessRoadCondition("")
      setCreateTypeOfSchool("")
      setCreateShiftSystem("")
      setCreateNumberOfClasses("")
      setCreateNumberOfClassroomsAvailable("")
      setCreateFacilitiesAvailable("")
      setCreateHeadTeacherName("")
      setCreateHeadTeacherPhoneNumber("")
      setCreateAssistantHeadTeacherName("")
      setCreateAssistantHeadTeacherPhoneNumber("")
      setCreateNumberOfAcademicStaff("")
      setCreateNumberOfNonAcademicStaff("")
      setCreateTotalEnrolledStudents("")
      setCreateGallery("")
      setCreateLongitude("")
      setCreateLatitude("")
      setCreateStatus("active")
      setIsCreateOpen(false)
      await loadData()
    } catch (submitError) {
      setCreateError(submitError instanceof Error ? submitError.message : "Unable to create school.")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleImportSchools(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setImportError(null)
    setImportResult(null)

    const file = importFileRef.current?.files?.[0]
    if (!file) {
      setImportError("Choose a CSV or Excel file first.")
      return
    }

    setIsImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]

      if (!firstSheetName) {
        throw new Error("No worksheet found in file.")
      }

      const sheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

      const schoolsPayload = rows
        .map((row) => toBulkSchoolPayload(row, schoolBoardId))
        .filter((item): item is BulkCreateSchoolInput => item !== null)

      if (schoolsPayload.length === 0) {
        setImportError("No valid rows found. Ensure a 'name' column exists and has values.")
        return
      }

      const result = await resourceService.bulkCreateSchools({ schools: schoolsPayload })
      setImportResult(result)

      if (importFileRef.current) {
        importFileRef.current.value = ""
      }

      await loadData()
    } catch (bulkError) {
      setImportError(bulkError instanceof Error ? bulkError.message : "Unable to import schools.")
    } finally {
      setIsImporting(false)
    }
  }

  const contact = useMemo(() => getContactInfo(schoolBoard), [schoolBoard])
  const activeSchools = schools.filter((school) => school.status !== "inactive").length
  const inactiveSchools = schools.filter((school) => school.status === "inactive").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">School Board View</h2>
        <div className="flex items-center gap-2">
          <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ModalTrigger render={<Button />}>Create School</ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Create School</ModalTitle>
                <ModalDescription>Add a school under this school board.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleCreateSchool}>
                <div className="space-y-2">
                  <Label htmlFor="create-school-name">Name</Label>
                  <Input
                    id="create-school-name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-school-address">Address</Label>
                  <Input
                    id="create-school-address"
                    value={createAddress}
                    onChange={(event) => setCreateAddress(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-school-code">School Code</Label>
                  <Input
                    id="create-school-code"
                    value={createSchoolCode}
                    onChange={(event) => setCreateSchoolCode(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-state">State</Label>
                    <Input
                      id="create-school-state"
                      value={createState}
                      onChange={(event) => setCreateState(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-lga">Local Government</Label>
                    <Input
                      id="create-school-lga"
                      value={createLocalGovernment}
                      onChange={(event) => setCreateLocalGovernment(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-ward">Ward</Label>
                    <Input
                      id="create-school-ward"
                      value={createWard}
                      onChange={(event) => setCreateWard(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-location">School Location</Label>
                    <Input
                      id="create-school-location"
                      value={createSchoolLocation}
                      onChange={(event) => setCreateSchoolLocation(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-category">Category of School</Label>
                    <Input
                      id="create-school-category"
                      value={createCategoryOfSchool}
                      onChange={(event) => setCreateCategoryOfSchool(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-road">Access Road Condition</Label>
                    <Input
                      id="create-school-road"
                      value={createAccessRoadCondition}
                      onChange={(event) => setCreateAccessRoadCondition(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-type">Type of School</Label>
                    <Input
                      id="create-school-type"
                      value={createTypeOfSchool}
                      onChange={(event) => setCreateTypeOfSchool(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-shift">Shift System</Label>
                    <Input
                      id="create-school-shift"
                      value={createShiftSystem}
                      onChange={(event) => setCreateShiftSystem(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-classes">Number of Classes</Label>
                    <Input
                      id="create-school-classes"
                      type="number"
                      min="0"
                      value={createNumberOfClasses}
                      onChange={(event) => setCreateNumberOfClasses(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-classrooms">Number of Classrooms Available</Label>
                    <Input
                      id="create-school-classrooms"
                      type="number"
                      min="0"
                      value={createNumberOfClassroomsAvailable}
                      onChange={(event) => setCreateNumberOfClassroomsAvailable(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-school-facilities">Facilities Available</Label>
                  <Input
                    id="create-school-facilities"
                    value={createFacilitiesAvailable}
                    onChange={(event) => setCreateFacilitiesAvailable(event.target.value)}
                    placeholder="e.g labs, computers, library"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-head-teacher-name">Head Teacher Name</Label>
                    <Input
                      id="create-head-teacher-name"
                      value={createHeadTeacherName}
                      onChange={(event) => setCreateHeadTeacherName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-head-teacher-phone">Head Teacher Phone</Label>
                    <Input
                      id="create-head-teacher-phone"
                      value={createHeadTeacherPhoneNumber}
                      onChange={(event) => setCreateHeadTeacherPhoneNumber(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-assistant-head-teacher-name">Asst. Head Teacher Name</Label>
                    <Input
                      id="create-assistant-head-teacher-name"
                      value={createAssistantHeadTeacherName}
                      onChange={(event) => setCreateAssistantHeadTeacherName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-assistant-head-teacher-phone">Asst. Head Teacher Phone</Label>
                    <Input
                      id="create-assistant-head-teacher-phone"
                      value={createAssistantHeadTeacherPhoneNumber}
                      onChange={(event) => setCreateAssistantHeadTeacherPhoneNumber(event.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-academic-staff">No. of Academic Staff</Label>
                    <Input
                      id="create-academic-staff"
                      type="number"
                      min="0"
                      value={createNumberOfAcademicStaff}
                      onChange={(event) => setCreateNumberOfAcademicStaff(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-non-academic-staff">No. of Non-Academic Staff</Label>
                    <Input
                      id="create-non-academic-staff"
                      type="number"
                      min="0"
                      value={createNumberOfNonAcademicStaff}
                      onChange={(event) => setCreateNumberOfNonAcademicStaff(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-total-students">Total Enrolled Students</Label>
                    <Input
                      id="create-total-students"
                      type="number"
                      min="0"
                      value={createTotalEnrolledStudents}
                      onChange={(event) => setCreateTotalEnrolledStudents(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-school-gallery">Gallery</Label>
                  <Input
                    id="create-school-gallery"
                    value={createGallery}
                    onChange={(event) => setCreateGallery(event.target.value)}
                    placeholder="Image URL or reference"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-district">District</Label>
                    <Input
                      id="create-school-district"
                      value={createDistrict}
                      onChange={(event) => setCreateDistrict(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-status">Status</Label>
                    <select
                      id="create-school-status"
                      className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={createStatus}
                      onChange={(event) => setCreateStatus(event.target.value as "active" | "inactive")}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-school-longitude">Longitude</Label>
                    <Input
                      id="create-school-longitude"
                      type="number"
                      step="any"
                      value={createLongitude}
                      onChange={(event) => setCreateLongitude(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-school-latitude">Latitude</Label>
                    <Input
                      id="create-school-latitude"
                      type="number"
                      step="any"
                      value={createLatitude}
                      onChange={(event) => setCreateLatitude(event.target.value)}
                    />
                  </div>
                </div>

                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create School"}
                </Button>
              </form>
            </ModalContent>
          </Modal>

          <Modal open={isImportOpen} onOpenChange={setIsImportOpen}>
            <ModalTrigger render={<Button variant="outline" />}>Import CSV/Excel</ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Import Schools</ModalTitle>
                <ModalDescription>Upload a CSV or Excel file to create multiple schools.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleImportSchools}>
                <div className="space-y-2">
                  <Label htmlFor="import-schools-file">File</Label>
                  <Input id="import-schools-file" ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" required />
                </div>
                <p className="text-xs text-muted-foreground">
                  Expected columns include: School Name, School Address, School Code, Latiude, Longitue, LGA, District,
                  Ward, School Location, Category of school, Access Road Condition, Type of school, Shieft System,
                  Number of Classes, Number of Classrooms Available, Facilities Available, Name/Phone of Head teacher,
                  Name/Phone of Asst. Head teacher, Number of Accademic/Non Accademic Staff, total enrolled students,
                  GALLARY.
                </p>

                {importError ? <p className="text-sm text-destructive">{importError}</p> : null}

                {importResult ? (
                  <div className="rounded-md border p-3 text-sm">
                    <p>Total: {importResult.total}</p>
                    <p>Created: {importResult.createdCount}</p>
                    <p>Failed: {importResult.failedCount}</p>
                  </div>
                ) : null}

                <Button type="submit" disabled={isImporting}>
                  {isImporting ? "Importing..." : "Import Schools"}
                </Button>
              </form>
            </ModalContent>
          </Modal>

          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/school-boards" />}>
            Back to School Boards
          </Button>
        </div>
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
