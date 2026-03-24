export interface PaginatedResponse<T> {
  results: T[]
  page: number
  limit: number
  totalPages: number
  totalResults: number
}

export interface SchoolBoard {
  id?: string
  _id?: string
  name: string
  code?: string
  description?: string
  status?: "active" | "inactive"
}

export interface CreateSchoolBoardInput {
  name: string
  code?: string
  description?: string
  status?: "active" | "inactive"
  superAdmin: {
    name: string
    email: string
    password: string
    phoneNumber?: string
  }
}

export interface School {
  id?: string
  _id?: string
  name: string
  schoolBoard?: string | null
  schoolTypes?: string[]
  classes?: string[]
  address?: string
  state?: string
  localGovernment?: string
  district?: string
  longitude?: number
  latitude?: number
  status?: "active" | "inactive"
}

export interface CreateSchoolInput {
  name: string
  schoolBoard?: string
  schoolTypes?: string[]
  address?: string
  state?: string
  localGovernment?: string
  district?: string
  longitude?: number
  latitude?: number
  status?: "active" | "inactive"
}

export interface Staff {
  id?: string
  _id?: string
  schoolBoard?: string | null
  school?: string | null
  employeeId?: string
  designation?: string
  employmentType?: "teacher" | "staff"
  isActive?: boolean
}

export interface CreateStaffInput {
  schoolBoard?: string
  school?: string
  employeeId?: string
  designation?: string
  employmentType?: "teacher" | "staff"
  isActive?: boolean
  user: {
    name: string
    email: string
    password: string
    phoneNumber?: string
    role?: "teacher" | "staff"
  }
}

export interface SchoolType {
  id?: string
  _id?: string
  name: string
}

export interface CreateSchoolTypeInput {
  name: string
}

export interface Class {
  id?: string
  _id?: string
  name: string
  code: string
  schoolTypeId: string
}

export interface CreateClassInput {
  name: string
  code: string
  schoolTypeId: string
}

export type InternalUserRole = "super-admin" | "admin"

export const INTERNAL_USER_PERMISSIONS = [
  "users.read",
  "users.write",
  "auth.read",
  "auth.write",
  "schoolBoards.read",
  "schoolBoards.write",
  "schools.read",
  "schools.write",
  "staff.read",
  "staff.write",
  "schoolTypes.read",
  "schoolTypes.write",
  "classes.read",
  "classes.write",
  "students.read",
  "students.write",
  "attendance.read",
  "terms.read",
  "terms.write",
  "academicSessions.read",
  "academicSessions.write",
] as const

export type InternalUserPermission = (typeof INTERNAL_USER_PERMISSIONS)[number]

export interface InternalUser {
  id?: string
  _id?: string
  name: string
  email: string
  phoneNumber?: string | null
  role?: string
  accountType?: string
  status?: "active" | "disabled"
  isVerified?: boolean
  permissions?: string[]
}

export interface CreateInternalUserInput {
  name: string
  email: string
  password: string
  phoneNumber?: string
  role: InternalUserRole
  permissions: string[]
}

export interface UpdateInternalUserInput {
  name?: string
  email?: string
  phoneNumber?: string
  role?: InternalUserRole
  permissions?: string[]
  status?: "active" | "disabled"
}

export interface StudentHistory {
  fromSchool?: string | null
  toSchool?: string | null
  fromClassId?: string | null
  toClassId: string
  action: "created" | "promoted" | "transferred"
  changedAt: string
}

export interface Student {
  id?: string
  _id?: string
  firstName: string
  middleName?: string | null
  lastName: string
  regNumber: string
  stateOfOrigin: string
  localGovernment: string
  gender: "male" | "female"
  dateOfBirth: string
  schoolBoard?: string | null
  school: string
  classId: string
  status?: "active" | "inactive"
  promotionHistory?: StudentHistory[]
}

export interface CreateStudentInput {
  firstName: string
  middleName?: string
  lastName: string
  regNumber: string
  stateOfOrigin: string
  localGovernment: string
  gender: "male" | "female"
  dateOfBirth: string
  school: string
  classId: string
  status?: "active" | "inactive"
}

export interface PromoteStudentInput {
  school?: string
  classId: string
}

export interface BulkCreateStudentsInput {
  students: CreateStudentInput[]
}

export interface AttendanceDay {
  date: string
  label: string
}

export interface AttendanceSummaryRow {
  studentId: string
  studentName: string
  regNumber: string
  attendancePercentage: number
  statusByDate: Record<string, string>
}

export interface AttendanceSummary {
  school: {
    id: string
    name: string
  }
  term: {
    id: string
    name: string
    academicSessionId: string
    schoolBoard: string
    school?: string | null
    startDate: string
    endDate: string
    isActive: boolean
    resolvedScope: "school" | "school-board"
  }
  days: AttendanceDay[]
  rows: AttendanceSummaryRow[]
}