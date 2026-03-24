import type {
  CreateSchoolBoardInput,
  CreateSchoolInput,
  CreateStaffInput,
  CreateSchoolTypeInput,
  CreateClassInput,
  PaginatedResponse,
  School,
  SchoolBoard,
  SchoolType,
  Class,
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
}