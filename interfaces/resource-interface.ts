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
  ascOwnership?: "public" | "private" | null
  ascEducationLevelsOffered?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  ascSpecialCurriculum?: boolean | null
  ascSpecialCurriculumType?: string | null
  ascHasSharedFacilities?: boolean | null
  ascHasSchoolDevelopmentPlan?: boolean | null
  ascHasSchoolBasedManagementCommittee?: boolean | null
  ascHasPta?: boolean | null
  ascHasMultigradeTeaching?: boolean | null
  ascClassesHeldOutside?: boolean | null
  ascHasHealthFacility?: boolean | null
  ascMainSafeWaterSource?:
    | "piped"
    | "borehole"
    | "protected-well"
    | "rainwater"
    | "surface-water"
    | "vendor-truck"
    | "none"
    | "other"
    | null
  ascTotalToilets?: number | null
  ascToiletsForBoys?: number | null
  ascToiletsForGirls?: number | null
  ascToiletsForCwsn?: number | null
  ascPupilToiletRatio?: number | null
  ascUsableClassroomsPrePrimaryPrimary?: number | null
  ascUsableClassroomsJss?: number | null
  ascUsableClassroomsSss?: number | null
  ascUsableClassroomsScienceTech?: number | null
  ascClassroomsNeedsMajorRepairPrePrimaryPrimary?: number | null
  ascClassroomsNeedsMajorRepairJss?: number | null
  ascClassroomsNeedsMajorRepairSss?: number | null
  ascClassroomsNeedsMajorRepairScienceTech?: number | null
  ascClassroomsInsufficientSeatingPrePrimaryPrimary?: number | null
  ascClassroomsInsufficientSeatingJss?: number | null
  ascClassroomsInsufficientSeatingSss?: number | null
  ascClassroomsInsufficientSeatingScienceTech?: number | null
  ascClassroomsWithoutGoodBlackboardPrePrimaryPrimary?: number | null
  ascClassroomsWithoutGoodBlackboardJss?: number | null
  ascClassroomsWithoutGoodBlackboardSss?: number | null
  ascClassroomsWithoutGoodBlackboardScienceTech?: number | null
  ascWorkshopCountScienceTech?: number | null
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
  ascOwnership?: "public" | "private"
  ascEducationLevelsOffered?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  ascSpecialCurriculum?: boolean
  ascSpecialCurriculumType?: string
  ascHasSharedFacilities?: boolean
  ascHasSchoolDevelopmentPlan?: boolean
  ascHasSchoolBasedManagementCommittee?: boolean
  ascHasPta?: boolean
  ascHasMultigradeTeaching?: boolean
  ascClassesHeldOutside?: boolean
  ascHasHealthFacility?: boolean
  ascMainSafeWaterSource?:
    | "piped"
    | "borehole"
    | "protected-well"
    | "rainwater"
    | "surface-water"
    | "vendor-truck"
    | "none"
    | "other"
  ascTotalToilets?: number
  ascToiletsForBoys?: number
  ascToiletsForGirls?: number
  ascToiletsForCwsn?: number
  ascPupilToiletRatio?: number
  ascUsableClassroomsPrePrimaryPrimary?: number
  ascUsableClassroomsJss?: number
  ascUsableClassroomsSss?: number
  ascUsableClassroomsScienceTech?: number
  ascClassroomsNeedsMajorRepairPrePrimaryPrimary?: number
  ascClassroomsNeedsMajorRepairJss?: number
  ascClassroomsNeedsMajorRepairSss?: number
  ascClassroomsNeedsMajorRepairScienceTech?: number
  ascClassroomsInsufficientSeatingPrePrimaryPrimary?: number
  ascClassroomsInsufficientSeatingJss?: number
  ascClassroomsInsufficientSeatingSss?: number
  ascClassroomsInsufficientSeatingScienceTech?: number
  ascClassroomsWithoutGoodBlackboardPrePrimaryPrimary?: number
  ascClassroomsWithoutGoodBlackboardJss?: number
  ascClassroomsWithoutGoodBlackboardSss?: number
  ascClassroomsWithoutGoodBlackboardScienceTech?: number
  ascWorkshopCountScienceTech?: number
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
  ascOwnership?: "public" | "private" | null
  ascEducationLevelsOffered?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  ascSpecialCurriculum?: boolean | null
  ascSpecialCurriculumType?: string | null
  ascHasSharedFacilities?: boolean | null
  ascHasSchoolDevelopmentPlan?: boolean | null
  ascHasSchoolBasedManagementCommittee?: boolean | null
  ascHasPta?: boolean | null
  ascHasMultigradeTeaching?: boolean | null
  ascClassesHeldOutside?: boolean | null
  ascHasHealthFacility?: boolean | null
  ascMainSafeWaterSource?:
    | "piped"
    | "borehole"
    | "protected-well"
    | "rainwater"
    | "surface-water"
    | "vendor-truck"
    | "none"
    | "other"
    | null
  ascTotalToilets?: number | null
  ascToiletsForBoys?: number | null
  ascToiletsForGirls?: number | null
  ascToiletsForCwsn?: number | null
  ascPupilToiletRatio?: number | null
  ascUsableClassroomsPrePrimaryPrimary?: number | null
  ascUsableClassroomsJss?: number | null
  ascUsableClassroomsSss?: number | null
  ascUsableClassroomsScienceTech?: number | null
  ascClassroomsNeedsMajorRepairPrePrimaryPrimary?: number | null
  ascClassroomsNeedsMajorRepairJss?: number | null
  ascClassroomsNeedsMajorRepairSss?: number | null
  ascClassroomsNeedsMajorRepairScienceTech?: number | null
  ascClassroomsInsufficientSeatingPrePrimaryPrimary?: number | null
  ascClassroomsInsufficientSeatingJss?: number | null
  ascClassroomsInsufficientSeatingSss?: number | null
  ascClassroomsInsufficientSeatingScienceTech?: number | null
  ascClassroomsWithoutGoodBlackboardPrePrimaryPrimary?: number | null
  ascClassroomsWithoutGoodBlackboardJss?: number | null
  ascClassroomsWithoutGoodBlackboardSss?: number | null
  ascClassroomsWithoutGoodBlackboardScienceTech?: number | null
  ascWorkshopCountScienceTech?: number | null
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
  ascOwnership?: "public" | "private"
  ascEducationLevelsOffered?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  ascSpecialCurriculum?: boolean
  ascSpecialCurriculumType?: string
  ascHasSharedFacilities?: boolean
  ascHasSchoolDevelopmentPlan?: boolean
  ascHasSchoolBasedManagementCommittee?: boolean
  ascHasPta?: boolean
  ascHasMultigradeTeaching?: boolean
  ascClassesHeldOutside?: boolean
  ascHasHealthFacility?: boolean
  ascMainSafeWaterSource?:
    | "piped"
    | "borehole"
    | "protected-well"
    | "rainwater"
    | "surface-water"
    | "vendor-truck"
    | "none"
    | "other"
  ascTotalToilets?: number
  ascToiletsForBoys?: number
  ascToiletsForGirls?: number
  ascToiletsForCwsn?: number
  ascPupilToiletRatio?: number
  ascUsableClassroomsPrePrimaryPrimary?: number
  ascUsableClassroomsJss?: number
  ascUsableClassroomsSss?: number
  ascUsableClassroomsScienceTech?: number
  ascClassroomsNeedsMajorRepairPrePrimaryPrimary?: number
  ascClassroomsNeedsMajorRepairJss?: number
  ascClassroomsNeedsMajorRepairSss?: number
  ascClassroomsNeedsMajorRepairScienceTech?: number
  ascClassroomsInsufficientSeatingPrePrimaryPrimary?: number
  ascClassroomsInsufficientSeatingJss?: number
  ascClassroomsInsufficientSeatingSss?: number
  ascClassroomsInsufficientSeatingScienceTech?: number
  ascClassroomsWithoutGoodBlackboardPrePrimaryPrimary?: number
  ascClassroomsWithoutGoodBlackboardJss?: number
  ascClassroomsWithoutGoodBlackboardSss?: number
  ascClassroomsWithoutGoodBlackboardScienceTech?: number
  ascWorkshopCountScienceTech?: number
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
  isLongTermAbsent?: boolean | null
  longTermAbsenceReason?: string | null
  longTermAbsenceStartDate?: string | null
  teachingLevels?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  teachingClassIds?: string[]
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
  staffType?: "academic" | "non-academic" | "admin"
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
  isLongTermAbsent?: boolean
  longTermAbsenceReason?: string
  longTermAbsenceStartDate?: string
  teachingLevels?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  teachingClassIds?: string[]
  employmentType?: "teacher" | "staff"
  staffType?: "academic" | "non-academic" | "admin"
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
  isLongTermAbsent?: boolean | null
  longTermAbsenceReason?: string | null
  longTermAbsenceStartDate?: string | null
  teachingLevels?: Array<"pre-primary" | "primary" | "jss" | "sss" | "science-technology">
  teachingClassIds?: string[]
  employmentType?: "teacher" | "staff"
  staffType?: "academic" | "non-academic" | "admin"
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
  educationLevel?: "pre-primary" | "primary" | "jss" | "sss" | "science-technology" | null
  ascLevelCode?: string | null
  levelOrder?: number | null
  ageRangeMin?: number | null
  ageRangeMax?: number | null
}

