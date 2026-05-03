"use client"

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { MoreHorizontal } from "lucide-react"

import type {
  AuthUser,
  BulkCreateSchoolInput,
  BulkImportSchoolsResult,
  Class,
  School,
  SchoolBoard,
  SchoolType,
} from "@/interfaces/resource-interface"
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

function parseImportNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseImportText(value: unknown) {
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
    address: parseImportText(getRowValue(row, ["address", "school address"])),
    schoolCode: parseImportText(getRowValue(row, ["school code", "code"])),
    state: parseImportText(getRowValue(row, ["state"])),
    localGovernment: parseImportText(getRowValue(row, ["localGovernment", "local government", "lga"])),
    district: parseImportText(getRowValue(row, ["district"])),
    ward: parseImportText(getRowValue(row, ["ward"])),
    schoolLocation: parseImportText(getRowValue(row, ["school location", "location"])),
    categoryOfSchool: parseImportText(getRowValue(row, ["category of school", "school category"])),
    accessRoadCondition: parseImportText(getRowValue(row, ["access road condition", "road condition"])),
    typeOfSchool: parseImportText(getRowValue(row, ["type of school", "school type"])),
    shiftSystem: parseImportText(getRowValue(row, ["shift system", "shieft system"])),
    facilitiesAvailable: parseImportText(
      getRowValue(row, [
        "facilities available",
        "facilities available (e.g labs, computers, library, staff room, etc)",
      ])
    ),
    headTeacherName: parseImportText(getRowValue(row, ["name of head teacher", "head teacher name"])),
    headTeacherPhoneNumber: parseImportText(
      getRowValue(row, ["phone number of head teacher", "head teacher phone number"])
    ),
    assistantHeadTeacherName: parseImportText(
      getRowValue(row, ["name of asst head teacher", "name of asst. head teacher", "assistant head teacher name"])
    ),
    assistantHeadTeacherPhoneNumber: parseImportText(
      getRowValue(row, [
        "phone number of asst head teacher",
        "phone number of asst. head teacher",
        "assistant head teacher phone number",
      ])
    ),
    longitude: parseImportNumber(getRowValue(row, ["longitude", "long", "longitue"])),
    latitude: parseImportNumber(getRowValue(row, ["latitude", "lat", "latiude"])),
    numberOfClasses: parseImportNumber(getRowValue(row, ["number of classes"])),
    numberOfClassroomsAvailable: parseImportNumber(getRowValue(row, ["number of classrooms available"])),
    numberOfAcademicStaff: parseImportNumber(getRowValue(row, ["number of academic staff", "number of accademic staff"])),
    numberOfNonAcademicStaff: parseImportNumber(
      getRowValue(row, ["number of non academic staff", "number of non accademic staff"])
    ),
    totalEnrolledStudents: parseImportNumber(
      getRowValue(row, ["what is the total number of students currently enrolled in the school", "total enrolled students"])
    ),
    gallery: parseImportText(getRowValue(row, ["gallery", "gallary"])),
    status,
  }
}

