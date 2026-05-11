import type {
  AcademicSession,
  AttendantExtraction,
  AttendanceExtractionExportFormat,
  AttendanceSummary,
  BulkCreateSchoolsInput,
  BulkCreateStudentsInput,
  BulkCreateResultsInput,
  BulkImportSchoolsResult,
  Class,
  CreateClassInput,
  CreateEventInput,
  CreateGuardianInput,
  CreateInternalUserInput,
  CreateSchoolBoardInput,
  CreateSchoolInput,
  CreateSchoolTypeInput,
  CreateSubjectInput,
  CreateResultInput,
  CreateStaffInput,
  CreateStudentInput,
  CreateTermInput,
  GuardiansListResponse,
  CreateMessageThreadInput,
  GuardianStudentsOverviewResponse,
  InternalUser,
  Message,
  MessageThread,
  PaginatedResponse,
  PromoteStudentInput,
  ResultRecord,
  School,
  SchoolBoard,
  SchoolEvent,
  SchoolType,
  Subject,
  Staff,
  Student,
  Term,
  UpdateEventInput,
  UpdateSchoolInput,
  UpdateInternalUserInput,
  UpdateResultInput,
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

  getSubjects(params?: { limit?: number; page?: number; name?: string; code?: string }) {
    return request<PaginatedResponse<Subject>>(`/api/subjects${toQueryString(params)}`)
  },
  createSubject(input: CreateSubjectInput) {
    return request<Subject>("/api/subjects", {
      method: "POST",
      body: input,
    })
  },

  getClasses(params?: { limit?: number; page?: number; schoolTypeId?: string; schoolId?: string }) {
    return request<PaginatedResponse<Class>>(`/api/classes${toQueryString(params)}`)
  },
  createClass(input: CreateClassInput) {
    return request<Class>("/api/classes", {
      method: "POST",
      body: input,
    })
  },

  getStudents(params?: {
    limit?: number
    page?: number
    q?: string
    school?: string
    classId?: string
    gender?: "male" | "female"
    academicSession?: string
    academicSessionId?: string
  }) {
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
  createGuardian(input: CreateGuardianInput) {
    return request<{
      guardian: InternalUser
      linkedStudentsCount: number
      linkedStudentIds: string[]
    }>("/api/guardians", {
      method: "POST",
      body: input,
    })
  },
  getGuardians(params?: { q?: string }) {
    return request<GuardiansListResponse>(`/api/guardians${toQueryString(params)}`)
  },
  linkStudentsToGuardian(guardianId: string, studentIds: string[]) {
    return request<{ guardianId: string; linkedStudentIds: string[]; linkedStudentsCount: number }>(
      `/api/guardians/${guardianId}/link-students`,
      {
        method: "POST",
        body: { studentIds },
      }
    )
  },
  unlinkStudentsFromGuardian(guardianId: string, studentIds: string[]) {
    return request<{ guardianId: string; unlinkedStudentIds: string[]; unlinkedStudentsCount: number }>(
      `/api/guardians/${guardianId}/unlink-students`,
      {
        method: "POST",
        body: { studentIds },
      }
    )
  },
  getGuardianStudentsOverview() {
    return request<GuardianStudentsOverviewResponse>("/api/guardians/me/students-overview")
  },
  getAttendanceSummary(params?: { school?: string; termId?: string; classId?: string }) {
    return request<AttendanceSummary>(`/api/attendance/summary${toQueryString(params)}`)
  },

  getResults(params?: {
    limit?: number
    page?: number
    student?: string
    school?: string
    classId?: string
    termId?: string
    academicSessionId?: string
    subject?: string
  }) {
    return request<PaginatedResponse<ResultRecord>>(`/api/results${toQueryString(params)}`)
  },
  createResult(input: CreateResultInput) {
    return request<ResultRecord>("/api/results", {
      method: "POST",
      body: input,
    })
  },
  bulkCreateResults(input: BulkCreateResultsInput) {
    return request<{
      total: number
      createdCount: number
      failedCount: number
      created: ResultRecord[]
      failed: Array<{ row: number; student?: string; reason: string }>
    }>("/api/results/bulk-import", {
      method: "POST",
      body: input,
    })
  },
  getResultById(resultId: string) {
    return request<ResultRecord>(`/api/results/${resultId}`)
  },
  updateResult(resultId: string, input: UpdateResultInput) {
    return request<ResultRecord>(`/api/results/${resultId}`, {
      method: "PATCH",
      body: input,
    })
  },
  deleteResult(resultId: string) {
    return request<Record<string, never>>(`/api/results/${resultId}`, {
      method: "DELETE",
    })
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

  getExtractions(params?: { status?: string; limit?: number; page?: number; sortBy?: string }) {
    return request<PaginatedResponse<AttendantExtraction>>(
      `/api/attendant-extractions${toQueryString(params)}`
    )
  },
  getPendingReviewExtractions(params?: { limit?: number; page?: number; sortBy?: string }) {
    return request<PaginatedResponse<AttendantExtraction>>(
      `/api/attendant-extractions/pending-review${toQueryString(params)}`
    )
  },
  getExtractionById(id: string) {
    return request<AttendantExtraction>(`/api/attendant-extractions/${id}`)
  },
  correctExtraction(id: string, input: Record<string, any>) {
    return request<AttendantExtraction>(`/api/attendant-extractions/${id}/correct`, {
      method: "PATCH",
      body: input,
    })
  },
  approveExtraction(id: string) {
    return request<AttendantExtraction>(`/api/attendant-extractions/${id}/approve`, {
      method: "POST",
    })
  },
  exportExtraction(id: string, format: AttendanceExtractionExportFormat) {
    return request<string>(`/api/attendant-extractions/${id}/export${toQueryString({ format })}`)
  },
}
