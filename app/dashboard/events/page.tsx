"use client"

import { useEffect, useState } from "react"
import { authService } from "@/services/auth-service"
import { resourceService } from "@/services/resource-service"
import type { SchoolEvent, CreateEventInput } from "@/interfaces/resource-interface"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

function getCalendarDays(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: Array<Date | null> = []

  for (let i = 0; i < first.getDay(); i++) {
    days.push(null)
  }

  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  return days
}

const EVENT_COLORS: { label: string; value: string; bg: string }[] = [
  { label: "Blue", value: "blue", bg: "bg-blue-500" },
  { label: "Green", value: "green", bg: "bg-green-500" },
  { label: "Red", value: "red", bg: "bg-red-500" },
  { label: "Yellow", value: "yellow", bg: "bg-yellow-500" },
  { label: "Purple", value: "purple", bg: "bg-purple-500" },
]

const colorDotClass: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
}

export default function EventsPage() {
  const authUser = authService.getStoredUser()
  const schoolBoardId = authUser?.schoolBoardId || undefined
  const canWrite = ["super-admin", "admin", "school-board-admin", "school-admin"].includes(authUser?.role ?? "")

  const today = new Date()
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())

  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateEvents, setSelectedDateEvents] = useState<SchoolEvent[]>([])
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createStartDate, setCreateStartDate] = useState("")
  const [createEndDate, setCreateEndDate] = useState("")
  const [createAllDay, setCreateAllDay] = useState(true)
  const [createColor, setCreateColor] = useState("blue")
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const calendarDays = getCalendarDays(calendarYear, calendarMonth)

  function getEventsOnDay(day: Date) {
    return events.filter((event) => {
      const start = new Date(event.startDate)
      return isSameDay(start, day)
    })
  }

  function handleDayClick(day: Date) {
    const dayEvents = getEventsOnDay(day)
    setSelectedDate(day)
    setSelectedDateEvents(dayEvents)
    setIsDateModalOpen(true)
  }

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1)
      setCalendarMonth(11)
    } else {
      setCalendarMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1)
      setCalendarMonth(0)
    } else {
      setCalendarMonth((m) => m + 1)
    }
  }

  async function loadEvents() {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await resourceService.getEvents({
        limit: 500,
        page: 1,
        ...(schoolBoardId ? {} : {}),
      })
      setEvents(result.results || [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load events.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolBoardId])

  async function handleCreateEvent() {
    if (!createTitle.trim() || !createStartDate) {
      setCreateError("Title and start date are required.")
      return
    }

    setCreateError(null)
    setCreateSubmitting(true)

    try {
      const input: CreateEventInput = {
        title: createTitle.trim(),
        startDate: createStartDate,
        allDay: createAllDay,
        color: createColor,
      }

      if (createDescription.trim()) {
        input.description = createDescription.trim()
      }

      if (createEndDate) {
        input.endDate = createEndDate
      }

      await resourceService.createEvent(input)
      setCreateTitle("")
      setCreateDescription("")
      setCreateStartDate("")
      setCreateEndDate("")
      setCreateAllDay(true)
      setCreateColor("blue")
      setIsCreateOpen(false)
      await loadEvents()
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create event.")
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      await resourceService.deleteEvent(eventId)
      setDeleteConfirmId(null)
      setIsDateModalOpen(false)
      await loadEvents()
    } catch {
      // silent
    }
  }

  const upcomingEvents = events
    .filter((e) => new Date(e.startDate) >= today)
    .slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Events</h2>
          <p className="text-sm text-muted-foreground">School calendar and scheduled events.</p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsCreateOpen(true)}
          >
            + Create Event
          </button>
        ) : null}
      </div>

      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading events...</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{MONTH_NAMES[calendarMonth]} {calendarYear}</CardTitle>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                  onClick={prevMonth}
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
                  onClick={nextMonth}
                >
                  ›
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} />
                }

                const dayEvents = getEventsOnDay(day)
                const isToday = isSameDay(day, today)
                const hasEvents = dayEvents.length > 0

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={[
                      "relative flex flex-col items-center rounded-md p-1 text-sm transition-colors hover:bg-accent",
                      isToday ? "font-bold text-primary" : "",
                      hasEvents ? "ring-2 ring-primary ring-offset-1" : "",
                    ].join(" ")}
                  >
                    <span>{day.getDate()}</span>
                    {hasEvents ? (
                      <div className="mt-0.5 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <span
                            key={e._id ?? e.id}
                            className={`inline-block h-1.5 w-1.5 rounded-full ${colorDotClass[e.color ?? "blue"] ?? "bg-primary"}`}
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

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              upcomingEvents.map((event) => {
                const id = event._id ?? event.id ?? ""
                return (
                  <div key={id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${colorDotClass[event.color ?? "blue"] ?? "bg-primary"}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.startDate)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Events List */}
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Start Date</th>
                    <th className="py-2 pr-4">End Date</th>
                    <th className="py-2 pr-4">All Day</th>
                    {canWrite ? <th className="py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const id = event._id ?? event.id ?? ""
                    return (
                      <tr key={id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${colorDotClass[event.color ?? "blue"] ?? "bg-primary"}`}
                            />
                            {event.title}
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatDate(event.startDate)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {event.endDate ? formatDate(event.endDate) : "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{event.allDay ? "Yes" : "No"}</td>
                        {canWrite ? (
                          <td className="py-2">
                            {deleteConfirmId === id ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="text-xs text-destructive hover:underline"
                                  onClick={() => void handleDeleteEvent(id)}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:underline"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteConfirmId(id)}
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Modal */}
      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Create Event</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="event-title">Title *</Label>
                <Input
                  id="event-title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Event title"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="event-desc">Description</Label>
                <Input
                  id="event-desc"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="event-start">Start Date *</Label>
                  <Input
                    id="event-start"
                    type="date"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="event-end">End Date</Label>
                  <Input
                    id="event-end"
                    type="date"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="event-allday"
                  type="checkbox"
                  checked={createAllDay}
                  onChange={(e) => setCreateAllDay(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="event-allday">All Day</Label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="event-color">Color</Label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setCreateColor(c.value)}
                      className={`h-6 w-6 rounded-full ${c.bg} ${createColor === c.value ? "ring-2 ring-offset-1 ring-foreground" : ""}`}
                    />
                  ))}
                </div>
              </div>

              {createError ? <p className="text-sm text-destructive">{createError}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  disabled={createSubmitting}
                  onClick={() => void handleCreateEvent()}
                >
                  {createSubmitting ? "Creating…" : "Create Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Day Events Modal */}
      {isDateModalOpen && selectedDate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setIsDateModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">
              {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events on this day.</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => {
                  const id = event._id ?? event.id ?? ""
                  return (
                    <div key={id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass[event.color ?? "blue"] ?? "bg-primary"}`}
                          />
                          <p className="font-medium">{event.title}</p>
                        </div>
                        {canWrite ? (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => void handleDeleteEvent(id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                      {event.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      ) : null}
                      {event.endDate ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ends: {formatDate(event.endDate)}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                onClick={() => setIsDateModalOpen(false)}
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