export default function SchoolsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const canSetSchoolBoard = authUser?.accountType === "internal"
  const canImportSchools = authUser?.role === "school-board-admin"
  const actorSchoolBoardId = authUser?.schoolBoardId ?? ""

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
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<BulkImportSchoolsResult | null>(null)
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null)
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0, openUp: true })
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
  const importFileRef = useRef<HTMLInputElement | null>(null)

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
    setAuthUser(authService.getStoredUser())
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    void loadSchools()
  }, [])

  useEffect(() => {
    if (!openActionMenuFor) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (actionMenuRef.current?.contains(target)) {
        return
      }

      const trigger = document.querySelector(`[data-action-menu-key="${openActionMenuFor}"]`)
      if (trigger instanceof HTMLElement && trigger.contains(target)) {
        return
      }

      setOpenActionMenuFor(null)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionMenuFor(null)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [openActionMenuFor])

  function getSchoolId(school: School) {
    return school._id ?? school.id ?? ""
  }

  function getActionKey(school: School) {
    return getSchoolId(school) || school.name
  }

  function toggleActionMenu(school: School, event: MouseEvent<HTMLButtonElement>) {
    const actionKey = getActionKey(school)

    if (openActionMenuFor === actionKey) {
      setOpenActionMenuFor(null)
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 144
    const menuHeight = 172
    const viewportPadding = 8
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight

    const left = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding
    )
    const top = openUp ? rect.top - 4 : rect.bottom + 4

    setActionMenuPosition({ top, left, openUp })
    setOpenActionMenuFor(actionKey)
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
    setOpenActionMenuFor(null)
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
    setOpenActionMenuFor(null)
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

  function downloadImportTemplate() {
    const headers = [
      "School Name",
      "School Address",
      "School Code",
      "Latiude",
      "Longitue",
      "LGA",
      "District",
      "Ward",
      "School Location",
      "Category of school",
      "Access Road Condition",
      "Type of school",
      "Shieft System",
      "Number of Classes",
      "Number of Classrooms Available",
      "Facilities Available (e.g labs, computers, Library, staff room,  etc)",
      "Name of Head teacher",
      "Phone number of Head teacher",
      "Name of Asst. Head teacher",
      "Phone number of Asst. Head teacher",
      "Number of Accademic Staff",
      "Number of Non Accademic Staff",
      "What is the total number of students currently enrolled in the school?",
      "GALLARY",
    ]

    const sampleRow = [
      "Springfield Primary School",
      "12 Unity Road, Central Ward",
      "SPS-001",
      "9.0765",
      "7.3986",
      "Municipal LGA",
      "Central District",
      "Ward 3",
      "Urban",
      "Public",
      "Tarred",
      "Primary",
      "Single",
      "24",
      "20",
      "Library, Computer Lab, Staff Room",
      "Amina Yusuf",
      "08030000001",
      "Bello Musa",
      "08030000002",
      "32",
      "12",
      "840",
      "https://example.com/school-gallery",
    ]

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([headers, sampleRow])
    XLSX.utils.book_append_sheet(workbook, sheet, "Schools Information")
    XLSX.writeFile(workbook, "school-import-template.xlsx")
  }

  async function handleImportSchools(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setImportError(null)
    setImportResult(null)

    if (!actorSchoolBoardId) {
      setImportError("School board context is missing for your account.")
      return
    }

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
        .map((row) => toBulkSchoolPayload(row, actorSchoolBoardId))
        .filter((item): item is BulkCreateSchoolInput => item !== null)

      if (schoolsPayload.length === 0) {
        setImportError("No valid rows found. Ensure a 'name' or 'School Name' column exists and has values.")
        return
      }

      const result = await resourceService.bulkCreateSchools({ schools: schoolsPayload })
      setImportResult(result)

      if (importFileRef.current) {
        importFileRef.current.value = ""
      }

      await loadSchools()
    } catch (bulkError) {
      setImportError(bulkError instanceof Error ? bulkError.message : "Unable to import schools.")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schools</h2>
        <div className="flex items-center gap-2">
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

          {hasHydrated && canImportSchools ? (
            <>
              <Button type="button" variant="outline" onClick={downloadImportTemplate}>
                Download Template
              </Button>

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
                      Expected columns include: School Name, School Address, School Code, Latiude, Longitue, LGA,
                      District, Ward, School Location, Category of school, Access Road Condition, Type of school,
                      Shieft System, Number of Classes, Number of Classrooms Available, Facilities Available,
                      Name/Phone of Head teacher, Name/Phone of Asst. Head teacher, Number of Accademic/Non Accademic
                      Staff, total enrolled students, GALLARY.
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
            </>
          ) : null}
        </div>
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
            <div className="rounded-md border">
              <div className="overflow-x-auto">
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
                      <td className="relative z-10 px-3 py-2">
                        <div className="relative inline-block">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Open actions"
                            data-action-menu-key={getActionKey(item)}
                            onClick={(event) => toggleActionMenu(item, event)}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                          {openActionMenuFor === getActionKey(item) ? (
                            <div
                              ref={actionMenuRef}
                              className="fixed z-50 w-36 rounded-md border bg-popover p-1 shadow-md"
                              style={{
                                top: actionMenuPosition.top,
                                left: actionMenuPosition.left,
                                transform: actionMenuPosition.openUp ? "translateY(-100%)" : undefined,
                              }}
                            >
                              {getSchoolId(item) ? (
                                <Link
                                  href={`/dashboard/schools/${getSchoolId(item)}`}
                                  className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                  onClick={() => setOpenActionMenuFor(null)}
                                >
                                  View
                                </Link>
                              ) : null}
                              {getSchoolId(item) ? (
                                <Link
                                  href={`/dashboard/schools/${getSchoolId(item)}?mode=edit`}
                                  className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                  onClick={() => setOpenActionMenuFor(null)}
                                >
                                  Edit
                                </Link>
                              ) : null}
                              <button
                                type="button"
                                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
                                onClick={() => void handleDeactivateSchool(item)}
                                disabled={isDeactivatingId === getSchoolId(item) || (item.status ?? "active") === "inactive"}
                              >
                                {isDeactivatingId === getSchoolId(item) ? "Deactivating..." : "Deactivate"}
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-accent disabled:opacity-50"
                                onClick={() => void handleDeleteSchool(item)}
                                disabled={isDeletingId === getSchoolId(item)}
                              >
                                {isDeletingId === getSchoolId(item) ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
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