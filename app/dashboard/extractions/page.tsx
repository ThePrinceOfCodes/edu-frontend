"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import type { AttendantExtraction, School, Term } from "@/interfaces/resource-interface"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  queued: "Queued",
  processing: "Processing",
  ocr_completed: "OCR Complete",
  llm_extracted: "LLM Extracted",
  validation_failed: "Validation Failed",
  pending_review: "Pending Review",
  corrected: "Corrected",
  approved: "Approved",
  exported: "Exported",
  failed: "Failed",
}

const statusTone: Record<string, string> = {
  pending_review: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  validation_failed: "border-red-500/30 bg-red-500/10 text-red-700",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  corrected: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  processing: "border-violet-500/30 bg-violet-500/10 text-violet-700",
}

function formatDate(value?: string) {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

function getExtractionId(item: AttendantExtraction) {
  return item._id ?? item.id ?? ""
}

export default function ExtractionsPage() {
  const [items, setItems] = useState<AttendantExtraction[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    async function loadExtractions() {
      setLoading(true)
      setError(null)

      try {
        const [result, schoolResult, termResult] = await Promise.all([
          resourceService.getExtractions({ limit: 50, page: 1, sortBy: "-createdAt" }),
          resourceService.getSchools({ limit: 200, page: 1 }),
          resourceService.getTerms({ limit: 200, page: 1 }),
        ])

        setItems(result.results || [])
        setSchools(schoolResult.results || [])
        setTerms(termResult.results || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load extractions")
      } finally {
        setLoading(false)
      }
    }

    void loadExtractions()
  }, [])

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      },
      { total: 0 } as Record<string, number>
    )
  }, [items])

  const visibleItems = useMemo(() => {
    if (!statusFilter) return items
    return items.filter((item) => item.status === statusFilter)
  }, [items, statusFilter])

  const schoolById = useMemo(() => new Map(schools.map((item) => [item._id ?? item.id ?? "", item])), [schools])
  const termById = useMemo(() => new Map(terms.map((item) => [item._id ?? item.id ?? "", item])), [terms])

  function getDocumentClassName(item: AttendantExtraction) {
    const metadataClass = (item.rawOcrJson as any)?.document_metadata?.class
    return metadataClass || (item.parsedJson as any)?.className || (item.parsedJson as any)?.class || "-"
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Extraction Review</h2>
        <p className="text-sm text-muted-foreground">Admin queue for attendance extraction review and approval.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/extractions/test-lab" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">
          Open Test Lab
        </Link>
        <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-muted" onClick={() => setStatusFilter("")}>All</button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={[
              "rounded-md border px-3 py-2 text-sm hover:bg-muted",
              statusFilter === key ? "bg-muted font-medium" : "",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{stats.total || 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pending Review</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{stats.pending_review || 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Validation Failed</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{stats.validation_failed || 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Approved</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{stats.approved || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extraction Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading extractions...</p> : null}
          {!loading && visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No extractions found.</p>
          ) : null}
          {!loading && visibleItems.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">School</th>
                    <th className="px-3 py-2 font-medium">Term</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Class</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const id = getExtractionId(item)
                    return (
                      <tr key={id} className="border-t">
                        <td className="px-3 py-2">{schoolById.get(item.schoolId)?.name ?? item.schoolId}</td>
                        <td className="px-3 py-2">{termById.get(item.termId)?.name ?? termById.get(item.termId)?.termName ?? item.termId}</td>
                        <td className="px-3 py-2">
                          <span className={[
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                            statusTone[item.status] ?? "border-border bg-muted text-foreground",
                          ].join(" ")}>{statusLabels[item.status] ?? item.status}</span>
                        </td>
                        <td className="px-3 py-2">{getDocumentClassName(item)}</td>
                        <td className="px-3 py-2">{formatDate(item.createdAt)}</td>
                        <td className="px-3 py-2">{formatDate(item.updatedAt)}</td>
                        <td className="px-3 py-2">
                          <Link className="text-primary hover:underline" href={`/dashboard/extractions/${id}`}>
                            Review
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
