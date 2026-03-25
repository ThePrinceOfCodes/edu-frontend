"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"

import type { SchoolBoard } from "@/interfaces/resource-interface"
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

export default function SchoolBoardsPage() {
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([])
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCode, setEditCode] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active")
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  const activeCount = schoolBoards.filter((item) => item.status !== "inactive").length
  const inactiveCount = schoolBoards.filter((item) => item.status === "inactive").length

  async function loadSchoolBoards() {
    setLoadError(null)
    setLoading(true)

    try {
      const result = await resourceService.getSchoolBoards()
      setSchoolBoards(result.results)
    } catch (loadError) {
      setLoadError(
        loadError instanceof Error ? loadError.message : "Unable to load school boards."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSchoolBoards()
  }, [])

  function getBoardId(item: SchoolBoard) {
    return item._id ?? item.id ?? ""
  }

  function getContactEmail(item: SchoolBoard) {
    if (!item.superAdminUser || typeof item.superAdminUser === "string") {
      return "-"
    }

    return item.superAdminUser.email ?? "-"
  }

  function getContactPhone(item: SchoolBoard) {
    if (!item.superAdminUser || typeof item.superAdminUser === "string") {
      return "-"
    }

    return item.superAdminUser.phoneNumber ?? "-"
  }

  function openEditModal(item: SchoolBoard) {
    const boardId = getBoardId(item)

    if (!boardId) {
      setSubmitError("Unable to edit this school board because it has no identifier.")
      return
    }

    setSubmitError(null)
    setEditTargetId(boardId)
    setEditName(item.name)
    setEditCode(item.code ?? "")
    setEditDescription(item.description ?? "")
    setEditStatus(item.status ?? "active")
    setIsEditOpen(true)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editTargetId) {
      setSubmitError("No school board selected for edit.")
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await resourceService.updateSchoolBoard(editTargetId, {
        name: editName,
        code: editCode || undefined,
        description: editDescription || undefined,
        status: editStatus,
      })

      setIsEditOpen(false)
      setEditTargetId(null)
      await loadSchoolBoards()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update school board.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(item: SchoolBoard) {
    const boardId = getBoardId(item)

    if (!boardId) {
      setSubmitError("Unable to delete this school board because it has no identifier.")
      return
    }

    const confirmed = window.confirm(`Delete school board \"${item.name}\"?`)

    if (!confirmed) {
      return
    }

    setSubmitError(null)
    setIsDeletingId(boardId)

    try {
      await resourceService.deleteSchoolBoard(boardId)
      await loadSchoolBoards()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to delete school board.")
    } finally {
      setIsDeletingId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await resourceService.createSchoolBoard({
        name,
        code: code || undefined,
        description: description || undefined,
        superAdmin: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        },
      })

      setName("")
      setCode("")
      setDescription("")
      setAdminName("")
      setAdminEmail("")
      setAdminPassword("")
      setIsCreateOpen(false)
      await loadSchoolBoards()
    } catch (submitError) {
      setSubmitError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create school board."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">School Boards</h2>
        <div className="flex items-center gap-2">
          <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
            <ModalTrigger render={<button />} />
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Edit School Board</ModalTitle>
                <ModalDescription>Update top-level school board information.</ModalDescription>
              </ModalHeader>
              <form className="space-y-3" onSubmit={handleEditSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="edit-board-name">Name</Label>
                  <Input
                    id="edit-board-name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-board-code">Code</Label>
                  <Input
                    id="edit-board-code"
                    value={editCode}
                    onChange={(event) => setEditCode(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-board-description">Description</Label>
                  <Input
                    id="edit-board-description"
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-board-status">Status</Label>
                  <select
                    id="edit-board-status"
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(event.target.value as "active" | "inactive")
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </ModalContent>
          </Modal>

          <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ModalTrigger render={<Button />}>Create School Board</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Create School Board</ModalTitle>
              <ModalDescription>Add a new school board and super admin.</ModalDescription>
            </ModalHeader>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="board-name">Name</Label>
                <Input id="board-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="board-code">Code</Label>
                <Input id="board-code" value={code} onChange={(event) => setCode(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="board-description">Description</Label>
                <Input
                  id="board-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-name">Super Admin Name</Label>
                <Input
                  id="admin-name"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Super Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Super Admin Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  required
                />
              </div>
              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create School Board"}
              </Button>
            </form>
          </ModalContent>
        </Modal>
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
            <p className="text-2xl font-semibold">{schoolBoards.length}</p>
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Boards Table</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && schoolBoards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No school boards found.</p>
          ) : null}
          {!loading && schoolBoards.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Contact Email</th>
                    <th className="px-3 py-2 font-medium">Contact Number</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolBoards.map((item) => (
                    <tr key={getBoardId(item) || item.name} className="border-t">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{getContactEmail(item)}</td>
                      <td className="px-3 py-2">{getContactPhone(item)}</td>
                      <td className="px-3 py-2">{item.code || "-"}</td>
                      <td className="px-3 py-2">{item.description || "-"}</td>
                      <td className="px-3 py-2">{item.status || "active"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {getBoardId(item) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              nativeButton={false}
                              render={<Link href={`/dashboard/school-boards/${getBoardId(item)}`} />}
                            >
                              View
                            </Button>
                          ) : null}
                          <Button size="sm" variant="outline" onClick={() => openEditModal(item)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDelete(item)}
                            disabled={isDeletingId === getBoardId(item)}
                          >
                            {isDeletingId === getBoardId(item) ? "Deleting..." : "Delete"}
                          </Button>
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