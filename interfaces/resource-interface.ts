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
  schoolCode?: string
  state?: string
  localGovernment?: string
  district?: string
  ward?: string
  schoolLocation?: string
  categoryOfSchool?: string
  accessRoadCondition?: string
  typeOfSchool?: string
  shiftSystem?: string
  facilitiesAvailable?: string
  headTeacherName?: string
  headTeacherPhoneNumber?: string
  assistantHeadTeacherName?: string
  assistantHeadTeacherPhoneNumber?: string
  longitude?: number
  latitude?: number
  numberOfClasses?: number
  numberOfClassroomsAvailable?: number
  numberOfAcademicStaff?: number
  numberOfNonAcademicStaff?: number
  totalEnrolledStudents?: number
  gallery?: string
  status?: "active" | "inactive"
}

export interface CreateSchoolInput {
  name: string
  schoolBoard?: string
  schoolTypes?: string[]
  classes?: string[]
  address?: string
  schoolCode?: string
  state?: string
  localGovernment?: string
  district?: string
  ward?: string
  schoolLocation?: string
  categoryOfSchool?: string
  accessRoadCondition?: string
  typeOfSchool?: string
  shiftSystem?: string
  facilitiesAvailable?: string
  headTeacherName?: string
  headTeacherPhoneNumber?: string
  assistantHeadTeacherName?: string
  assistantHeadTeacherPhoneNumber?: string
  longitude?: number
  latitude?: number
  numberOfClasses?: number
  numberOfClassroomsAvailable?: number
  numberOfAcademicStaff?: number
  numberOfNonAcademicStaff?: number
  totalEnrolledStudents?: number
  gallery?: string
  status?: "active" | "inactive"
}

export interface UpdateSchoolInput {
  name?: string
  schoolTypes?: string[]
  address?: string | null
  schoolCode?: string | null
  state?: string | null
  localGovernment?: string | null
  district?: string | null
  ward?: string | null
  schoolLocation?: string | null
  categoryOfSchool?: string | null
  accessRoadCondition?: string | null
  typeOfSchool?: string | null
  shiftSystem?: string | null
  facilitiesAvailable?: string | null
  headTeacherName?: string | null
  headTeacherPhoneNumber?: string | null
  assistantHeadTeacherName?: string | null
  assistantHeadTeacherPhoneNumber?: string | null
  longitude?: number
  latitude?: number
  numberOfClasses?: number
  numberOfClassroomsAvailable?: number
  numberOfAcademicStaff?: number
  numberOfNonAcademicStaff?: number
  totalEnrolledStudents?: number
  gallery?: string | null
  adminUser?: string | null
  adminUsers?: string[]
  status?: "active" | "inactive"
}

