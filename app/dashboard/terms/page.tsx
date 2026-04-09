"use client"

import { FormEvent, useEffect, useState } from "react"

import type { AuthUser } from "@/interfaces/auth-interface"
import type { Term } from "@/interfaces/resource-interface"
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

const currentYear = new Date().getUTCFullYear()
const ACADEMIC_SESSIONS: string[] = Array.from(
  { length: currentYear + 10 - 2015 + 1 },
  (_, i) => {
    const y = 2015 + i
    return `${y}/${y + 1}`
  },
)

const toDateInputValue = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return date.toISOString().slice(0, 10)
}

const toDisplayDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }
  return date.toISOString().slice(0, 10)
}

export default function TermsPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const canViewTerms = authUser?.role === "school-board-admin" || authUser?.role === "school-admin"
  const canCreateTerm = canViewTerms
  const canSetSchoolScope =
    authUser?.accountType === "internal" || authUser?.role === "school-board-admin"

  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTermName, setCreateTermName] = useState("")
  const [createAcademicSession, setCreateAcademicSession] = useState("")
  const [createStartDate, setCreateStartDate] = useState("")
  const [createEndDate, setCreateEndDate] = useState("")
  const [createIsActive, setCreateIsActive] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTermId, setEditTermId] = useState("")
  const [editTermName, setEditTermName] = useState("")
  const [editSchoolId, setEditSchoolId] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const schoolBoardFilter =
        authUser?.accountType === "internal" ? undefined : authUser?.schoolBoardId || undefined

      const [termsResult] = await Promise.all([
        resourceService.getTerms({
          limit: 200,
          page: 1,
          schoolBoard: schoolBoardFilter,
          school: authUser?.role === "school-admin" ? authUser.schoolId || undefined : undefined,
        }),
      ])

      setTerms(termsResult.results)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load terms.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAuthUser(authService.getStoredUser())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    void loadData()
  }, [isHydrated])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    setIsCreating(true)

    try {
      await resourceService.createTerm({
        termName: createTermName,
        academicSession: createAcademicSession,
        startDate: createStartDate,
        endDate: createEndDate,
        isActive: createIsActive,
      })

      setCreateTermName("")
      setCreateAcademicSession("")
      setCreateStartDate("")
      setCreateEndDate("")
      setCreateIsActive(true)
      setIsCreateOpen(false)
      await loadData()
    } catch (createErr) {
      setCreateError(createErr instanceof Error ? createErr.message : "Unable to create term.")
    } finally {
      setIsCreating(false)
    }
  }

  function openEditModal(term: Term) {
    const termId = term._id ?? term.id ?? ""
    if (!termId) {
      return
    }

    setEditTermId(termId)
    setEditTermName(term.termName || "")
    setEditSchoolId(term.school || "")
    setEditStartDate(toDateInputValue(term.startDate))
    setEditEndDate(toDateInputValue(term.endDate))
    setEditIsActive(Boolean(term.isActive))
    setEditError(null)
    setIsEditOpen(true)
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditError(null)

    if (!editTermId) {
      setEditError("Invalid term identifier.")
      return
    }

    setIsSavingEdit(true)

    try {
      await resourceService.updateTerm(editTermId, {
        termName: editTermName,
        school: canSetSchoolScope ? editSchoolId || undefined : undefined,
        startDate: editStartDate,
        endDate: editEndDate,
        isActive: editIsActive,
      })

      setIsEditOpen(false)
      await loadData()
    } catch (editErr) {
      setEditError(editErr instanceof Error ? editErr.message : "Unable to update term.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleDelete(term: Term) {
    const termId = term._id ?? term.id

    if (!termId) {
      return
    }

    const confirmed = window.confirm(`Delete term "${term.name}"?`)
    if (!confirmed) {
      return
    }

    setIsDeletingId(termId)

    try {
      await resourceService.deleteTerm(termId)
      await loadData()
    } catch (deleteErr) {
      setError(deleteErr instanceof Error ? deleteErr.message : "Unable to delete term.")
    } finally {
      setIsDeletingId(null)
    }
  }

  if (!isHydrated) {
    return <div className="space-y-4" />
  }

  return (
    <div className="space-y-4">
      {!canViewTerms ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            You do not have permission to view terms. Only school board admins and school admins can access this section.
          </p>
        </div>
      ) : null}
      {canViewTerms ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Terms</h2>
            {canCreateTerm ? (
          <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ModalTrigger render={<Button />}>Create Term</ModalTrigger>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Create Term</ModalTitle>
                <ModalDescription>
                  Name is generated automatically as Academic Year + Term Name + Date Range.
                </ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="term-name">Term Name</Label>
                  <Input
                    id="term-name"
                    value={createTermName}
                    onChange={(event) => setCreateTermName(event.target.value)}
                    placeholder="First Term"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="term-academic-session">Academic Session</Label>
                  <select
                    id="term-academic-session"
                    className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                    value={createAcademicSession}
                    onChange={(event) => setCreateAcademicSession(event.target.value)}
                    required
                  >
                    <option value="">Select academic session</option>
                    {ACADEMIC_SESSIONS.map((session) => (
                      <option key={session} value={session}>
                        {session}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="term-start-date">Start Date</Label>
                    <Input
                      id="term-start-date"
                      type="date"
                      value={createStartDate}
                      onChange={(event) => setCreateStartDate(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="term-end-date">End Date</Label>
                    <Input
                      id="term-end-date"
                      type="date"
                      value={createEndDate}
                      onChange={(event) => setCreateEndDate(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createIsActive}
                    onChange={(event) => setCreateIsActive(event.target.checked)}
                  />
                  <span>Set as active term</span>
                </label>

                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}

                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Term"}
                </Button>
              </form>
            </ModalContent>
          </Modal>
        ) : (
          <p className="text-sm text-muted-foreground">Only school board admins and school admins can create terms.</p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Terms Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && terms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No terms found.</p>
          ) : null}

          {!loading && terms.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Term Name</th>
                    <th className="px-3 py-2 font-medium">Academic Session</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Date Range</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((term) => {
                    const termId = term._id ?? term.id ?? ""
                    const isDeleting = isDeletingId === termId
                    const scope = term.school ? "School" : "School Board"

                    return (
                      <tr key={termId || term.name} className="border-t">
                        <td className="px-3 py-2">{term.name}</td>
                        <td className="px-3 py-2">{term.termName}</td>
                        <td className="px-3 py-2">
                          {term.academicSession ?? "-"}
                        </td>
                        <td className="px-3 py-2">{scope}</td>
                        <td className="px-3 py-2">
                          {toDisplayDate(term.startDate)} - {toDisplayDate(term.endDate)}
                        </td>
                        <td className="px-3 py-2">{term.isActive ? "Yes" : "No"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(term)}>
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDelete(term)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
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

      <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
        <ModalTrigger render={<button />} />
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit Term</ModalTitle>
            <ModalDescription>
              Name is regenerated automatically from academic year, term name, and date range.
            </ModalDescription>
          </ModalHeader>
          <form className="space-y-3" onSubmit={handleEdit}>
            <div className="space-y-2">
              <Label htmlFor="edit-term-name">Term Name</Label>
              <Input
                id="edit-term-name"
                value={editTermName}
                onChange={(event) => setEditTermName(event.target.value)}
                required
              />
            </div>

            {canSetSchoolScope ? (
              <div className="space-y-2">
                <Label htmlFor="edit-term-school-id">School ID (optional)</Label>
                <Input
                  id="edit-term-school-id"
                  value={editSchoolId}
                  onChange={(event) => setEditSchoolId(event.target.value)}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-term-start-date">Start Date</Label>
                <Input
                  id="edit-term-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(event) => setEditStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-term-end-date">End Date</Label>
                <Input
                  id="edit-term-end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(event) => setEditIsActive(event.target.checked)}
              />
              <span>Set as active term</span>
            </label>

            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}

            <Button type="submit" disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </ModalContent>
      </Modal>
        </>
      ) : null}
    </div>
  )
}
