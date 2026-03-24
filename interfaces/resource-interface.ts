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
  status?: "active" | "inactive"
}

export interface CreateSchoolInput {
  name: string
  schoolBoard?: string
  schoolTypes?: string[]
  address?: string
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