export interface CreateClassInput {
  name: string
  code: string
  schoolTypeId: string
  educationLevel?: "pre-primary" | "primary" | "jss" | "sss" | "science-technology"
  ascLevelCode?: string
  levelOrder?: number
  ageRangeMin?: number
  ageRangeMax?: number
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
  amStatus: "present" | "absent" | "late" | "excused"
  pmStatus: "present" | "absent" | "late" | "excused"
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
  hasSpecialNeeds?: boolean | null
  specialNeedsCategory?:
    | "hearing"
    | "visual"
    | "physical"
    | "intellectual"
    | "speech-language"
    | "autism"
    | "other"
    | null
  isRepeater?: boolean | null
  isNewEntrant?: boolean | null
  entrantAgeYears?: number | null
  educationTrack?: "general" | "science-technology" | "vocational" | null
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
  hasSpecialNeeds?: boolean
  specialNeedsCategory?:
    | "hearing"
    | "visual"
    | "physical"
    | "intellectual"
    | "speech-language"
    | "autism"
    | "other"
  isRepeater?: boolean
  isNewEntrant?: boolean
  entrantAgeYears?: number
  educationTrack?: "general" | "science-technology" | "vocational"
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
  hasSpecialNeeds?: boolean | null
  specialNeedsCategory?:
    | "hearing"
    | "visual"
    | "physical"
    | "intellectual"
    | "speech-language"
    | "autism"
    | "other"
    | null
  isRepeater?: boolean | null
  isNewEntrant?: boolean | null
  entrantAgeYears?: number | null
  educationTrack?: "general" | "science-technology" | "vocational" | null
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
  statusByDate: Record<string, { am: string; pm: string }>
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
  | "needs_review"
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
  ocrSummary?: Record<string, unknown>
  lastRateLimitError?: string
  [key: string]: unknown
}

