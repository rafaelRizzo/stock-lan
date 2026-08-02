import { http } from "@/lib/http"
import type { AuthSession } from "@/lib/auth"

export type LoginCredentials = {
  username: string
  password: string
}

export type SetupCredentials = LoginCredentials & {
  name: string
}

export type SetupStatus = {
  needsSetup: boolean
}

export type AuthUser = {
  id: string
  name: string
  username: string
  photo: string | null
  role: "ADMIN" | "MANAGER" | "OPERATOR"
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
}

export const authService = {
  async getSetupStatus() {
    const { data } = await http.get<SetupStatus>("/auth/setup")
    return data
  },

  async setup(credentials: SetupCredentials) {
    const { data } = await http.post<AuthSession>("/auth/setup", credentials)
    return data
  },

  async login(credentials: LoginCredentials) {
    const { data } = await http.post<AuthSession>("/auth/login", credentials)
    return data
  },

  async logout(refreshToken: string) {
    await http.post("/auth/logout", { refreshToken })
  },

  async me() {
    const { data } = await http.get<AuthUser>("/auth/me")
    return data
  },
}
