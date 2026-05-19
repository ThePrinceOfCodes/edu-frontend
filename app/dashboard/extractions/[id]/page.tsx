"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { AttendantExtraction, Class, School, Term } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"

type WeekKey = "week_1" | "week_2" | "week_3" | "week_4" | "week_5"
type WeekState = "present" | "absent" | "unknown"
type ExtractionStudent = Record<string, unknown> & {
  attendance?: Partial<Record<WeekKey, unknown>>
}
type ExtractionSource = Record<string, unknown> & {
  students?: unknown
}
type CorrectionTableRow = {
  row_number: number | string
  student_name: string
  admission_number: string
  uncertain_cells: string
} & Partial<Record<WeekKey, WeekState>>
type DocumentMetadata = {
  class?: string
  class_id?: string
  school_name?: string
  term?: string
  teacher_name?: string
}
type ParsedExtractionJson = {
  classId?: string
}

const WEEK_KEYS: WeekKey[] = ["week_1", "week_2", "week_3", "week_4", "week_5"]

function weekValueToState(value?: unknown): WeekState {
  const normalized = String(value || "").trim().toUpperCase()
  if (!normalized) return "unknown"
  if (/^P(\s+P){4}$/.test(normalized)) return "present"
  if (/^A(\s+A){4}$/.test(normalized)) return "absent"
  if (normalized.includes("P")) return "present"
  if (normalized.includes("A")) return "absent"
  return "unknown"
}

function weekStateToValue(state: WeekState) {
  if (state === "present") return "P P P P P"
  if (state === "absent") return "A A A A A"
  return "- - - - -"
}

function getStudentRows(extraction: AttendantExtraction | null) {
  const source = (extraction?.humanCorrectedOutput || extraction?.llmExtractedOutput || extraction?.rawOcrJson) as
    | ExtractionSource
    | undefined
  const students = source?.students

  if (!Array.isArray(students)) {
    return [] as ExtractionStudent[]
  }

  return students.filter((student): student is ExtractionStudent => typeof student === "object" && student !== null)
}

function buildRow(student: ExtractionStudent, rowNumber: number): CorrectionTableRow {
  const attendance = typeof student.attendance === "object" && student.attendance ? student.attendance : {}
  const parsedRowNumber = student.row_number ?? student.rowNumber

  return {
    row_number: typeof parsedRowNumber === "number" || typeof parsedRowNumber === "string" ? parsedRowNumber : rowNumber,
    student_name: String(student.student_name ?? student.studentName ?? ""),
    admission_number: String(student.admission_number ?? student.admissionNumber ?? ""),
    week_1: weekValueToState(attendance.week_1),
    week_2: weekValueToState(attendance.week_2),
    week_3: weekValueToState(attendance.week_3),
    week_4: weekValueToState(attendance.week_4),
    week_5: weekValueToState(attendance.week_5),
    uncertain_cells: Array.isArray(student.uncertain_cells) ? student.uncertain_cells.map(String).join(", ") : "",
  }
}

function cloneLastRow(row: CorrectionTableRow | undefined, rowNumber: number, weeks: WeekKey[]): CorrectionTableRow {
  const base = {
    row_number: rowNumber,
    student_name: "",
    admission_number: "",
    uncertain_cells: "",
  }

  if (!row) {
    const weekDefaults: Partial<Record<WeekKey, WeekState>> = {}
    weeks.forEach((w) => { weekDefaults[w] = "unknown" })
    return { ...base, ...weekDefaults }
  }

  return { ...row, row_number: rowNumber }
}

function getFileNameFromPath(value?: string | null) {
  const normalized = String(value || "").replace(/\\/g, "/").trim()
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    return url.pathname.split("/").filter(Boolean).pop() ?? null
  } catch {
    return normalized.split("/").filter(Boolean).pop() ?? null
  }
}

