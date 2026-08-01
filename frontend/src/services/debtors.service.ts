import { http } from "@/lib/http"

export type DebtorStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type Debtor = {
  id: string
  name: string
  phone: string | null
  obs: string | null
  status: DebtorStatus
  createdAt: string
}
export type PaginatedDebtors = {
  data: Debtor[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type DebtorsParams = {
  page: number
  limit: number
  search?: string
  status?: DebtorStatus
  includeArchived?: boolean
}
export type DebtorInput = { name: string; phone?: string; obs?: string }

export const debtorsService = {
  async list(params: DebtorsParams) {
    const { data } = await http.get<PaginatedDebtors>("/debtors", { params })
    return data
  },
  async create(input: DebtorInput) {
    const { data } = await http.post<Debtor>("/debtors", input)
    return data
  },
  async update(id: string, input: Partial<DebtorInput>) {
    const { data } = await http.patch<Debtor>(`/debtors/${id}`, input)
    return data
  },
  async archive(id: string) {
    await http.delete(`/debtors/${id}`)
  },
  async restore(id: string) {
    await http.patch(`/debtors/${id}/restore`)
  },
  async delete(id: string) {
    await http.delete(`/debtors/${id}/permanent`)
  },
}
