"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import type {
  AcademicSession,
  Message,
  MessageThread,
  School,
  SchoolEvent,
  Staff,
  Term,
} from "@/interfaces/resource-interface"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAY_NAMES_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getCalendarDays(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: Array<Date | null> = []
  for (let i = 0; i < first.getDay(); i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

const colorDotClass: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export default function DashboardPage() {
  const router = useRouter()
  const authUser = authService.getStoredUser()
  const isGuardian = authUser?.role === "guardian"
  const schoolBoardId = authUser?.schoolBoardId || undefined
  const today = new Date()

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

  // Notifications (message threads)
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Events calendar
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [selectedCalDate, setSelectedCalDate] = useState<Date | null>(null)
  const [calDateEvents, setCalDateEvents] = useState<SchoolEvent[]>([])
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  const calendarDays = getCalendarDays(calendarYear, calendarMonth)

  const selectedTerm = useMemo(
    () => terms.find((item) => (item._id ?? item.id) === selectedTermId) || null,
    [terms, selectedTermId]
  )
  const selectedSession = useMemo(
    () =>
      sessions.find(
        (item) => `${item.startYear}/${item.endYear}` === (selectedSessionId || selectedTerm?.academicSession)
      ) || null,
    [sessions, selectedSessionId, selectedTerm?.academicSession]
  )
  const termsForSelectedSession = useMemo(() => {
    if (!selectedSessionId) return terms
    return terms.filter((item) => item.academicSession === selectedSessionId)
  }, [terms, selectedSessionId])

  const currentTermSessionLabel = useMemo(() => {
    const termLabel = selectedTerm?.name || selectedTerm?.termName || "Select term"
    const sessionLabel = selectedSession
      ? `${selectedSession.startYear}/${selectedSession.endYear}`
      : "Select session"
    return `${termLabel} — ${sessionLabel}`
  }, [selectedSession, selectedTerm?.name, selectedTerm?.termName])

  const overallAttendance = useMemo(() => {
    if (attendanceBySchool.length === 0) return 0
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

  // Load initial data
  useEffect(() => {
    if (isGuardian) {
      router.replace("/dashboard/guardian")
      return
    }

    async function loadDashboard() {
      setLoading(true)
      setLoadError(null)

      try {
        const [schoolsResult, staffResult, termsResult, sessionsResult, threadsResult, eventsResult] =
          await Promise.all([
            resourceService.getSchools({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
            resourceService.getStaff({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
            resourceService.getTerms({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
            resourceService.getAcademicSessions({ schoolBoard: schoolBoardId, limit: 200, page: 1 }),
            resourceService.getMessageThreads({ limit: 100, page: 1 }),
            resourceService.getEvents({ limit: 500, page: 1 }),
          ])

        const schoolsList = schoolsResult.results || []
        const termsList = termsResult.results || []

        setSchools(schoolsList)
        setStaff(staffResult.results || [])
        setTerms(termsList)
        setSessions(sessionsResult.results || [])
        setThreads(threadsResult.results || [])
        setEvents(eventsResult.results || [])

        let defaultTermId = selectedTermId
        if (!defaultTermId) {
          const activeTerm = termsList.find((item: Term) => Boolean(item.isActive))
          const firstTerm = termsList[0]
          defaultTermId = activeTerm?._id ?? activeTerm?.id ?? firstTerm?._id ?? firstTerm?.id ?? ""
        }

        const defaultTerm = termsList.find((item: Term) => (item._id ?? item.id) === defaultTermId)
        const activeSession = (sessionsResult.results || []).find((item: AcademicSession) => Boolean(item.isActive))

        setSelectedTermId(defaultTermId)
        setSelectedSessionId(defaultTerm?.academicSession ?? (activeSession ? `${activeSession.startYear}/${activeSession.endYear}` : ""))
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load dashboard.")
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuardian, router, schoolBoardId])

  // Load attendance per term
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
            if (!schoolId) return null

            try {
              const summary = await resourceService.getAttendanceSummary({ school: schoolId, termId: selectedTermId })
              const rows = summary.rows || []
              const avg = rows.length
                ? Number((rows.reduce((sum, row) => sum + row.attendancePercentage, 0) / rows.length).toFixed(2))
                : 0

              return { schoolId, schoolName: school.name, percentage: avg, studentCount: rows.length }
            } catch {
              // Fallback to school-resolved active term when the selected term scope does not apply to this school.
              try {
                const summary = await resourceService.getAttendanceSummary({ school: schoolId })
                const rows = summary.rows || []
                const avg = rows.length
                  ? Number((rows.reduce((sum, row) => sum + row.attendancePercentage, 0) / rows.length).toFixed(2))
                  : 0

                return { schoolId, schoolName: school.name, percentage: avg, studentCount: rows.length }
              } catch {
                return null
              }
            }
          })
        )

        setAttendanceBySchool(
          results.filter(
            (item): item is { schoolId: string; schoolName: string; percentage: number; studentCount: number } =>
              Boolean(item)
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

  // Load thread messages when a thread is selected
  useEffect(() => {
    async function loadThreadMessages() {
      if (!selectedThreadId) {
        setMessages([])
        return
      }

      setMessagesLoading(true)

      try {
        const result = await resourceService.getThreadMessages(selectedThreadId, { limit: 100, page: 1 })
        setMessages(result.results || [])
      } catch {
        setMessages([])
      } finally {
        setMessagesLoading(false)
      }
    }

    void loadThreadMessages()
  }, [selectedThreadId])

  // Close term picker on outside click / escape
  useEffect(() => {
    if (!isTermSessionPickerOpen) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (termSessionPickerRef.current && !termSessionPickerRef.current.contains(target)) {
        setIsTermSessionPickerOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsTermSessionPickerOpen(false)
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
    const nextTerms = terms.filter((item) => item.academicSession === sessionId)
    if (nextTerms.length === 0) { setSelectedTermId(""); return }
    const currentTermStillValid = nextTerms.some((item) => (item._id ?? item.id) === selectedTermId)
    if (currentTermStillValid) return
    const activeTerm = nextTerms.find((item) => Boolean(item.isActive))
    const defaultTerm = activeTerm ?? nextTerms[0]
    setSelectedTermId(defaultTerm?._id ?? defaultTerm?.id ?? "")
  }

  function handleTermChange(termId: string) {
    setSelectedTermId(termId)
    const term = terms.find((item) => (item._id ?? item.id) === termId)
    if (term?.academicSession) setSelectedSessionId(term.academicSession)
    setIsTermSessionPickerOpen(false)
  }

  function getEventsOnDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.startDate), day))
  }

  function handleCalDayClick(day: Date) {
    setSelectedCalDate(day)
    setCalDateEvents(getEventsOnDay(day))
    setIsEventModalOpen(true)
  }

  // suppress unused staff warning — kept for future board-admin features
  void staff

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Board-wide overview with term-based metrics and attendance.</p>
        </div>

        {/* Term / Session picker */}
        <div className="relative w-72" ref={termSessionPickerRef}>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm"
            onClick={() => setIsTermSessionPickerOpen((c) => !c)}
          >
            <span className="truncate">{currentTermSessionLabel}</span>
            <span className="ml-2 text-muted-foreground">▾</span>
          </button>

          {isTermSessionPickerOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-full space-y-3 rounded-md border bg-popover p-3 shadow-md">
              <div className="space-y-2">
                <Label htmlFor="dashboard-session">Academic Session</Label>
                <select
                  id="dashboard-session"
                  className="h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                  value={selectedSessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => {
                    const sessionStr = `${session.startYear}/${session.endYear}`
                    return (
                      <option key={sessionStr} value={sessionStr}>
                        {sessionStr}
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
                  onChange={(e) => handleTermChange(e.target.value)}
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
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading dashboard…</p> : null}

      {/* KPI Cards */}
      {!loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Schools Reporting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{attendanceBySchool.length}</p>
              <p className="text-xs text-muted-foreground">This term</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Students Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{trackedStudentsCount}</p>
              <p className="text-xs text-muted-foreground">This term</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Overall Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{overallAttendance}%</p>
              <p className="text-xs text-muted-foreground">Selected term average</p>
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
      ) : null}

      {/* Attendance Chart */}
      {!loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Attendance by School</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendanceLoading ? (
              <p className="text-sm text-muted-foreground">Loading chart…</p>
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
                    <div
                      className="h-2 rounded bg-primary"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Actions */}
      {!loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/dashboard/schools">Manage Schools</QuickLink>
              <QuickLink href="/dashboard/staff">Manage Staff</QuickLink>
              <QuickLink href="/dashboard/students">Manage Students</QuickLink>
              <QuickLink href="/dashboard/events">Manage Events</QuickLink>
              <QuickLink href="/dashboard/messaging">Messaging</QuickLink>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Notifications + Events Calendar side by side */}
      {!loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Notifications (Message Thread History) */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notifications</CardTitle>
                <Link
                  href="/dashboard/messaging"
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Open Messaging →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              {threads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                <div className="space-y-1">
                  {threads.map((thread) => {
                    const id = thread._id ?? thread.id ?? ""
                    const label = thread.title || (thread.isBroadcast ? "Broadcast" : "Direct Message")
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedThreadId(selectedThreadId === id ? "" : id)}
                        className={[
                          "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                          selectedThreadId === id ? "bg-accent font-medium" : "",
                        ].join(" ")}
                      >
                        <span className="block truncate">{label}</span>
                        {thread.isBroadcast ? (
                          <span className="text-xs text-muted-foreground">Broadcast</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedThreadId ? (
                <div className="mt-2 rounded-md border p-2">
                  {messagesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages in this thread.</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {messages.map((msg) => {
                        const msgId = msg._id ?? msg.id ?? `${msg.sender}-${msg.createdAt}`
                        return (
                          <div key={msgId} className="rounded bg-muted p-2 text-sm">
                            <p className="text-xs font-medium text-muted-foreground">{msg.sender}</p>
                            <p>{msg.content}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Events Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    onClick={() => {
                      if (calendarMonth === 0) { setCalendarYear((y) => y - 1); setCalendarMonth(11) }
                      else { setCalendarMonth((m) => m - 1) }
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    onClick={() => { setCalendarYear(today.getFullYear()); setCalendarMonth(today.getMonth()) }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    onClick={() => {
                      if (calendarMonth === 11) { setCalendarYear((y) => y + 1); setCalendarMonth(0) }
                      else { setCalendarMonth((m) => m + 1) }
                    }}
                  >
                    ›
                  </button>
                  <Link
                    href="/dashboard/events"
                    className="ml-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                  >
                    All Events →
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-1">
                {DAY_NAMES_SHORT.map((d) => (
                  <div key={d} className="py-0.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((day, index) => {
                  if (!day) return <div key={`empty-${index}`} />

                  const dayEvents = getEventsOnDay(day)
                  const isToday = isSameDay(day, today)
                  const hasEvents = dayEvents.length > 0

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleCalDayClick(day)}
                      className={[
                        "relative flex flex-col items-center rounded py-1 text-xs transition-colors hover:bg-accent",
                        isToday ? "font-bold text-primary" : "",
                        hasEvents ? "ring-1 ring-primary" : "",
                      ].join(" ")}
                    >
                      <span>{day.getDate()}</span>
                      {hasEvents ? (
                        <div className="mt-0.5 flex gap-0.5">
                          {dayEvents.slice(0, 2).map((e) => (
                            <span
                              key={e._id ?? e.id}
                              className={`inline-block h-1 w-1 rounded-full ${colorDotClass[e.color ?? "blue"] ?? "bg-primary"}`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Event Day Modal */}
      {isEventModalOpen && selectedCalDate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsEventModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">
              {selectedCalDate.getDate()} {MONTH_NAMES[selectedCalDate.getMonth()]} {selectedCalDate.getFullYear()}
            </h3>
            {calDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events on this day.</p>
            ) : (
              <div className="space-y-3">
                {calDateEvents.map((event) => (
                  <div key={event._id ?? event.id} className="rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass[event.color ?? "blue"] ?? "bg-primary"}`}
                      />
                      <p className="font-medium">{event.title}</p>
                    </div>
                    {event.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    ) : null}
                    {event.endDate ? (
                      <p className="mt-1 text-xs text-muted-foreground">Ends: {formatShortDate(event.endDate)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-between">
              <Link
                href="/dashboard/events"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                onClick={() => setIsEventModalOpen(false)}
              >
                Manage Events →
              </Link>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                onClick={() => setIsEventModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function QuickLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
    >
      {children}
    </Link>
  )
}
