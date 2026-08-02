import { http } from "@/lib/http"

export type UserRole = "ADMIN" | "MANAGER" | "OPERATOR"
export type UserStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

export type User = {
  id: string
  name: string
  username: string
  photo: string | null
  role: UserRole
  status: UserStatus
  createdAt: string
}

export type UsersListParams = {
  page: number
  limit: number
  search?: string
  status?: UserStatus
}
export type PaginatedUsers = {
  data: User[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type CreateUserInput = {
  name: string
  username: string
  password: string
  role: UserRole
}

export const usersService = {
  async list(params: UsersListParams) {
    const { data } = await http.get<PaginatedUsers>("/users", { params })
    return data
  },
  async create(input: CreateUserInput) {
    const { data } = await http.post<User>("/users", input)
    return data
  },
  async update(id: string, input: Partial<CreateUserInput>) {
    const { data } = await http.patch<User>(`/users/${id}`, input)
    return data
  },
  async archive(id: string) {
    await http.delete(`/users/${id}`)
  },
  async restore(id: string) {
    await http.patch(`/users/${id}/restore`)
  },
}
