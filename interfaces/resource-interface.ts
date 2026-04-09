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
  createdAt?: string
  updatedAt?: string
  superAdminUser?:
    | string
    | {
        id?: string
        _id?: string
        name?: string
        email?: string
        phoneNumber?: string | null
      }
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
  schoolBoard?: string | { id?: string; _id?: string; name?: string } | null
  schoolTypes?: string[]
  classes?: string[]
  adminUser?: string | null
  adminUsers?: string[]
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
  classes?: string[]
  address?: string
  state?: string
  localGovernment?: string
  district?: string
  longitude?: number
  latitude?: number
  status?: "active" | "inactive"
}

export interface UpdateSchoolInput {
  name?: string
  schoolTypes?: string[]
  address?: string | null
  state?: string | null
  localGovernment?: string | null
  district?: string | null
  longitude?: number
  latitude?: number
  adminUser?: string | null
  adminUsers?: string[]
  status?: "active" | "inactive"
}

export interface BulkCreateSchoolInput {
  name: string
  schoolBoard?: string
  address?: string
  state?: string
  localGovernment?: string
  district?: string
  longitude?: number
  latitude?: number
  status?: "active" | "inactive"
}

export interface BulkCreateSchoolsInput {
  schools: BulkCreateSchoolInput[]
}

export interface BulkImportSchoolsResult {
  total: number
  createdCount: number
  failedCount: number
  created: School[]
  failed: Array<{ row: number; name?: string; reason: string }>
}

export interface Staff {
  id?: string
  _id?: string
  schoolBoard?: string | null
  school?: string | null
  user?:
    | string
    | {
        id?: string
        _id?: string
        name?: string
        email?: string
      }
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

export interface AcademicSession {
  id?: string
  _id?: string
  name?: string | null
  startYear: number
  endYear: number
  schoolBoard: string
  isActive?: boolean
}

export interface Term {
  id?: string
  _id?: string
  name: string
  termName: string
  academicSession: string
  schoolBoard: string
  school?: string | null
  startDate: string
  endDate: string
  isActive?: boolean
}

export interface CreateTermInput {
  termName: string
  academicSession: string
  schoolBoard?: string
  school?: string
  startDate: string
  endDate: string
  isActive?: boolean
}

export interface UpdateTermInput {
  termName?: string
  school?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
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
    academicSession: string
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

export interface MessageThread {
  id?: string
  _id?: string
  title?: string | null
  schoolBoard?: string | null
  createdBy: string
  participants: string[]
  isBroadcast?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Message {
  id?: string
  _id?: string
  thread: string
  sender: string
  content: string
  attachments?: Array<{
    name: string
    url: string
    type?: string
    size?: number
  }>
  createdAt?: string
  updatedAt?: string
}

export interface CreateMessageThreadInput {
  title?: string
  participantIds?: string[]
  isBroadcast?: boolean
}

export interface SchoolEvent {
  id?: string
  _id?: string
  title: string
  description?: string | null
  startDate: string
  endDate?: string | null
  allDay?: boolean
  schoolBoard?: string | null
  school?: string | null
  color?: string | null
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateEventInput {
  title: string
  description?: string
  startDate: string
  endDate?: string
  allDay?: boolean
  school?: string
  color?: string
}

export interface UpdateEventInput {
  title?: string
  description?: string | null
  startDate?: string
  endDate?: string | null
  allDay?: boolean
  school?: string | null
  color?: string | null
}