export interface AttendantExtraction {
  id?: string
  _id?: string
  createdBy?: string | null
  schoolId: string
  classId?: string
  termId: string
  academicSessionId: string
  startDate: string
  endDate: string
  imagePath?: string
  originalImagePath: string
  mimeType: string
  preprocessedImagePath?: string
  rawOcrJson?: Record<string, unknown>
  rawText?: string
  parsedJson?: Record<string, unknown>
  documentAiRawOutput?: Record<string, unknown>
  documentAiText?: string
  documentAiLayoutSummary?: Record<string, unknown>
  llmRawResponse?: string
  llmExtractedOutput?: Record<string, unknown>
  humanCorrectedOutput?: Record<string, unknown> | null
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
  data: Record<string, unknown>
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

export type StaffAttendanceStatus = "present" | "absent" | "late" | "excused" | null

export interface StaffAttendanceRecord {
  staffId: string
  staffName: string
  designation: string | null
  staffType: string | null
  status: StaffAttendanceStatus
  image: string | null
  time: string | null
  location: { lat: number; lng: number } | null
}

export interface StaffAttendanceListResponse {
  date: string
  session: "morning" | "afternoon"
  records: StaffAttendanceRecord[]
}

export interface StaffAttendanceDay {
  date: string
  morning: StaffAttendanceStatus
  afternoon: StaffAttendanceStatus
}

export interface StaffAttendanceSummaryResponse {
  schoolId: string
  month: number
  year: number
  totalStaff: number
  days: StaffAttendanceDay[]
}

export interface StaffAttendanceMatrixDay {
  date: string
  label: string
}

export interface StaffAttendanceMatrixCell {
  morning: StaffAttendanceStatus
  afternoon: StaffAttendanceStatus
}

export interface StaffAttendanceMatrixRow {
  staffId: string
  staffName: string
  employeeId: string | null
  designation: string | null
  staffType: string | null
  totalPresent: number
  totalAbsent: number
  cells: Record<string, StaffAttendanceMatrixCell>
}

export interface StaffAttendanceMatrixResponse {
  schoolId: string
  month: number
  year: number
  totalStaff: number
  days: StaffAttendanceMatrixDay[]
  rows: StaffAttendanceMatrixRow[]
}
