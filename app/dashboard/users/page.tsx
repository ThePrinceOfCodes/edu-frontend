"use client"

import { FormEvent, useEffect, useState } from "react"
import { MoreHorizontal } from "lucide-react"

import type {
  CreateInternalUserInput,
  InternalUser,
  InternalUserRole,
  UpdateInternalUserInput,
} from "@/interfaces/resource-interface"
import { INTERNAL_USER_PERMISSIONS } from "@/interfaces/resource-interface"
import type { AuthUser } from "@/interfaces/auth-interface"
import { resourceService } from "@/services/resource-service"
import { authService } from "@/services/auth-service"
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

const ALL_PERMISSIONS = [...INTERNAL_USER_PERMISSIONS]

export default function UsersPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [users, setUsers] = useState<InternalUser[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null)
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<InternalUserRole>("admin")
  const [permissions, setPermissions] = useState<string[]>([])

  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhoneNumber, setEditPhoneNumber] = useState("")
  const [editRole, setEditRole] = useState<InternalUserRole>("admin")
  const [editPermissions, setEditPermissions] = useState<string[]>([])

  const isInternalUser = authUser?.accountType === "internal"
  const isAllSelected = permissions.length === ALL_PERMISSIONS.length
  const isAllEditSelected = editPermissions.length === ALL_PERMISSIONS.length

  useEffect(() => {
    setAuthUser(authService.getStoredUser())
    setHasHydrated(true)
  }, [])

  async function loadUsers() {
    setLoadError(null)
    setLoading(true)

    try {
      const result = await resourceService.getUsers({ limit: 100, accountType: "internal" })
      setUsers(result.results)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    if (isInternalUser) {
      void loadUsers()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isInternalUser])

  if (!hasHydrated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Users</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Internal Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  function resetForm() {
    setStep(1)
    setName("")
    setEmail("")
    setPhoneNumber("")
    setPassword("")
    setRole("admin")
    setPermissions([])
    setSubmitError(null)
  }

  function togglePermission(permission: string) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    )
  }

  function toggleAllPermissions() {
    setPermissions((current) => (current.length === ALL_PERMISSIONS.length ? [] : [...ALL_PERMISSIONS]))
  }

  function toggleEditPermission(permission: string) {
    setEditPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    )
  }

  function toggleAllEditPermissions() {
    setEditPermissions((current) => (current.length === ALL_PERMISSIONS.length ? [] : [...ALL_PERMISSIONS]))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    const payload: CreateInternalUserInput = {
      name,
      email,
      password,
      role,
      permissions,
      ...(phoneNumber ? { phoneNumber } : {}),
    }

    try {
      await resourceService.createInternalUser(payload)
      setIsCreateOpen(false)
      resetForm()
      await loadUsers()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create user.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivateUser(user: InternalUser) {
    setOpenActionMenuFor(null)
    const userId = user._id ?? user.id
    if (!userId) return

    if (!window.confirm(`Deactivate ${user.name}?`)) {
      return
    }

    try {
      await resourceService.deactivateUser(userId)
      await loadUsers()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to deactivate user.")
    }
  }

  async function handleDeleteUser(user: InternalUser) {
    setOpenActionMenuFor(null)
    const userId = user._id ?? user.id
    if (!userId) return

    if (!window.confirm(`Soft delete ${user.name}?`)) {
      return
    }

    try {
      await resourceService.deleteUser(userId)
      await loadUsers()
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to delete user.")
    }
  }

  function openViewUser(user: InternalUser) {
    setOpenActionMenuFor(null)
    setSelectedUser(user)
    setIsViewOpen(true)
  }

  function openEditUser(user: InternalUser) {
    setOpenActionMenuFor(null)
    setSelectedUser(user)
    setEditName(user.name)
    setEditEmail(user.email)
    setEditPhoneNumber(user.phoneNumber ?? "")
    const resolvedRole = (user.role === "super-admin" ? "super-admin" : "admin") as InternalUserRole
    setEditRole(resolvedRole)
    setEditPermissions(user.permissions?.includes("*") ? [...ALL_PERMISSIONS] : [...(user.permissions ?? [])])
    setIsEditOpen(true)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) return

    const userId = selectedUser._id ?? selectedUser.id
    if (!userId) return

    setIsSubmitting(true)
    setSubmitError(null)

    const payload: UpdateInternalUserInput = {
      name: editName,
      email: editEmail,
      role: editRole,
      permissions: editPermissions,
      ...(editPhoneNumber ? { phoneNumber: editPhoneNumber } : { phoneNumber: "" }),
    }

    try {
      await resourceService.updateUser(userId, payload)
      setIsEditOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to update user.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleActionMenu(user: InternalUser) {
    const userId = user._id ?? user.id ?? user.email

    if (!userId) {
      return
    }

    setOpenActionMenuFor((current) => (current === userId ? null : userId))
  }

  if (!isInternalUser) {
    return (
      <div className="py-10 text-sm text-muted-foreground">
        Only internal admins can view users.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>

        <Modal
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) {
              resetForm()
            }
          }}
        >
          <ModalTrigger render={<Button />}>Create User</ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Create Internal User</ModalTitle>
              <ModalDescription>
                Step {step} of 2: {step === 1 ? "User details" : "Role & permissions"}
              </ModalDescription>
            </ModalHeader>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Name</Label>
                    <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-phone">Phone Number</Label>
                    <Input
                      id="user-phone"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password">Password</Label>
                    <Input
                      id="user-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setStep(2)} disabled={!name || !email || !password}>
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Role</Label>
                    <select
                      id="user-role"
                      className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={role}
                      onChange={(event) => setRole(event.target.value as InternalUserRole)}
                    >
                      <option value="admin">Admin</option>
                      <option value="super-admin">Super Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Permissions</p>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={isAllSelected} onChange={toggleAllPermissions} />
                        Select all
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {ALL_PERMISSIONS.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                          />
                          {permission}
                        </label>
                      ))}
                    </div>
                  </div>

                  {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

                  <div className="flex items-center justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting || permissions.length === 0}>
                      {isSubmitting ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </ModalContent>
        </Modal>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Internal Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
          {!loading && users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No internal users found.</p>
          ) : null}

          {!loading && users.length > 0 ? (
            <div className="overflow-x-auto overflow-y-visible rounded-md border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Mobile</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item._id ?? item.id ?? item.email} className="border-t">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.email}</td>
                      <td className="px-3 py-2">{item.phoneNumber || "-"}</td>
                      <td className="px-3 py-2">{item.role ?? "-"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            (item.status ?? "active") === "disabled"
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {item.status ?? "active"}
                        </span>
                      </td>
                      <td className="relative z-10 px-3 py-2">
                        <div className="relative inline-block">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Open actions"
                            onClick={() => toggleActionMenu(item)}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                          {openActionMenuFor === (item._id ?? item.id ?? item.email) ? (
                            <div className="absolute right-0 bottom-full z-50 mb-1 w-36 rounded-md border bg-popover p-1 shadow-md">
                              <button
                                type="button"
                                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => openViewUser(item)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => openEditUser(item)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => handleDeactivateUser(item)}
                              >
                                Deactivate
                              </button>
                              <button
                                type="button"
                                className="block w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-accent"
                                onClick={() => handleDeleteUser(item)}
                              >
                                Delete
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
          ) : null}
        </CardContent>
      </Card>

      <Modal open={isViewOpen} onOpenChange={setIsViewOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>User Details</ModalTitle>
            <ModalDescription>View user account details and permissions.</ModalDescription>
          </ModalHeader>

          {selectedUser ? (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {selectedUser.name}</p>
              <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
              <p><span className="font-medium">Role:</span> {selectedUser.role ?? "-"}</p>
              <p><span className="font-medium">Status:</span> {selectedUser.status ?? "active"}</p>
              <div>
                <p className="font-medium">Permissions:</p>
                <div className="mt-1 space-y-1">
                  {(selectedUser.permissions ?? []).map((permission) => (
                    <p key={permission} className="text-xs text-muted-foreground">{permission}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </ModalContent>
      </Modal>

      <Modal open={isEditOpen} onOpenChange={setIsEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit User</ModalTitle>
            <ModalDescription>Update user details, role and permissions.</ModalDescription>
          </ModalHeader>

          <form className="space-y-3" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Name</Label>
              <Input id="edit-user-name" value={editName} onChange={(event) => setEditName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">Phone Number</Label>
              <Input
                id="edit-user-phone"
                value={editPhoneNumber}
                onChange={(event) => setEditPhoneNumber(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Role</Label>
              <select
                id="edit-user-role"
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as InternalUserRole)}
              >
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </select>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Permissions</p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={isAllEditSelected} onChange={toggleAllEditPermissions} />
                  Select all
                </label>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {ALL_PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(permission)}
                      onChange={() => toggleEditPermission(permission)}
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || editPermissions.length === 0}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}