function getExtractionImageUrl(extraction: AttendantExtraction | null) {
  const fileName =
    getFileNameFromPath(extraction?.imagePath) ||
    getFileNameFromPath(extraction?.originalImagePath) ||
    getFileNameFromPath(extraction?.imageUrl)

  if (fileName) {
    return `/api/uploads/attendant-extractions/${encodeURIComponent(fileName)}`
  }

  return extraction?.imageUrl ?? null
}

function getDocumentMetadata(extraction: AttendantExtraction | null) {
  const metadata = extraction?.rawOcrJson?.document_metadata
  return typeof metadata === "object" && metadata !== null ? metadata as DocumentMetadata : {}
}

function getParsedExtractionJson(extraction: AttendantExtraction | null) {
  return extraction?.parsedJson as ParsedExtractionJson | undefined
}

export default function ExtractionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [item, setItem] = useState<AttendantExtraction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [tableRows, setTableRows] = useState<CorrectionTableRow[]>([])
  const [school, setSchool] = useState<School | null>(null)
  const [term, setTerm] = useState<Term | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const [activeWeeks, setActiveWeeks] = useState<WeekKey[]>(WEEK_KEYS)
  const [weekLabels, setWeekLabels] = useState<Record<WeekKey, string>>({
    week_1: "WEEK 1",
    week_2: "WEEK 2",
    week_3: "WEEK 3",
    week_4: "WEEK 4",
    week_5: "WEEK 5",
  })

  function deleteRow(index: number) {
    setTableRows((current) => current.filter((_, i) => i !== index))
  }

  function deleteWeek(weekKey: WeekKey) {
    setActiveWeeks((current) => current.filter((w) => w !== weekKey))
    setTableRows((current) =>
      current.map((row) => {
        const newRow = { ...row }
        delete newRow[weekKey]
        return newRow
      })
    )
  }

  function updateWeekLabel(weekKey: WeekKey, label: string) {
    setWeekLabels((current) => ({ ...current, [weekKey]: label }))
  }

  useEffect(() => {
    async function loadExtraction() {
      setLoading(true)
      setError(null)

      try {
        const result = await resourceService.getExtractionById(id)
        setItem(result)
        setTableRows(getStudentRows(result).map((student, index) => buildRow(student, index + 1)))
        const [schoolResult, termResult, classResult] = await Promise.all([
          resourceService.getSchoolById(result.schoolId).catch(() => null),
          resourceService
            .getTerms({ limit: 200, page: 1 })
            .then((response) => response.results.find((entry: Term) => (entry._id ?? entry.id) === result.termId) ?? null)
            .catch(() => null),
          resourceService.getClasses({ limit: 200, page: 1 }).catch(() => ({ results: [] })),
        ])

        setSchool(schoolResult)
        setTerm(termResult)
        setClasses(classResult.results || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load extraction")
      } finally {
        setLoading(false)
      }
    }

    void loadExtraction()
  }, [id])

  const canAct = useMemo(() => Boolean(item), [item])
  const imageUrl = getExtractionImageUrl(item)
  const imageLoadFailed = Boolean(imageUrl && failedImageUrl === imageUrl)
  const isPdfSource = Boolean(item?.mimeType?.toLowerCase().includes("pdf") || imageUrl?.toLowerCase().split("?")[0]?.endsWith(".pdf"))
  const piError = item?.processingMeta?.piError
  const extractionError = item?.error || (typeof piError === "string" ? piError : null)
  const documentMetadata = getDocumentMetadata(item)
  const parsedExtractionJson = getParsedExtractionJson(item)
  const documentClass = useMemo(() => {
    const metadataClass = documentMetadata.class
    if (metadataClass) return metadataClass
    const classId = documentMetadata.class_id || parsedExtractionJson?.classId
    if (classId) {
      return classes.find((entry) => (entry._id ?? entry.id) === classId)?.name ?? classId
    }
    return "-"
  }, [classes, documentMetadata.class, documentMetadata.class_id, parsedExtractionJson?.classId])

  function updateRow(index: number, key: WeekKey, value: WeekState) {
    setTableRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    )
  }

  function addRow() {
    setTableRows((current) => {
      const nextIndex = current.length
      return [...current, cloneLastRow(current[current.length - 1], nextIndex + 1, activeWeeks)]
    })
  }

  function buildPayload() {
    const source = item?.humanCorrectedOutput || item?.llmExtractedOutput || item?.rawOcrJson || {}

    return {
      ...(source as Record<string, unknown>),
      week_labels: weekLabels,
      active_weeks: activeWeeks,
      students: tableRows.map((row, index) => {
        const attendance: Record<string, string> = {}
        activeWeeks.forEach((week) => {
          attendance[week] = weekStateToValue(row[week] ?? "unknown")
        })

        return {
          row_number: Number(row.row_number) || index + 1,
          student_name: String(row.student_name || "").trim(),
          admission_number: String(row.admission_number || "").trim(),
          attendance,
          uncertain_cells: String(row.uncertain_cells || "")
            .split(",")
            .map((cell) => cell.trim())
            .filter(Boolean),
        }
      }),
    }
  }

  async function handleCorrect() {
    if (!item) return
    setSaving(true)
    setError(null)

    try {
      const updated = await resourceService.correctExtraction(id, buildPayload())
      setItem(updated)
      setTableRows(getStudentRows(updated).map((student, index) => buildRow(student, index + 1)))
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save correction")
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!item) return
    setSaving(true)
    setError(null)

    try {
      await resourceService.correctExtraction(id, buildPayload())
      const updated = await resourceService.approveExtraction(id)
      setItem(updated)
      setTableRows(getStudentRows(updated).map((student, index) => buildRow(student, index + 1)))
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to approve extraction")
    } finally {
      setSaving(false)
    }
  }

  async function handleExport(format: "jsonl" | "csv" | "docai") {
    setExporting(true)
    setError(null)

    try {
      const response = await fetch(`/api/attendant-extractions/${id}/export?format=${format}`)
      if (!response.ok) {
        throw new Error(await response.text())
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `extraction-${id}.${format}`
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to export extraction")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Extraction Review</h2>
        <p className="text-sm text-muted-foreground">Review the extracted attendance table and approve when ready.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading extraction...</p> : null}

      {item ? (
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.15fr]">
          <Card>
            <CardHeader>
              <CardTitle>Source Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {imageUrl && !imageLoadFailed ? (
                <>
                  {isPdfSource ? (
                    <iframe
                      src={imageUrl}
                      title="Extraction source"
                      className="h-[720px] w-full rounded-md border"
                    />
                  ) : (
                    <TransformWrapper
                      initialScale={1}
                      minScale={1}
                      maxScale={4}
                      limitToBounds={false}
                      centerZoomedOut
                      centerOnInit
                      wheel={{ step: 0.1, touchPadDisabled: false }}
                      panning={{ disabled: false, allowLeftClickPan: true, allowRightClickPan: true, velocityDisabled: false }}
                      trackPadPanning={{ disabled: false }}
                      doubleClick={{ mode: "reset", step: 1 }}
                    >
                      <TransformComponent
                        wrapperStyle={{ width: "100%", height: "auto", margin: 0 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Extraction source"
                          className="block h-auto w-full min-w-[720px]"
                          onError={() => setFailedImageUrl(imageUrl)}
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  )}
                  {isPdfSource ? null : <p className="text-xs text-muted-foreground">Use mouse wheel to zoom, drag to pan, and double-click to reset.</p>}
                </>
              ) : imageUrl && imageLoadFailed ? (
                <p className="text-sm text-destructive">The source image could not be loaded.</p>
              ) : (
                <p className="text-sm text-muted-foreground">No image available.</p>
              )}
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p><span className="font-medium">Status:</span> {item.status}</p>
                <p><span className="font-medium">School:</span> {school?.name ?? item.schoolId}</p>
                <p><span className="font-medium">Term:</span> {term?.name ?? term?.termName ?? item.termId}</p>
                <p><span className="font-medium">Session:</span> {item.academicSessionId}</p>
                <p><span className="font-medium">Start:</span> {item.startDate}</p>
                <p><span className="font-medium">End:</span> {item.endDate}</p>
                <p><span className="font-medium">Class:</span> {documentClass}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" onClick={handleApprove} disabled={!canAct || saving}>
                  {saving ? "Saving..." : "Approve"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleExport("jsonl")} disabled={exporting}>
                  Export JSONL
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleExport("csv")} disabled={exporting}>
                  Export CSV
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleExport("docai")} disabled={exporting}>
                  Export DocAI
                </Button>
              </div>
              {item.validationErrors?.length ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                  {item.validationErrors.map((message) => <p key={message}>{message}</p>)}
                </div>
              ) : null}
              {extractionError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                  <p>{extractionError}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Correction Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <p className="rounded-md border bg-muted px-3 py-2">{documentMetadata.school_name ?? school?.name ?? "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <p className="rounded-md border bg-muted px-3 py-2">{documentClass}</p>
                </div>
                <div className="space-y-2">
                  <Label>Term</Label>
                  <p className="rounded-md border bg-muted px-3 py-2">{documentMetadata.term ?? term?.name ?? term?.termName ?? "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <p className="rounded-md border bg-muted px-3 py-2">{documentMetadata.teacher_name ?? "-"}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={addRow}>
                  Add Row
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/70 text-muted-foreground">
                    <tr>
                      <th className="w-10 px-2 py-2 font-medium"></th>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Admission</th>
                      {activeWeeks.map((week) => (
                        <th key={week} className="px-2 py-2 font-medium min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <input
                              className="w-20 rounded border bg-background px-1 py-0.5 text-xs font-medium"
                              value={weekLabels[week]}
                              onChange={(e) => updateWeekLabel(week, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => deleteWeek(week)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete week"
                            >
                              ×
                            </button>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium">Uncertain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, index) => (
                      <tr key={`${row.row_number ?? index}`} className="border-t align-top">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{row.row_number || index + 1}</span>
                            <button
                              type="button"
                              onClick={() => deleteRow(index)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete row"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-44 rounded-md border bg-background px-2 py-1"
                            value={row.student_name || ""}
                            onChange={(event) => {
                              const value = event.target.value
                              setTableRows((current) => current.map((currentRow, rowIndex) => rowIndex === index ? { ...currentRow, student_name: value } : currentRow))
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="w-36 rounded-md border bg-background px-2 py-1"
                            value={row.admission_number || ""}
                            onChange={(event) => {
                              const value = event.target.value
                              setTableRows((current) => current.map((currentRow, rowIndex) => rowIndex === index ? { ...currentRow, admission_number: value } : currentRow))
                            }}
                          />
                        </td>
                        {activeWeeks.map((weekKey) => {
                          const state = row[weekKey] as WeekState
                          return (
                            <td key={weekKey} className="px-2 py-2">
                              <div className="inline-flex rounded-md border bg-background p-0.5">
                                {(["present", "absent", "unknown"] as WeekState[]).map((choice) => (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={() => updateRow(index, weekKey, choice)}
                                    className={[
                                      "rounded px-1.5 py-0.5 text-xs font-medium",
                                      state === choice ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                                    ].join(" ")}
                                  >
                                    {choice === "present" ? "P" : choice === "absent" ? "A" : "-"}
                                  </button>
                                ))}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2">
                          <input
                            className="w-48 rounded-md border bg-background px-2 py-1"
                            value={row.uncertain_cells || ""}
                            onChange={(event) => {
                              const value = event.target.value
                              setTableRows((current) => current.map((currentRow, rowIndex) => rowIndex === index ? { ...currentRow, uncertain_cells: value } : currentRow))
                            }}
                            placeholder="notes"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleCorrect()} disabled={!canAct || saving}>
                  Save Correction
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
