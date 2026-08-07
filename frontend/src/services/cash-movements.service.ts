import { http } from "@/lib/http"

export type CashMovementType = "DEPOSIT" | "WITHDRAWAL"
export type CashMovement = {
  id: string
  type: CashMovementType
  value: string | number
  obs: string | null
  createdAt: string
}
export type CashMovementsParams = {
  page: number
  limit: number
  type?: CashMovementType
  dateFrom?: string
  dateTo?: string
}
export type PaginatedCashMovements = {
  data: CashMovement[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type CashMovementInput = {
  type: CashMovementType
  value: number
  obs?: string
}
export type CashBalance = {
  balance: string | number
  deposited: string | number
  withdrawn: string | number
}

export const cashMovementsService = {
  async list(params: CashMovementsParams) {
    const { data } = await http.get<PaginatedCashMovements>("/cash-movements", {
      params,
    })
    return data
  },
  async balance() {
    const { data } = await http.get<CashBalance>("/cash-movements/balance")
    return data
  },
  async create(input: CashMovementInput) {
    const { data } = await http.post<CashMovement>("/cash-movements", input)
    return data
  },
  async delete(id: string) {
    await http.delete(`/cash-movements/${id}`)
  },
}
