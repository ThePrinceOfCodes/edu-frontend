import type {
  CreateSchoolBoardInput,
  CreateSchoolInput,
  CreateStaffInput,
  CreateSchoolTypeInput,
  CreateClassInput,
  CreateStudentInput,
  PromoteStudentInput,
  BulkCreateStudentsInput,
  AttendanceSummary,
  PaginatedResponse,
  School,
  SchoolBoard,
  SchoolType,
  Class,
  Student,
  Staff,
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
  createSchoolBoard(input: CreateSchoolBoardInput) {
    return request<SchoolBoard>("/api/school-boards", {
      method: "POST",
      body: input,
    })
  },

  getSchools() {
    return request<PaginatedResponse<School>>("/api/schools")
  },
  createSchool(input: CreateSchoolInput) {
    return request<School>("/api/schools", {
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
}