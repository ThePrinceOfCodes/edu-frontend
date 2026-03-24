import type {
  CreateSchoolBoardInput,
  CreateSchoolInput,
  CreateStaffInput,
  PaginatedResponse,
  School,
  SchoolBoard,
  Staff,
} from "@/interfaces/resource-interface"
import { request } from "@/services/http"

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
}