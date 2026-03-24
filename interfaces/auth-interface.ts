export interface LoginInput {
  email: string
  password: string
}

export interface AuthUser {
  id?: string
  _id?: string
  name?: string
  email?: string
  avatar?: string | null
  role?: string
  accountType?: string
  schoolBoardId?: string | null
  schoolId?: string | null
}

export interface LoginResult {
  ok: boolean
  user?: AuthUser | null
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
