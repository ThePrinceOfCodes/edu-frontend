import type {
  AcademicSession,
  AttendanceSummary,
  BulkCreateSchoolsInput,
  BulkCreateStudentsInput,
  BulkImportSchoolsResult,
  Class,
  CreateClassInput,
  CreateEventInput,
  CreateInternalUserInput,
  CreateSchoolBoardInput,
  CreateSchoolInput,
  CreateSchoolTypeInput,
  CreateStaffInput,
  CreateStudentInput,
  CreateTermInput,
  CreateMessageThreadInput,
  InternalUser,
  Message,
  MessageThread,
  PaginatedResponse,
  PromoteStudentInput,
  School,
  SchoolBoard,
  SchoolEvent,
  SchoolType,
  Staff,
  Student,
  Term,
  UpdateEventInput,
  UpdateSchoolInput,
  UpdateInternalUserInput,
  UpdateTermInput,
} from "@/interfaces/resource-interface"
import { request } from "@/services/http"

function toQueryString(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) {
    return ""
  }

  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return
    }

    query.set(key, String(value))
  })

  const queryString = query.toString()
  return queryString ? `?${queryString}` : ""
}

export const resourceService = {
  getSchoolBoards() {
    return request<PaginatedResponse<SchoolBoard>>("/api/school-boards")
  },
  getSchoolBoardById(schoolBoardId: string) {
    return request<SchoolBoard>(`/api/school-boards/${schoolBoardId}`)
  },
  createSchoolBoard(input: CreateSchoolBoardInput) {
    return request<SchoolBoard>("/api/school-boards", {
      method: "POST",
      body: input,
    })
  },
  updateSchoolBoard(schoolBoardId: string, input: Partial<CreateSchoolBoardInput>) {
    return request<SchoolBoard>(`/api/school-boards/${schoolBoardId}`, {
      method: "PATCH",
      body: input,
    })
  },
  deleteSchoolBoard(schoolBoardId: string) {
    return request<Record<string, never>>(`/api/school-boards/${schoolBoardId}`, {
      method: "DELETE",
    })
  },

  getSchools(params?: {
    limit?: number
    page?: number
    schoolBoard?: string
    status?: "active" | "inactive"
  }) {
    return request<PaginatedResponse<School>>(`/api/schools${toQueryString(params)}`)
  },
  createSchool(input: CreateSchoolInput) {
    return request<School>("/api/schools", {
      method: "POST",
      body: input,
    })
  },
  getSchoolById(schoolId: string) {
    return request<School>(`/api/schools/${schoolId}`)
  },
  updateSchool(schoolId: string, input: UpdateSchoolInput) {
    return request<School>(`/api/schools/${schoolId}`, {
      method: "PATCH",
      body: input,
    })
  },
  deactivateSchool(schoolId: string) {
    return request<School>(`/api/schools/${schoolId}`, {
      method: "PATCH",
      body: { status: "inactive" },
    })
  },
  deleteSchool(schoolId: string) {
    return request<Record<string, never>>(`/api/schools/${schoolId}`, {
      method: "DELETE",
    })
  },
  bulkCreateSchools(input: BulkCreateSchoolsInput) {
    return request<BulkImportSchoolsResult>("/api/schools/bulk-import", {
      method: "POST",
      body: input,
    })
  },

  getStaff(params?: {
    limit?: number
    page?: number
    schoolBoard?: string
    school?: string
    employmentType?: "teacher" | "staff"
    isActive?: boolean
  }) {
    return request<PaginatedResponse<Staff>>(`/api/staff${toQueryString(params)}`)
  },
  createStaff(input: CreateStaffInput) {
    return request<Staff>("/api/staff", {
      method: "POST",
      body: input,
    })
  },

  getSchoolTypes(params?: { limit?: number; page?: number }) {
    return request<PaginatedResponse<SchoolType>>(`/api/school-types${toQueryString(params)}`)
  },
  createSchoolType(input: CreateSchoolTypeInput) {
    return request<SchoolType>("/api/school-types", {
      method: "POST",
      body: input,
    })
  },

  getClasses(params?: { limit?: number; page?: number; schoolTypeId?: string }) {
    return request<PaginatedResponse<Class>>(`/api/classes${toQueryString(params)}`)
  },
  createClass(input: CreateClassInput) {
    return request<Class>("/api/classes", {
      method: "POST",
      body: input,
    })
  },

  getStudents(params?: { limit?: number; page?: number; school?: string; classId?: string }) {
    return request<PaginatedResponse<Student>>(`/api/students${toQueryString(params)}`)
  },
  createStudent(input: CreateStudentInput) {
    return request<Student>("/api/students", {
      method: "POST",
      body: input,
    })
  },
  bulkCreateStudents(input: BulkCreateStudentsInput) {
    return request<{
      total: number
      createdCount: number
      failedCount: number
      created: Student[]
      failed: Array<{ row: number; regNumber?: string; reason: string }>
    }>("/api/students/bulk-import", {
      method: "POST",
      body: input,
    })
  },
  promoteStudent(studentId: string, input: PromoteStudentInput) {
    return request<Student>(`/api/students/${studentId}/promote`, {
      method: "POST",
      body: input,
    })
  },
  getAttendanceSummary(params?: { school?: string; termId?: string }) {
    return request<AttendanceSummary>(`/api/attendance/summary${toQueryString(params)}`)
  },

  getAcademicSessions(params?: { limit?: number; page?: number; schoolBoard?: string }) {
    return request<PaginatedResponse<AcademicSession>>(
      `/api/academic-sessions${toQueryString(params)}`
    )
  },
  getTerms(params?: {
    limit?: number
    page?: number
    academicSession?: string
    schoolBoard?: string
    school?: string
    isActive?: boolean
  }) {
    return request<PaginatedResponse<Term>>(`/api/terms${toQueryString(params)}`)
  },
  createTerm(input: CreateTermInput) {
    return request<Term>("/api/terms", {
      method: "POST",
      body: input,
    })
  },
  updateTerm(termId: string, input: UpdateTermInput) {
    return request<Term>(`/api/terms/${termId}`, {
      method: "PATCH",
      body: input,
    })
  },
  deleteTerm(termId: string) {
    return request<Record<string, never>>(`/api/terms/${termId}`, {
      method: "DELETE",
    })
  },
  getActiveTerm(params?: { school?: string }) {
    return request<Term>(`/api/terms/active${toQueryString(params)}`)
  },

  getMessageThreads(params?: { limit?: number; page?: number; sortBy?: string }) {
    return request<PaginatedResponse<MessageThread>>(`/api/messages/threads${toQueryString(params)}`)
  },
  createMessageThread(input: CreateMessageThreadInput) {
    return request<MessageThread>("/api/messages/threads", {
      method: "POST",
      body: input,
    })
  },
  getThreadMessages(threadId: string, params?: { limit?: number; page?: number; sortBy?: string }) {
    return request<PaginatedResponse<Message>>(
      `/api/messages/threads/${threadId}/messages${toQueryString(params)}`
    )
  },
  sendThreadMessage(
    threadId: string,
    content: string,
    attachments?: Array<{ name: string; url: string; type?: string; size?: number }>
  ) {
    return request<Message>(`/api/messages/threads/${threadId}/messages`, {
      method: "POST",
      body: { content, attachments },
    })
  },

  getUsers(params?: { limit?: number; page?: number; accountType?: string; role?: string }) {
    return request<PaginatedResponse<InternalUser>>(`/api/users${toQueryString(params)}`)
  },
  createInternalUser(input: CreateInternalUserInput) {
    return request<InternalUser>("/api/users", {
      method: "POST",
      body: input,
    })
  },
  getUserById(userId: string) {
    return request<InternalUser>(`/api/users/${userId}`)
  },
  updateUser(userId: string, input: UpdateInternalUserInput) {
    return request<InternalUser>(`/api/users/${userId}`, {
      method: "PATCH",
      body: input,
    })
  },
  deactivateUser(userId: string) {
    return request<InternalUser>(`/api/users/${userId}/deactivate`, {
      method: "POST",
    })
  },
  deleteUser(userId: string) {
    return request<InternalUser>(`/api/users/${userId}`, {
      method: "DELETE",
    })
  },

  getEvents(params?: {
    limit?: number
    page?: number
    school?: string
    startDate?: string
    endDate?: string
  }) {
    return request<PaginatedResponse<SchoolEvent>>(`/api/events${toQueryString(params)}`)
  },
  createEvent(input: CreateEventInput) {
    return request<SchoolEvent>("/api/events", {
      method: "POST",
      body: input,
    })
  },
  updateEvent(eventId: string, input: UpdateEventInput) {
    return request<SchoolEvent>(`/api/events/${eventId}`, {
      method: "PATCH",
      body: input,
    })
  },
  deleteEvent(eventId: string) {
    return request<Record<string, never>>(`/api/events/${eventId}`, {
      method: "DELETE",
    })
  },
}