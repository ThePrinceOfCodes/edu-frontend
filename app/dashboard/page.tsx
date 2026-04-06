"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import type {
  AcademicSession,
  Message,
  MessageThread,
  School,
  Staff,
  Term,
} from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DashboardPage() {
  const authUser = authService.getStoredUser()
  const schoolBoardId = authUser?.schoolBoardId || undefined

  const [activeTab, setActiveTab] = useState<"summary" | "notifications">("summary")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [schools, setSchools] = useState<School[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [sessions, setSessions] = useState<AcademicSession[]>([])

  const [isTermSessionPickerOpen, setIsTermSessionPickerOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [selectedTermId, setSelectedTermId] = useState("")
  const termSessionPickerRef = useRef<HTMLDivElement | null>(null)
  const [attendanceBySchool, setAttendanceBySchool] = useState<
    Array<{ schoolId: string; schoolName: string; percentage: number; studentCount: number }>
  >([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)

  const [threads, setThreads] = useState<MessageThread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [newThreadType, setNewThreadType] = useState<"general" | "particular">("particular")
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const [newThreadParticipantIds, setNewThreadParticipantIds] = useState<string[]>([])
  const [newMessageContent, setNewMessageContent] = useState("")
  const [threadError, setThreadError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)

  const selectedTerm = useMemo(
    () => terms.find((item) => (item._id ?? item.id) === selectedTermId) || null,
    [terms, selectedTermId]
  )
  const selectedSession = useMemo(
    () =>
      sessions.find(
        (item) => (item._id ?? item.id) === (selectedSessionId || selectedTerm?.academicSessionId)
      ) || null,
    [sessions, selectedSessionId, selectedTerm?.academicSessionId]
  )
  const termsForSelectedSession = useMemo(() => {
    if (!selectedSessionId) {
      return terms
    }

    return terms.filter((item) => item.academicSessionId === selectedSessionId)
  }, [terms, selectedSessionId])
  const currentTermSessionLabel = useMemo(() => {
    const termLabel = selectedTerm?.name || selectedTerm?.termName || "Select term"
    const sessionLabel = selectedSession
      ? `${selectedSession.startYear}/${selectedSession.endYear}`
      : "Select session"

    return `${termLabel} - ${sessionLabel}`
  }, [selectedSession, selectedTerm?.name, selectedTerm?.termName])

  const overallAttendance = useMemo(() => {
    if (attendanceBySchool.length === 0) {
      return 0
    }

    const total = attendanceBySchool.reduce((sum, item) => sum + item.percentage, 0)
    return Number((total / attendanceBySchool.length).toFixed(2))
  }, [attendanceBySchool])

  const schoolsWithLowAttendance = useMemo(
    () => attendanceBySchool.filter((item) => item.percentage < 70).length,
    [attendanceBySchool]
  )

  const trackedStudentsCount = useMemo(
    () => attendanceBySchool.reduce((sum, item) => sum + item.studentCount, 0),
    [attendanceBySchool]
  )

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
    async function loadDashboard() {
      setLoading(true)
      setLoadError(null)

      try {
        const [schoolsResult, staffResult, termsResult, sessionsResult, threadsResult] = await Promise.all([
          resourceService.getSchools({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
          resourceService.getStaff({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
          resourceService.getTerms({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
          resourceService.getAcademicSessions({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
          resourceService.getMessageThreads({ limit: 200, page: 1 }),
        ])

        const schoolsList = schoolsResult.results || []
        const termsList = termsResult.results || []

        setSchools(schoolsList)
        setStaff(staffResult.results || [])
        setTerms(termsList)
        setSessions(sessionsResult.results || [])
        setThreads(threadsResult.results || [])

        let defaultTermId = selectedTermId
        if (!defaultTermId) {
          const activeTerm = termsList.find((item) => Boolean(item.isActive))
          const firstTerm = termsList[0]
          defaultTermId = activeTerm?._id ?? activeTerm?.id ?? firstTerm?._id ?? firstTerm?.id ?? ""
        }

        const defaultTerm = termsList.find((item) => (item._id ?? item.id) === defaultTermId)
        const activeSession = (sessionsResult.results || []).find((item) => Boolean(item.isActive))

        setSelectedTermId(defaultTermId)
        setSelectedSessionId(defaultTerm?.academicSessionId ?? (activeSession?._id ?? activeSession?.id ?? ""))
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load dashboard.")
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolBoardId])

  useEffect(() => {
    async function loadAttendance() {
      if (!selectedTermId || schools.length === 0) {
        setAttendanceBySchool([])
        return
      }

      setAttendanceLoading(true)

      try {
        const results = await Promise.all(
          schools.map(async (school) => {
            const schoolId = school._id ?? school.id
            if (!schoolId) {
              return null
            }

            const summary = await resourceService.getAttendanceSummary({
              school: schoolId,
              termId: selectedTermId,
            })

            const rows = summary.rows || []
            const avg = rows.length
              ? Number((rows.reduce((sum, row) => sum + row.attendancePercentage, 0) / rows.length).toFixed(2))
              : 0

            return {
              schoolId,
              schoolName: school.name,
              percentage: avg,
              studentCount: rows.length,
            }
          })
        )

        setAttendanceBySchool(
          results.filter(
            (
              item
            ): item is {
              schoolId: string
              schoolName: string
              percentage: number
              studentCount: number
            } => Boolean(item)
          )
        )
      } catch {
        setAttendanceBySchool([])
      } finally {
        setAttendanceLoading(false)
      }
    }

    void loadAttendance()
  }, [schools, selectedTermId])

  useEffect(() => {
    async function loadThreadMessages() {
      if (!selectedThreadId) {
        setMessages([])
        return
      }

      setMessagesLoading(true)
      setMessageError(null)

      try {
        const result = await resourceService.getThreadMessages(selectedThreadId, { limit: 500, page: 1 })
        setMessages(result.results || [])
      } catch (error) {
        setMessageError(error instanceof Error ? error.message : "Unable to load messages.")
      } finally {
        setMessagesLoading(false)
      }
    }

    void loadThreadMessages()
  }, [selectedThreadId])

  useEffect(() => {
    if (!isTermSessionPickerOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (termSessionPickerRef.current && !termSessionPickerRef.current.contains(target)) {
        setIsTermSessionPickerOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsTermSessionPickerOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isTermSessionPickerOpen])

  function handleSessionChange(sessionId: string) {
    setSelectedSessionId(sessionId)

    const nextTerms = terms.filter((item) => item.academicSessionId === sessionId)

    if (nextTerms.length === 0) {
      setSelectedTermId("")
      return
    }

    const currentTermStillValid = nextTerms.some((item) => (item._id ?? item.id) === selectedTermId)
    if (currentTermStillValid) {
      return
    }

    const activeTerm = nextTerms.find((item) => Boolean(item.isActive))
    const defaultTerm = activeTerm ?? nextTerms[0]
    setSelectedTermId(defaultTerm?._id ?? defaultTerm?.id ?? "")
  }

  function handleTermChange(termId: string) {
    setSelectedTermId(termId)

    const term = terms.find((item) => (item._id ?? item.id) === termId)
    if (term?.academicSessionId) {
      setSelectedSessionId(term.academicSessionId)
    }

    setIsTermSessionPickerOpen(false)
  }

  async function handleCreateThread() {
    setThreadError(null)

    try {
      const created = await resourceService.createMessageThread({
        title: newThreadTitle || undefined,
        isBroadcast: newThreadType === "general",
        participantIds: newThreadType === "particular" ? newThreadParticipantIds : undefined,
      })

      const createdId = created._id ?? created.id ?? ""

      const refreshed = await resourceService.getMessageThreads({ limit: 200, page: 1 })
      setThreads(refreshed.results || [])

      setNewThreadTitle("")
      setNewThreadParticipantIds([])
      if (createdId) {
        setSelectedThreadId(createdId)
      }
    } catch (error) {
      setThreadError(error instanceof Error ? error.message : "Unable to create conversation.")
    }
  }

  async function handleSendMessage() {
    if (!selectedThreadId || !newMessageContent.trim()) {
      return
    }

    setMessageError(null)

    try {
      await resourceService.sendThreadMessage(selectedThreadId, newMessageContent)
      const refreshed = await resourceService.getThreadMessages(selectedThreadId, { limit: 500, page: 1 })
      setMessages(refreshed.results || [])
      setNewMessageContent("")
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Unable to send message.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">School Board Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Board-wide overview with term-based metrics, attendance health, and messaging.
          </p>
        </div>

       <CardContent>
            <div className="relative" ref={termSessionPickerRef}>
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm"
                onClick={() => setIsTermSessionPickerOpen((current) => !current)}
              >
                <span>{currentTermSessionLabel}</span>
              </button>

              {isTermSessionPickerOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-full space-y-3 rounded-md border bg-popover p-3 shadow-md">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-session">Academic Session</Label>
                    <select
                      id="dashboard-session"
                      className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={selectedSessionId}
                      onChange={(event) => handleSessionChange(event.target.value)}
                    >
                      <option value="">Select session</option>
                      {sessions.map((session) => {
                        const id = session._id ?? session.id ?? ""
                        return (
                          <option key={id} value={id}>
                            {session.startYear}/{session.endYear}
                            {session.isActive ? " (active)" : ""}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dashboard-term">Term</Label>
                    <select
                      id="dashboard-term"
                      className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                      value={selectedTermId}
                      onChange={(event) => handleTermChange(event.target.value)}
                    >
                      <option value="">Select term</option>
                      {termsForSelectedSession.map((term) => {
                        const id = term._id ?? term.id ?? ""
                        return (
                          <option key={id} value={id}>
                            {term.name}
                            {term.isActive ? " (active)" : ""}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${activeTab === "summary" ? "bg-accent" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          Summary
        </button>
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${activeTab === "notifications" ? "bg-accent" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          Notifications
        </button>
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading dashboard...</p> : null}

      {!loading && activeTab === "summary" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Schools Reporting Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{attendanceBySchool.length}</p>
                <p className="text-xs text-muted-foreground">Selected term</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Students Tracked</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{trackedStudentsCount}</p>
                <p className="text-xs text-muted-foreground">Selected term</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overall Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{overallAttendance}%</p>
                <p className="text-xs text-muted-foreground">Based on selected term</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Low Attendance Schools</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{schoolsWithLowAttendance}</p>
                <p className="text-xs text-muted-foreground">Below 70% average</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overall Attendance Chart (All Schools)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendanceLoading ? (
                <p className="text-sm text-muted-foreground">Loading attendance chart...</p>
              ) : attendanceBySchool.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance data for the selected term.</p>
              ) : (
                attendanceBySchool.map((item) => (
                  <div key={item.schoolId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.schoolName}</span>
                      <span>{item.percentage}%</span>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <QuickLink href="/dashboard/schools">Manage Schools</QuickLink>
                <QuickLink href="/dashboard/staff">Manage Staff</QuickLink>
                <QuickLink href="/dashboard/students">Manage Students</QuickLink>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {!loading && activeTab === "notifications" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>New Conversation</CardTitle>
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
                  <option value="general">General (Broadcast)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thread-title">Title (optional)</Label>
                <Input
                  id="thread-title"
                  value={newThreadTitle}
                  onChange={(event) => setNewThreadTitle(event.target.value)}
                  placeholder="Subject"
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

              {threadError ? <p className="text-sm text-destructive">{threadError}</p> : null}

              <button
                type="button"
                onClick={() => void handleCreateThread()}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Start Conversation
              </button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="thread-select">Conversation</Label>
                <select
                  id="thread-select"
                  className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                  value={selectedThreadId}
                  onChange={(event) => setSelectedThreadId(event.target.value)}
                >
                  <option value="">Select conversation</option>
                  {threads.map((thread) => {
                    const id = thread._id ?? thread.id ?? ""
                    return (
                      <option key={id} value={id}>
                        {thread.title || (thread.isBroadcast ? "Broadcast Message" : "Direct Message")}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
                {messagesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((message) => {
                    const id = message._id ?? message.id ?? `${message.sender}-${message.createdAt}`
                    return (
                      <div key={id} className="rounded-md bg-muted p-2 text-sm">
                        <p className="text-xs text-muted-foreground">Sender: {message.sender}</p>
                        <p>{message.content}</p>
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

              {messageError ? <p className="text-sm text-destructive">{messageError}</p> : null}

              <button
                type="button"
                onClick={() => void handleSendMessage()}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                disabled={!selectedThreadId || !newMessageContent.trim()}
              >
                Send Message
              </button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function QuickLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
      {children}
    </Link>
  )
}
