import type {
  AcademicSession,
  AttendanceSummary,
  BulkCreateSchoolsInput,
  BulkCreateStudentsInput,
  BulkImportSchoolsResult,
  Class,
  CreateClassInput,
  CreateInternalUserInput,
  CreateSchoolBoardInput,
  CreateSchoolInput,
  CreateSchoolTypeInput,
  CreateStaffInput,
  CreateStudentInput,
  CreateTermInput,
  InternalUser,
  PaginatedResponse,
  PromoteStudentInput,
  School,
  SchoolBoard,
  SchoolType,
  Staff,
  Student,
  Term,
  UpdateInternalUserInput,
  UpdateTermInput,
} from "@/interfaces/resource-interface"
import { request } from "@/services/http"

function toQueryString(params?: Record<string, string | number | undefined>) {
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
  bulkCreateSchools(input: BulkCreateSchoolsInput) {
    return request<BulkImportSchoolsResult>("/api/schools/bulk-import", {
      method: "POST",
      body: input,
    })
  },

  getStaff() {
    return request<PaginatedResponse<Staff>>("/api/staff")
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
    academicSessionId?: string
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
}