export interface BulkCreateSchoolInput {
  name: string
  schoolBoard?: string
  address?: string
  schoolCode?: string
  state?: string
  localGovernment?: string
  district?: string
  ward?: string
  schoolLocation?: string
  categoryOfSchool?: string
  accessRoadCondition?: string
  typeOfSchool?: string
  shiftSystem?: string
  facilitiesAvailable?: string
  headTeacherName?: string
  headTeacherPhoneNumber?: string
  assistantHeadTeacherName?: string
  assistantHeadTeacherPhoneNumber?: string
  longitude?: number
  latitude?: number
  numberOfClasses?: number
  numberOfClassroomsAvailable?: number
  numberOfAcademicStaff?: number
  numberOfNonAcademicStaff?: number
  totalEnrolledStudents?: number
  gallery?: string
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
  avatar?: string | null
  gender?: "M" | "F" | null
  academicQualification?: "NCE" | "B.Ed" | "B.Sc" | "HND" | "PGDE" | "SSCE" | null
  trcnRegistered?: boolean | null
  salarySource?: "1-FTS" | "2-SUBEB" | "3-Private" | null
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
  avatar?: string
  gender?: "M" | "F"
  academicQualification?: "NCE" | "B.Ed" | "B.Sc" | "HND" | "PGDE" | "SSCE"
  trcnRegistered?: boolean
  salarySource?: "1-FTS" | "2-SUBEB" | "3-Private"
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

export interface UpdateStaffInput {
  school?: string
  employeeId?: string
  designation?: string
  avatar?: string | null
  gender?: "M" | "F" | null
  academicQualification?: "NCE" | "B.Ed" | "B.Sc" | "HND" | "PGDE" | "SSCE" | null
  trcnRegistered?: boolean | null
  salarySource?: "1-FTS" | "2-SUBEB" | "3-Private" | null
  employmentType?: "teacher" | "staff"
  isActive?: boolean
}

export interface SchoolType {
  id?: string
  _id?: string
  name: string
}

export interface Subject {
  id?: string
  _id?: string
  name: string
  code: string
}

export interface CreateSchoolTypeInput {
  name: string
}

export interface CreateSubjectInput {
  name: string
  code: string
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

export interface ResultRecord {
  id?: string
  _id?: string
  student: string
  schoolBoard: string
  school: string
  classId: string
  termId: string
  academicSessionId: string
  subject: string
  testScore: number
  examScore: number
  totalScore: number
  remark?: string | null
  assessmentDate?: string
  recordedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateResultInput {
  student: string
  school: string
  classId: string
  termId: string
  academicSessionId: string
  subject: string
  testScore: number
  examScore: number
  remark?: string
  assessmentDate?: string
}

export interface UpdateResultInput {
  subject?: string
  testScore?: number
  examScore?: number
  remark?: string
  assessmentDate?: string
}

export interface BulkCreateResultsInput {
  results: CreateResultInput[]
}

export interface CreateGuardianInput {
  name: string
  email: string
  password: string
  phoneNumber?: string
  studentIds: string[]
  relationshipType: "parent" | "caretaker"
  parentType?: "father" | "mother" | null
  isPrimary?: boolean
}

export interface GuardianLinkedStudent {
  id: string
  fullName: string
  regNumber: string
  schoolId?: string | null
  schoolName?: string | null
  relationshipType?: "parent" | "caretaker" | null
  parentType?: "father" | "mother" | null
  isPrimary?: boolean
}

export interface StudentGuardianLink {
  guardianId: string
  relationshipType: "parent" | "caretaker"
  parentType?: "father" | "mother" | null
  isPrimary?: boolean
}

export interface GuardianAdminRecord {
  id: string
  name: string
  email: string
  phoneNumber?: string | null
  status?: "active" | "disabled"
  linkedStudentsCount: number
  linkedStudents: GuardianLinkedStudent[]
}

export interface GuardiansListResponse {
  results: GuardianAdminRecord[]
}

export interface GuardianStudentResult {
  id: string
  subject: string
  testScore: number
  examScore: number
  totalScore: number
  termId: string
  termName: string
  academicSessionId: string
  academicSessionName: string
  assessmentDate?: string
  remark?: string | null
  classId: string
  className: string
  schoolId: string
  schoolName: string
}

export interface GuardianAttendanceRecord {
  id: string
  date: string
  status: "present" | "absent" | "late" | "excused"
  termId?: string | null
  termName?: string | null
  academicSession?: string | null
  schoolId?: string | null
}

export interface GuardianTermOption {
  id: string
  name: string
  termName: string
  academicSession?: string | null
  startDate: string
  endDate: string
}

export interface GuardianStudentOverview {
  id: string
  fullName: string
  firstName: string
  middleName?: string | null
  lastName: string
  regNumber: string
  gender: "male" | "female"
  dateOfBirth: string
  stateOfOrigin: string
  localGovernment: string
  status: "active" | "inactive"
  currentPlacement?: {
    schoolId: string
    schoolName: string
    classId: string
    className: string
    academicSession?: string | null
    academicSessionId?: string | null
  } | null
  attendance: {
    totalMarked: number
    presentCount: number
    absentCount: number
    attendanceRate: number
    lastMarkedDate?: string | null
  }
  attendanceRecords: GuardianAttendanceRecord[]
  results: GuardianStudentResult[]
}

export interface GuardianStudentsOverviewResponse {
  guardian: {
    id: string
    name: string
    email: string
  }
  termOptions: GuardianTermOption[]
  academicSessionOptions: string[]
  students: GuardianStudentOverview[]
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
  "results.read",
  "results.write",
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

export interface StudentEnrollment {
  schoolBoard?: string | null
  school: string
  classId: string
  academicSession?: string | null
  academicSessionId?: string | null
  isCurrent?: boolean
}

export interface Student {
  id?: string
  _id?: string
  firstName: string
  middleName?: string | null
  lastName: string
  avatar?: string | null
  regNumber: string
  stateOfOrigin: string
  localGovernment: string
  gender: "male" | "female"
  dateOfBirth: string
  schoolBoard?: string | null
  school?: string
  classId?: string
  status?: "active" | "inactive"
  guardianIds?: string[]
  guardianLinks?: StudentGuardianLink[]
  primaryGuardianId?: string | null
  promotionHistory?: StudentHistory[]
  currentEnrollment?: StudentEnrollment | null
}

export interface CreateStudentInput {
  firstName: string
  middleName?: string
  lastName: string
  avatar?: string
  regNumber: string
  stateOfOrigin: string
  localGovernment: string
  gender: "male" | "female"
  dateOfBirth: string
  guardianIds?: string[]
  guardianLinks?: StudentGuardianLink[]
  primaryGuardianId?: string | null
  school: string
  classId: string
  status?: "active" | "inactive"
}

export interface UpdateStudentInput {
  firstName?: string
  middleName?: string | null
  lastName?: string
  avatar?: string | null
  stateOfOrigin?: string
  localGovernment?: string
  gender?: "male" | "female"
  dateOfBirth?: string
  guardianIds?: string[]
  guardianLinks?: StudentGuardianLink[]
  primaryGuardianId?: string | null
  status?: "active" | "inactive"
}

export interface GuardianLinkInput {
  studentIds: string[]
  relationshipType: "parent" | "caretaker"
  parentType?: "father" | "mother" | null
  isPrimary?: boolean
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
  gender: "male" | "female"
  classId: string
  classCode?: string | null
  className?: string | null
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

export type AttendantExtractionStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "ocr_completed"
  | "llm_extracted"
  | "validation_failed"
  | "pending_review"
  | "corrected"
  | "approved"
  | "exported"
  | "failed"

export type AttendanceExtractionExportFormat = "jsonl" | "csv" | "docai"

export interface ExtractionApprovalMeta {
  approvedBy: string
  approvedAt: string
}

export interface ExtractionProcessingMeta {
  stage?: string
  retryCount?: number
  promptVersion?: string
  ocrSummary?: Record<string, any>
  lastRateLimitError?: string
  [key: string]: any
}

export interface AttendantExtraction {
  id?: string
  _id?: string
  createdBy?: string | null
  schoolId: string
  termId: string
  academicSessionId: string
  startDate: string
  endDate: string
  imagePath?: string
  originalImagePath: string
  mimeType: string
  preprocessedImagePath?: string
  rawOcrJson?: Record<string, any>
  rawText?: string
  parsedJson?: Record<string, any>
  documentAiRawOutput?: Record<string, any>
  documentAiText?: string
  documentAiLayoutSummary?: Record<string, any>
  llmRawResponse?: string
  llmExtractedOutput?: Record<string, any>
  humanCorrectedOutput?: Record<string, any> | null
  validationErrors?: string[]
  provider?: string
  model?: string
  approvalMeta?: ExtractionApprovalMeta | null
  exportedAt?: string
  status: AttendantExtractionStatus
  error?: string
  processingMeta?: ExtractionProcessingMeta
  createdAttendanceIds?: string[]
  pendingReviewIds?: string[]
  createdAt?: string
  updatedAt?: string
  imageUrl?: string | null
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

export interface QueueStatus {
  queue: string
  paused: boolean
  counts: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }
}

export interface QueueJob {
  id?: string
  name: string
  data: Record<string, any>
  progress: number
  attemptsMade: number
  finishedOn?: number
  failedReason?: string
  timestamp?: number
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
