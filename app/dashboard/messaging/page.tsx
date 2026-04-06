"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"

import type { Message, MessageThread, Staff } from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PendingAttachment = {
  name: string
  url: string
  type?: string
  size?: number
}

export default function MessagingPage() {
  const authUser = authService.getStoredUser()
  const schoolBoardId = authUser?.schoolBoardId || undefined

  const [threads, setThreads] = useState<MessageThread[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])

  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [newThreadType, setNewThreadType] = useState<"general" | "particular">("particular")
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const [newThreadParticipantIds, setNewThreadParticipantIds] = useState<string[]>([])
  const [composeError, setComposeError] = useState<string | null>(null)

  const [newMessageContent, setNewMessageContent] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [sendError, setSendError] = useState<string | null>(null)

  const existingUsersForParticularMessage = useMemo(() => {
    const users = staff
      .map((item) => {
        const user = item.user
        if (!user) {
          return null
        }

        if (typeof user === "string") {
          return { id: user, name: user }
        }

        const id = user._id ?? user.id
        if (!id) {
          return null
        }

        return {
          id,
          name: user.name || user.email || id,
        }
      })
      .filter((item): item is { id: string; name: string } => Boolean(item))

    const unique = new Map<string, { id: string; name: string }>()
    users.forEach((item) => unique.set(item.id, item))
    return [...unique.values()]
  }, [staff])

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      setError(null)

      try {
        const [threadsResult, staffResult] = await Promise.all([
          resourceService.getMessageThreads({ limit: 200, page: 1 }),
          resourceService.getStaff({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
        ])

        const threadList = threadsResult.results || []
        setThreads(threadList)
        setStaff(staffResult.results || [])

        if (!selectedThreadId && threadList.length > 0) {
          setSelectedThreadId(threadList[0]?._id ?? threadList[0]?.id ?? "")
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load messaging.")
      } finally {
        setLoading(false)
      }
    }

    void loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolBoardId])

  useEffect(() => {
    async function loadThreadMessages() {
      if (!selectedThreadId) {
        setMessages([])
        return
      }

      setMessagesLoading(true)
      setSendError(null)

      try {
        const result = await resourceService.getThreadMessages(selectedThreadId, {
          limit: 500,
          page: 1,
        })
        setMessages(result.results || [])
      } catch (loadError) {
        setSendError(loadError instanceof Error ? loadError.message : "Unable to load messages.")
      } finally {
        setMessagesLoading(false)
      }
    }

    void loadThreadMessages()
  }, [selectedThreadId])

  async function handleCreateThread() {
    setComposeError(null)

    if (newThreadType === "particular" && newThreadParticipantIds.length === 0) {
      setComposeError("Select at least one user for a particular message.")
      return
    }

    try {
      const created = await resourceService.createMessageThread({
        title: newThreadTitle || undefined,
        isBroadcast: newThreadType === "general",
        participantIds: newThreadType === "particular" ? newThreadParticipantIds : undefined,
      })

      const refreshed = await resourceService.getMessageThreads({ limit: 200, page: 1 })
      setThreads(refreshed.results || [])

      const createdId = created._id ?? created.id ?? ""
      if (createdId) {
        setSelectedThreadId(createdId)
      }

      setNewThreadTitle("")
      setNewThreadParticipantIds([])
      setIsComposeOpen(false)
    } catch (createError) {
      setComposeError(createError instanceof Error ? createError.message : "Unable to create conversation.")
    }
  }

  async function handleSendMessage() {
    if (!selectedThreadId || !newMessageContent.trim()) {
      return
    }

    setSendError(null)

    try {
      await resourceService.sendThreadMessage(selectedThreadId, newMessageContent, pendingAttachments)
      const refreshed = await resourceService.getThreadMessages(selectedThreadId, { limit: 500, page: 1 })
      setMessages(refreshed.results || [])
      setNewMessageContent("")
      setPendingAttachments([])
    } catch (sendMessageError) {
      setSendError(sendMessageError instanceof Error ? sendMessageError.message : "Unable to send message.")
    }
  }

  async function handleAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) {
      return
    }

    const nextAttachments = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<PendingAttachment>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                name: file.name,
                url: String(reader.result || ""),
                type: file.type,
                size: file.size,
              })
            }
            reader.onerror = () => reject(new Error("Unable to read selected file"))
            reader.readAsDataURL(file)
          })
      )
    )

    setPendingAttachments((current) => [...current, ...nextAttachments])
    event.target.value = ""
  }

  function removePendingAttachment(index: number) {
    setPendingAttachments((current) => current.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Messaging</h2>
          <p className="text-sm text-muted-foreground">History of all conversations and chat compose.</p>
        </div>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={() => setIsComposeOpen((current) => !current)}
        >
          Compose
        </button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading messaging...</p> : null}

      {isComposeOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>Compose New Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="thread-type">Message Type</Label>
              <select
                id="thread-type"
                className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                value={newThreadType}
                onChange={(event) => {
                  setNewThreadType(event.target.value as "general" | "particular")
                  setNewThreadParticipantIds([])
                }}
              >
                <option value="particular">Particular Message</option>
                <option value="general">General Message (Broadcast)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thread-title">Title (optional)</Label>
              <Input
                id="thread-title"
                value={newThreadTitle}
                onChange={(event) => setNewThreadTitle(event.target.value)}
                placeholder="Conversation title"
              />
            </div>

            {newThreadType === "particular" ? (
              <div className="space-y-2">
                <Label>Select Users</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                  {existingUsersForParticularMessage.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newThreadParticipantIds.includes(user.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setNewThreadParticipantIds((current) => [...new Set([...current, user.id])])
                            return
                          }

                          setNewThreadParticipantIds((current) => current.filter((item) => item !== user.id))
                        }}
                      />
                      <span>{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {composeError ? <p className="text-sm text-destructive">{composeError}</p> : null}

            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => void handleCreateThread()}
            >
              Create Conversation
            </button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversation History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {threads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              threads.map((thread) => {
                const id = thread._id ?? thread.id ?? ""
                const isSelected = id === selectedThreadId
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedThreadId(id)}
                    className={`w-full rounded-md border p-2 text-left text-sm ${isSelected ? "bg-accent" : ""}`}
                  >
                    <p className="font-medium">
                      {thread.title || (thread.isBroadcast ? "Broadcast Message" : "Direct Message")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {thread.isBroadcast ? "General" : `Participants: ${thread.participants.length}`}
                    </p>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-3">
              {messagesLoading ? (
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                messages.map((message) => {
                  const messageId = message._id ?? message.id ?? `${message.sender}-${message.createdAt}`
                  return (
                    <div key={messageId} className="rounded-md bg-muted p-2 text-sm">
                      <p className="text-xs text-muted-foreground">Sender: {message.sender}</p>
                      <p>{message.content}</p>
                      {message.attachments && message.attachments.length > 0 ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium">Attachments</p>
                          {message.attachments.map((attachment, idx) => (
                            <a
                              key={`${messageId}-${attachment.name}-${idx}`}
                              href={attachment.url}
                              download={attachment.name}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs text-primary underline"
                            >
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-message">New Message</Label>
              <Input
                id="new-message"
                value={newMessageContent}
                onChange={(event) => setNewMessageContent(event.target.value)}
                placeholder="Type your message"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments</Label>
              <Input id="attachments" type="file" multiple onChange={handleAttachmentSelection} />
              {pendingAttachments.length > 0 ? (
                <div className="space-y-1">
                  {pendingAttachments.map((attachment, index) => (
                    <div key={`${attachment.name}-${index}`} className="flex items-center justify-between text-xs">
                      <span>{attachment.name}</span>
                      <button
                        type="button"
                        className="rounded border px-2 py-0.5 hover:bg-accent"
                        onClick={() => removePendingAttachment(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}

            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => void handleSendMessage()}
              disabled={!selectedThreadId || !newMessageContent.trim()}
            >
              Send Message
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
